// ── lib/gemini.ts ─────────────────────────────────────────────────────────────
// Calls the Gemini API directly via REST (v1 endpoint) to avoid SDK
// version mismatches. Reads the product image + caption and returns
// structured product data: name, description, price, currency, category.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductInfo = {
  name: string
  description: string
  price: number | null
  currency: string
  category: string
}

export type EditCommand = {
  field: 'price' | 'name' | 'description' | 'category' | null
  value: string | number | null
}

/**
 * Interprets a free-text message from the seller as an instruction to update
 * ONE field of their most recently listed product — e.g. "price 165000",
 * "change the price to ₦165,000", "update the name to...". Returns
 * { field: null, value: null } when the message isn't an edit instruction
 * (a greeting, a question, unrelated chat, etc).
 */
export async function interpretEditCommand(
  text: string,
  product: { name: string; price: number | null; currency: string; category: string }
): Promise<EditCommand> {
  const prompt = `
You are helping a Nigerian online seller manage their store via chat messages.
They just sent this message about the product they most recently listed:

"${text}"

Current product details:
- Name: ${product.name}
- Price: ${product.price != null ? product.price : 'not set'} ${product.currency}
- Category: ${product.category}

Decide if this message is an instruction to update ONE field of this product.
Return ONLY a valid JSON object — no markdown, no explanation:

{
  "field": "price" | "name" | "description" | "category" | null,
  "value": "the new value, or null"
}

Rules:
- If updating price, "value" must be a plain number with no symbols or commas (e.g. "₦165,000" → 165000).
- If updating category, "value" must be exactly one of: Fashion, Electronics, Food & Drinks, Beauty, Home & Living, Other.
- If the message is not an instruction to change this product (a greeting, a question, unrelated text), set "field" and "value" to null.
- Only ever change ONE field per message.
`

  const apiKey = process.env.GEMINI_API_KEY!
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const json    = await res.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  try {
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleanText) as EditCommand
    // Price always comes back as a number, however Gemini formatted it
    if (parsed.field === 'price' && parsed.value != null) {
      parsed.value = Number(String(parsed.value).replace(/[^0-9.]/g, ''))
    }
    return parsed
  } catch {
    console.error('Gemini edit-command parse error. Raw response:', rawText)
    return { field: null, value: null }
  }
}

export async function extractProductInfo(
  imageData: string,   // either a URL or a base64 dataUri (data:mime/type;base64,...)
  caption: string
): Promise<ProductInfo> {
  let imageBase64: string
  let mimeType: string

  if (imageData.startsWith('data:')) {
    // Pre-downloaded dataUri — parse the base64 directly (no extra download needed)
    const [header, data] = imageData.split(',')
    imageBase64 = data
    mimeType    = header.split(':')[1].split(';')[0]
  } else {
    // Plain URL — download it ourselves
    const imageResponse = await fetch(imageData)
    if (!imageResponse.ok) {
      throw new Error(`Could not download image for Gemini: ${imageResponse.status}`)
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    imageBase64 = Buffer.from(imageBuffer).toString('base64')
    mimeType    = imageResponse.headers.get('content-type') || 'image/jpeg'
  }

  const prompt = `
You are a product listing assistant for a Nigerian online store.
Analyze the product image and the seller's caption below.

Seller's caption: "${caption || '(no caption provided)'}"

Return ONLY a valid JSON object — no markdown, no explanation, no extra text.
The JSON must have exactly these fields:

{
  "name": "Short product name, max 6 words, appealing",
  "description": "2-3 sentence product description, highlight key features and appeal",
  "price": 12500,
  "currency": "NGN",
  "category": "one of: Fashion, Electronics, Food & Drinks, Beauty, Home & Living, Other"
}

Rules:
- If you can see a price in the image or caption, extract the number only (no symbols).
- If no price is visible, set price to null.
- If currency is in Naira/₦, use "NGN". If dollars/$, use "USD".
- Write the description in a friendly, marketplace style.
- Return ONLY the JSON object. Nothing else.
`

  // Call Gemini via the stable v1 REST endpoint
  const apiKey = process.env.GEMINI_API_KEY!
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }

  const json    = await res.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

  try {
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanText) as ProductInfo
  } catch {
    console.error('Gemini parse error. Raw response:', rawText)
    return {
      name:        'New Product',
      description: caption || 'Fresh item available. Send an enquiry for more details.',
      price:       null,
      currency:    'NGN',
      category:    'Other',
    }
  }
}
