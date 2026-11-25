// ── app/api/telegram/route.ts ──────────────────────────────────────────────────
// Webhook handler for the Telegram bot — replaces the Meta WhatsApp Cloud API
// as the listing channel (Meta business verification was rejected).
//
// Telegram sends one POST per incoming message/photo. There is no GET
// verification step like Meta requires — registering the webhook URL with
// Telegram's setWebhook endpoint is enough.
//
// Security: setWebhook is registered with a secret_token. Telegram includes it
// in the X-Telegram-Bot-Api-Secret-Token header on every delivery, and we reject
// anything else. We also ignore messages from any chat other than the seller's
// TELEGRAM_CHAT_ID, so finding the bot cannot be used to alter the store.
//
// Full product-listing flow:
//   1. Seller sends a photo to the bot (with optional caption)
//   2. Telegram POSTs the update here with a file_id (not a direct URL)
//   3. downloadTelegramFile() resolves file_id → file_path → downloads bytes
//   4. Upload to Cloudinary → get permanent CDN URL
//   5. Send image + caption to Gemini → get product name, price, description
//   6. Save product to Supabase
//   7. Reply to the seller in the same Telegram chat with a confirmation
//
// Special command: send "SOLD" as a text message to mark the most recent
// available product as sold — same behaviour as the Meta webhook's SOLD command.
//
// Multi-photo albums: when a seller selects several photos at once, Telegram
// sends each one as a SEPARATE webhook call, all sharing the same
// message.media_group_id but with the caption attached to only one of them.
// Those are staged in the telegram_media_groups table and merged into a
// single product once the album finishes arriving — see handleAlbumPhoto().
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }            from 'next/server'
import { revalidatePath }                       from 'next/cache'
import { extractProductInfo, interpretEditCommands } from '@/lib/gemini'
import {
  uploadProductImage,
  renameProductImage,
  productAssetFolder,
  telegramAssetName,
  telegramAssetTags,
}                                               from '@/lib/cloudinary'
import { supabaseAdmin }                        from '@/lib/supabase'
import { sendTelegramMessage, downloadTelegramFile, productListedMessage } from '@/lib/telegram'

// Finalizing a straggling album photo involves a Cloudinary upload, a debounce
// wait, and a Gemini call — comfortably under 60s but well over the 10s default.
export const maxDuration = 60

// How long to wait after each album photo before checking whether it was the
// last one to arrive. Telegram typically delivers an entire album within ~1s.
const MEDIA_GROUP_WAIT_MS = 8000

// Set with setWebhook(..., secret_token). Requests without a matching header
// are rejected before any product data is touched.
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const SELLER_CHAT_ID = process.env.TELEGRAM_CHAT_ID

