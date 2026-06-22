const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.0-flash';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip the data URI prefix to get pure base64
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.startsWith('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg';

    const prompt = `You are an expert at extracting structured data from receipts and invoices.
Analyze this receipt image and extract the following information in JSON format:

{
  "merchant": "name of the store, restaurant, or service provider",
  "amount": numeric value only (no currency symbols), 
  "category": one of: "餐饮", "交通", "住宿", "办公用品", "娱乐", "医疗", "购物", "其他",
  "date": "YYYY-MM-DD format",
  "icon": one of: "restaurant", "directions_car", "hotel", "work", "sports_esports", "local_hospital", "shopping_bag", "receipt_long"
}

Rules:
- If merchant name is in Chinese, keep it in Chinese
- For amount: extract the TOTAL amount paid, as a plain number (e.g. 482.00)
- For date: if not clearly visible, use today's date
- For category: choose the best matching Chinese category
- For icon: match to the category chosen
- Return ONLY valid JSON, no markdown, no explanation`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      console.error('Gemini API error:', errBody);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errBody}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('No response from Gemini');
    }

    // Extract and parse JSON from the response
    let ocrData;
    try {
      ocrData = JSON.parse(rawText.trim());
    } catch (e) {
      console.warn('Direct JSON parsing failed, trying regex match. Raw text:', rawText);
      // Strip markdown code fences if present
      const stripped = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        ocrData = JSON.parse(stripped);
      } catch (e2) {
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Could not parse JSON from Gemini response');
        }
        ocrData = JSON.parse(jsonMatch[0]);
      }
    }

    const result = {
      merchant: ocrData.merchant || 'Unknown Merchant',
      amount: parseFloat(ocrData.amount) || 0,
      category: ocrData.category || '其他',
      date: ocrData.date || new Date().toISOString().split('T')[0],
      icon: ocrData.icon || 'receipt_long',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
