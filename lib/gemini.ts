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