function hasValidSecret(request: NextRequest): boolean {
  if (!WEBHOOK_SECRET) {
    console.error('[telegram] TELEGRAM_WEBHOOK_SECRET is not set — refusing all webhook requests')
    return false
  }
  return request.headers.get('x-telegram-bot-api-secret-token') === WEBHOOK_SECRET
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidSecret(request)) {
      console.warn('[telegram] rejected webhook request with missing or invalid secret token')
      // Still HTTP 200: never give Telegram a reason to retry a forged request.
      return NextResponse.json({ ok: false })
    }

    const update = await request.json()
    const message = update.message

    // No message (e.g. edited_message, channel_post) → ignore silently
    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId    = String(message.chat?.id)
    const messageId = message.message_id ? `tg_${message.message_id}` : null

    // The bot is a control channel for this one store: only the seller's chat
    // may list, edit or mark products sold. Anyone else who finds the bot is ignored.
    if (!SELLER_CHAT_ID) {
      console.error('[telegram] TELEGRAM_CHAT_ID is not set — refusing to process messages')
      return NextResponse.json({ ok: false })
    }
    if (chatId !== SELLER_CHAT_ID) {
      console.warn(`[telegram] ignored message from non-seller chat ${chatId}`)
      return NextResponse.json({ ok: true })
    }

    // ── Handle text messages: "SOLD" command, or a free-text edit instruction ──
    if (typeof message.text === 'string') {
      const text = message.text.trim()

      if (text.toUpperCase() === 'SOLD') {
        const { data: latest } = await supabaseAdmin
          .from('products')
          .select('id, name')
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (latest) {
          await supabaseAdmin
            .from('products')
            .update({ status: 'sold' })
            .eq('id', latest.id)

          revalidatePath('/')
          revalidatePath(`/product/${latest.id}`)
          await sendTelegramMessage(chatId, `🎉 Marked as SOLD: "${latest.name}"`)
        } else {
          await sendTelegramMessage(chatId, 'No available products to mark as sold.')
        }

        return NextResponse.json({ ok: true })
      }

      // Anything else: try to interpret it as an edit instruction. Replying
      // directly to a product's photo targets that exact product; a plain text
      // message still targets the most recently listed one.
      const target  = await findEditTarget(message)
      const product = target.product

      if (!product) {
        await sendTelegramMessage(chatId, "You don't have any products listed yet — send a photo to list one.")
        return NextResponse.json({ ok: true })
      }

      const edits = await interpretEditCommands(text, {
        name:     product.name,
        price:    product.price,
        currency: product.currency,
        category: product.category,
      })

      const fields = Object.keys(edits) as Array<keyof typeof edits>
      if (fields.length === 0) {
        await sendTelegramMessage(
          chatId,
          `Sorry, I didn't understand that as an edit. Try "price 165000", "category Electronics", ` +
          `or reply directly to the product's photo and add the missing details.`
        )
        return NextResponse.json({ ok: true })
      }

      const { error: editError } = await supabaseAdmin
        .from('products')
        .update(edits)
        .eq('id', product.id)

      if (editError) throw editError

      revalidatePath('/')
      revalidatePath(`/product/${product.id}`)

      const symbol  = product.currency === 'USD' ? '$' : '₦'
      const changes = fields.map((field) => {
        const value   = edits[field]
        const display = field === 'price' ? `${symbol}${Number(value).toLocaleString()}` : value
        return `${field} → ${display}`
      })

      const prefix = target.viaReply
        ? `✅ Updated "${product.name}": `
        : `✅ Updated your most recent listing "${product.name}": `
      await sendTelegramMessage(chatId, prefix + changes.join(', '))

      return NextResponse.json({ ok: true, updated: fields })
    }

    // ── Handle photo messages → list as product ───────────────────────────────
    const photos = message.photo
    if (!photos || photos.length === 0) {
      // Ignore voice notes, stickers, documents, etc.
      return NextResponse.json({ ok: true })
    }

    // Telegram sends multiple sizes of the same photo — take the largest (last)
    const fileId      = photos[photos.length - 1].file_id
    const caption     = message.caption || ''
    const mediaGroupId = message.media_group_id as string | undefined

    if (message.reply_to_message?.photo?.length) {
      return await handleReplyPhoto({ message, chatId, fileId, caption, messageId })
    }

    // Multi-photo album → stage this photo and merge the whole album into one
    // product once it's the last one to arrive (see handleAlbumPhoto below).
    if (mediaGroupId) {
      return await handleAlbumPhoto({ mediaGroupId, chatId, fileId, caption })
    }

    // Deduplication: don't list the same message twice (e.g. Telegram retries)
    if (messageId) {
      const { data: existing } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('wa_message_id', messageId)
        .single()

      if (existing) return NextResponse.json({ ok: true, duplicate: true })
    }

    // ── Step 1: Download the photo bytes ──────────────────────────────────────
    const dataUri = await downloadTelegramFile(fileId)

    // ── Step 2: Extract product details with Gemini ───────────────────────────
    const productInfo = await extractProductInfo(dataUri, caption)

    // ── Step 3: Upload to a Cloudinary folder named after the product ─────────
  const optimizedImageUrl = await uploadProductImage(dataUri, {
    folder:   productAssetFolder(productInfo.name),
    publicId: telegramAssetName(productInfo.name, messageId || fileId, 1),
    tags:     telegramAssetTags(productInfo.name),
  })


    // ── Step 4: Save to Supabase ───────────────────────────────────────────────
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        name:          productInfo.name,
        description:   productInfo.description,
        price:         productInfo.price,
        currency:      productInfo.currency,
        category:      productInfo.category,
        image_url:     optimizedImageUrl,
        image_urls:    [optimizedImageUrl],
        status:        'available',
        wa_message_id: messageId,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/')

    // ── Step 5: Confirm in the Telegram chat ───────────────────────────────────
    const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
    await sendTelegramMessage(chatId, productListedMessage(productInfo.name, productInfo.price, productUrl))

    return NextResponse.json({ ok: true, product })

  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Telegram webhook processing error:', msg)
    // Always return 200 — same rule as the Meta webhook, prevents retry storms
    return NextResponse.json({ ok: false })
  }
}

type EditTargetProduct = {
  id: string
  name: string
  price: number | null
  currency: string
  category: string
}

async function findEditTarget(message: any): Promise<{ product: EditTargetProduct | null; viaReply: boolean }> {
  const reply = message.reply_to_message
  let key: string | null = null

  if (reply?.photo?.length) {
    if (reply.media_group_id) key = `tg_group_${reply.media_group_id}`
    else if (reply.message_id) key = `tg_${reply.message_id}`
  }

  if (key) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data } = await supabaseAdmin
        .from('products')
        .select('id, name, price, currency, category')
        .eq('wa_message_id', key)
        .maybeSingle()

      if (data) return { product: data as EditTargetProduct, viaReply: true }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    console.warn(`[telegram] no product found for replied message ${key}; falling back to latest listing`)
  }

  const { data: latest } = await supabaseAdmin
    .from('products')
    .select('id, name, price, currency, category')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { product: latest as EditTargetProduct | null, viaReply: false }
}

