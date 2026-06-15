import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel environment variables' });
        }

        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

        // Verify auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization token' });
        }
        if (supabaseAdmin) {
            const token = authHeader.split(' ')[1];
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
            if (authError || !user) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
        }

        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        const mimeType = image.startsWith('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg';
        const GEMINI_MODEL = 'gemini-3.5-flash';

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
                                { inline_data: { mime_type: mimeType, data: base64Data } },
                                { text: prompt },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 512,
                        responseMimeType: 'application/json',
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

        if (!rawText) throw new Error('No response from Gemini');

        let ocrData;
        try {
            ocrData = JSON.parse(rawText.trim());
        } catch (e) {
            console.warn('Direct JSON parsing failed, trying regex match:', e);
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Could not parse JSON from Gemini response');
            ocrData = JSON.parse(jsonMatch[0]);
        }

        res.status(200).json({
            merchant: ocrData.merchant || 'Unknown Merchant',
            amount: parseFloat(ocrData.amount) || 0,
            category: ocrData.category || '其他',
            date: ocrData.date || new Date().toISOString().split('T')[0],
            icon: ocrData.icon || 'receipt_long',
        });

    } catch (error) {
        console.error('OCR API Error:', error);
        res.status(500).json({ error: error.message || 'Internal OCR error' });
    }
}
