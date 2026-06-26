// ── app/api/telegram/route.ts ──────────────────────────────────────────────────
// Webhook handler for the Telegram bot — replaces the Meta WhatsApp Cloud API
// as the listing channel (Meta business verification was rejected).
//
// Telegram sends one POST per incoming message/photo. There is no GET
// verification step like Meta requires — registering the webhook URL with
// Telegram's setWebhook endpoint is enough.
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
import { extractProductInfo, interpretEditCommand } from '@/lib/gemini'
import { uploadProductImage }                   from '@/lib/cloudinary'
import { supabaseAdmin }                        from '@/lib/supabase'
import { sendTelegramMessage, downloadTelegramFile, productListedMessage } from '@/lib/telegram'

// Finalizing a straggling album photo involves a Cloudinary upload, a debounce
// wait, and a Gemini call — comfortably under 60s but well over the 10s default.
export const maxDuration = 60

// How long to wait after each album photo before checking whether it was the
// last one to arrive. Telegram typically delivers an entire album within ~1s.
const MEDIA_GROUP_WAIT_MS = 2000

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    const message = update.message

    // No message (e.g. edited_message, channel_post) → ignore silently
    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId    = String(message.chat?.id)
    const messageId = message.message_id ? `tg_${message.message_id}` : null

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

          await sendTelegramMessage(chatId, `🎉 Marked as SOLD: "${latest.name}"`)
        } else {
          await sendTelegramMessage(chatId, 'No available products to mark as sold.')
        }

        return NextResponse.json({ ok: true })
      }

      // Anything else: try to interpret it as an edit instruction for the
      // most recently listed product (e.g. "price 165000", "change the name
      // to..."). Note: editing a Telegram message's caption does NOT trigger
      // this webhook at all — Telegram sends that as update.edited_message,
      // which is ignored above — so a new text message is the only way to
      // correct a listing after the fact.
      const { data: latestProduct } = await supabaseAdmin
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!latestProduct) {
        await sendTelegramMessage(chatId, "You don't have any products listed yet — send a photo to list one.")
        return NextResponse.json({ ok: true })
      }

      const command = await interpretEditCommand(text, {
        name:     latestProduct.name,
        price:    latestProduct.price,
        currency: latestProduct.currency,
        category: latestProduct.category,
      })

      if (!command.field) {
        await sendTelegramMessage(
          chatId,
          `Sorry, I didn't understand that as an edit. Try something like "price 165000" ` +
          `or "change the name to...". This applies to your most recent listing: "${latestProduct.name}".`
        )
        return NextResponse.json({ ok: true })
      }

      const { error: editError } = await supabaseAdmin
        .from('products')
        .update({ [command.field]: command.value })
        .eq('id', latestProduct.id)

      if (editError) throw editError

      revalidatePath('/')
      revalidatePath(`/product/${latestProduct.id}`)

      const symbol       = latestProduct.currency === 'USD' ? '$' : '₦'
      const displayValue = command.field === 'price'
        ? `${symbol}${Number(command.value).toLocaleString()}`
        : command.value

      await sendTelegramMessage(chatId, `✅ Updated ${command.field} for "${latestProduct.name}" → ${displayValue}`)

      return NextResponse.json({ ok: true, updated: command.field })
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

    // ── Step 2: Upload to Cloudinary ───────────────────────────────────────────
    const optimizedImageUrl = await uploadProductImage(dataUri)

    // ── Step 3: Extract product details with Gemini ───────────────────────────
    const productInfo = await extractProductInfo(dataUri, caption)

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
        status:        'available',
        wa_message_id: messageId,
      })
      .select()
      .single()

    if (error) throw error

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
  const imageUrl = await uploadProductImage(dataUri)

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

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      name:          productInfo.name,
      description:   productInfo.description,
      price:         productInfo.price,
      currency:      productInfo.currency,
      category:      productInfo.category,
      image_url:     allImageUrls[0],
      image_urls:    allImageUrls,
      status:        'available',
      wa_message_id: groupKey,
    })
    .select()
    .single()

  if (error) throw error

  const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/product/${product.id}`
  await sendTelegramMessage(
    chatId,
    productListedMessage(productInfo.name, productInfo.price, productUrl, allImageUrls.length)
  )

  return NextResponse.json({ ok: true, product })
}

// A photo arrived after its album was already turned into a product (rare —
// only happens if a straggler shows up more than MEDIA_GROUP_WAIT_MS late).
async function attachLatePhotoToProduct(groupKey: string, imageUrl: string) {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, image_urls')
    .eq('wa_message_id', groupKey)
    .maybeSingle()

  if (!product) return

  await supabaseAdmin
    .from('products')
    .update({ image_urls: [...(product.image_urls ?? []), imageUrl] })
    .eq('id', product.id)
}