async function handleReplyPhoto({
  message,
  chatId,
  fileId,
  caption,
  messageId,
}: {
  message: any
  chatId: string
  fileId: string
  caption: string
  messageId: string | null
}) {
  const target = await findEditTarget(message)

  if (!target.viaReply || !target.product) {
    await sendTelegramMessage(
      chatId,
      "I couldn't find the original photo to merge this reply into. Reply directly to that photo, or send it again as a fresh upload."
    )
    return NextResponse.json({ ok: true, merged: false })
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id,name,description,price,currency,category,image_url,image_urls,wa_message_id')
    .eq('id', target.product.id)
    .single()

  if (!product) {
    await sendTelegramMessage(chatId, "I couldn't find that product any more — please send it again as a fresh upload.")
    return NextResponse.json({ ok: true, merged: false })
  }

  const dataUri = await downloadTelegramFile(fileId)
  let edits: Awaited<ReturnType<typeof interpretEditCommands>> = {}

  if (caption.trim()) {
    edits = await interpretEditCommands(caption, {
      name: product.name,
      price: product.price,
      currency: product.currency,
      category: product.category,
    })

    if (Object.keys(edits).length === 0) {
      const extracted = await extractProductInfo(dataUri, caption)
      if (extracted.price != null) edits.price = extracted.price
    }
  }

  const existingUrls = product.image_urls?.length
    ? product.image_urls
    : product.image_url
      ? [product.image_url]
      : []

  const imageUrl = await uploadProductImage(dataUri, {
    folder: productAssetFolder(product.name),
    publicId: telegramAssetName(
      product.name,
      product.wa_message_id || messageId || fileId,
      existingUrls.length + 1
    ),
    tags: telegramAssetTags(product.name),
  })

  const allUrls = await appendProductImage(product.id, imageUrl)

  if (Object.keys(edits).length > 0) {
    const { error: editError } = await supabaseAdmin
      .from('products')
      .update(edits)
      .eq('id', product.id)
    if (editError) throw editError
  }

  revalidatePath('/')
  revalidatePath(`/product/${product.id}`)

  const symbol  = product.currency === 'USD' ? '$' : '₦'
  const changes = Object.keys(edits).map((field) => {
    const value = edits[field as keyof typeof edits]
    return field === 'price' ? `price → ${symbol}${Number(value).toLocaleString()}` : `${field} → ${value}`
  })

  const summary = `🔗 Merged your reply into "${product.name}" (${allUrls.length} photos).`
  await sendTelegramMessage(chatId, changes.length ? `${summary} ${changes.join(', ')}.` : summary)

  return NextResponse.json({ ok: true, merged: true, product: product.id, edits })
}

async function appendProductImage(productId: string, imageUrl: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.rpc('append_product_image', {
    p_product_id: productId,
    p_image_url: imageUrl,
  })

  if (!error && Array.isArray(data)) return data as string[]

  if (!error || !/append_product_image|could not find the function/i.test(error.message || '')) {
    if (error) throw error
  }

  console.warn('[telegram] append_product_image RPC is missing; using fallback append. Run schema.sql in Supabase.')

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('image_url,image_urls')
      .eq('id', productId)
      .single()

    if (!product) throw new Error(`Product ${productId} disappeared while appending a photo`)

    const urls = product.image_urls?.length
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : []

    if (urls.includes(imageUrl)) return urls

    const next = [...urls, imageUrl]
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ image_urls: next, image_url: next[0] })
      .eq('id', productId)

    if (!updateError) return next
    if (attempt === 4) throw updateError
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  return [imageUrl]
}

