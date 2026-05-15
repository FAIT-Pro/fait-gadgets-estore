// ── lib/gemini.ts ─────────────────────────────────────────────────────────────
// This is our "smart assistant" that reads the product image and caption
// and turns them into structured data (name, price, description, category).
//
// Think of it like handing a product photo to a savvy shop assistant
// and asking: "What is this, what does it cost, and how would you describe it?"
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// The structured data we expect Gemini to return
export type ProductInfo = {
  name: string
  description: string
  price: number | null
  currency: string
  category: string
}

export async function extractProductInfo(
  imageUrl: string,
  caption: string
): Promise<ProductInfo> {
  // Use Gemini 1.5 Flash — fast, accurate, and FREE tier gives 15 requests/min
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Step 1: Download the image from Green API and convert to base64
  // (Gemini needs the actual image bytes, not just a URL)
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) throw new Error('Could not download image from WhatsApp')

  const imageBuffer = await imageResponse.arrayBuffer()
  const imageBase64 = Buffer.from(imageBuffer).toString('base64')
  const mimeType = (imageResponse.headers.get('content-type') || 'image/jpeg') as string

  // Step 2: Ask Gemini to analyze the image AND the caption together
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

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    prompt,
  ])

  const rawText = result.response.text().trim()

  // Step 3: Parse the JSON response — with a safety net if it fails
  try {
    // Remove any accidental markdown code fences (``` json ... ```)
    const cleanText = rawText.replace(/```json|```/g, '').trim()
    return JSON.parse(cleanText) as ProductInfo
  } catch {
    // If Gemini gave us something unexpected, return safe defaults
    console.error('Gemini parse error. Raw response:', rawText)
    return {
      name: 'New Product',
      description: caption || 'Fresh item available. Send an enquiry for more details.',
      price: null,
      currency: 'NGN',
      category: 'Other',
    }
  }
}