// ── Multi-photo album handling ────────────────────────────────────────────────
// Telegram delivers each photo in an album as its own webhook call. This
// function stages the photo in telegram_media_groups, waits to see if it was
// the last one to arrive, and — if so — merges the whole album into one
// product (same "first photo → AI, rest → extra photos" rule as the Admin
// Upload flow's multi-image support).
async function handleAlbumPhoto({
  mediaGroupId,
  chatId,
  fileId,
  caption,
}: {
  mediaGroupId: string
  chatId: string
  fileId: string
  caption: string
}) {
  const groupKey = `tg_group_${mediaGroupId}`

  // Download + upload this photo to Cloudinary now (cheap, no Gemini yet —
  // only the album's first photo gets analyzed once the album is finalized).
  const dataUri  = await downloadTelegramFile(fileId)
  const imageUrl = await uploadProductImage(dataUri, {
    folder: 'estore-products/_incoming',
    tags: ['telegram', 'album-pending', `group-${mediaGroupId}`],
  })

  // If the album was already finalized into a product (this photo arrived
  // very late), just attach it to that product instead of dropping it.
  const { data: existingGroup } = await supabaseAdmin
    .from('telegram_media_groups')
    .select('processed')
    .eq('media_group_id', mediaGroupId)
    .maybeSingle()

  if (existingGroup?.processed) {
    await attachLatePhotoToProduct(groupKey, imageUrl)
    return NextResponse.json({ ok: true, attached: true })
  }

  // Atomically append this photo + bump update_count — avoids a read-then-write
  // race when several album photos arrive within milliseconds of each other.
  const { data: myVersion, error: appendError } = await supabaseAdmin.rpc(
    'append_telegram_media_group',
    { p_media_group_id: mediaGroupId, p_chat_id: chatId, p_image_url: imageUrl, p_caption: caption }
  )
  if (appendError) throw appendError

  // Wait to see if more album photos arrive after this one.
  await new Promise((resolve) => setTimeout(resolve, MEDIA_GROUP_WAIT_MS))

  // Claim the group only if it's still unprocessed AND no later photo bumped
  // update_count during our wait — i.e. we really were the last to arrive.
  const { data: claimed } = await supabaseAdmin
    .from('telegram_media_groups')
    .update({ processed: true })
    .eq('media_group_id', mediaGroupId)
    .eq('processed', false)
    .eq('update_count', myVersion)
    .select()
    .maybeSingle()

  if (!claimed) {
    // A later photo will be the one to finalize the album.
    return NextResponse.json({ ok: true, staged: true })
  }

  // Dedup safety net, mirrors the single-photo flow's wa_message_id check.
  const { data: existingProduct } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('wa_message_id', groupKey)
    .maybeSingle()
  if (existingProduct) return NextResponse.json({ ok: true, duplicate: true })

  const allImageUrls = claimed.image_urls as string[]
  const groupCaption  = claimed.caption || ''

  // Only the first photo is analyzed by Gemini — the rest are extra photos,
  // exactly like the Admin Upload multi-image flow.
  const productInfo = await extractProductInfo(allImageUrls[0], groupCaption)

  const folder        = productAssetFolder(productInfo.name)
  const organizedUrls = await Promise.all(
    allImageUrls.map(async (url, index) => {
      try {
        return await renameProductImage(
          url,
          folder,
          telegramAssetName(productInfo.name, groupKey, index + 1),
          telegramAssetTags(productInfo.name)
        )
      } catch (err) {
        console.error('[telegram] could not move Cloudinary asset into product folder:', err)
        return url
      }
    })
  )

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      name:          productInfo.name,
      description:   productInfo.description,
      price:         productInfo.price,
      currency:      productInfo.currency,
      category:      productInfo.category,
      image_url:     organizedUrls[0],
      image_urls:    organizedUrls,
      status:        'available',
      wa_message_id: groupKey,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/')
  revalidatePath(`/product/${product.id}`)

  const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
  await sendTelegramMessage(
    chatId,
    productListedMessage(productInfo.name, productInfo.price, productUrl, allImageUrls.length)
  )

  return NextResponse.json({ ok: true, product })
}

// A photo arrived after its album was already turned into a product.
// The product may still be mid-creation (Gemini + Supabase insert), so we
// poll briefly before giving up — avoids silently losing late-arriving photos.
async function attachLatePhotoToProduct(groupKey: string, imageUrl: string) {
  let product = null as { id: string; name: string; image_urls: string[] } | null

  // Poll for up to 15s — product creation (Gemini + insert) typically takes 2-5s
  for (let attempt = 0; attempt < 15; attempt++) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id, name, image_urls')
      .eq('wa_message_id', groupKey)
      .maybeSingle()

    if (data) { product = data; break }
    await new Promise(r => setTimeout(r, 1000))
  }

  if (!product) return

  const existing = new Set(product.image_urls ?? [])
  if (existing.has(imageUrl)) return

  let organizedUrl = imageUrl
  try {
    organizedUrl = await renameProductImage(
      imageUrl,
      productAssetFolder(product.name),
      telegramAssetName(product.name, groupKey, (product.image_urls ?? []).length + 1),
      telegramAssetTags(product.name)
    )
  } catch (err) {
    console.error('[telegram] could not move late Cloudinary asset into product folder:', err)
  }

  await supabaseAdmin
    .from('products')
    .update({ image_urls: [...(product.image_urls ?? []), organizedUrl] })
    .eq('id', product.id)

  revalidatePath(`/product/${product.id}`)
}
