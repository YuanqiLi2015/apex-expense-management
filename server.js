import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const app = express();
const port = 3002;

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}));
app.use(express.json({ limit: '50mb' }));

const ICLOUD_EMAIL = process.env.ICLOUD_EMAIL;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;

if (!ICLOUD_EMAIL || !ICLOUD_APP_PASSWORD) {
    console.error('FATAL: ICLOUD_EMAIL and ICLOUD_APP_PASSWORD must be set in .env.local');
    process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Warning: Missing Supabase URL/Key in environment variables. Check .env.local file.');
}

// Create base Supabase client (for auth verification only)
const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// SMTP Transporter (configured for iCloud)
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
        user: ICLOUD_EMAIL,
        pass: ICLOUD_APP_PASSWORD,
    },
});

app.post('/api/submit-project', async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!projectId) return res.status(400).json({ error: 'Project ID required' });
        if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

        // Verify auth token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization token' });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Create authenticated Supabase client with user's token (so RLS works)
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        // 0. Fetch secretary email from authenticated user's profile
        const { data: profileData } = await supabase
            .from('profiles').select('secretary_email, email').eq('id', user.id).single();

        const SECRETARY_EMAIL = profileData?.secretary_email || profileData?.email;
        if (!SECRETARY_EMAIL) {
            return res.status(400).json({ error: 'No secretary email configured. Please set it in your profile.' });
        }
        console.log(`Sending to secretary: ${SECRETARY_EMAIL}`);

        // 1. Fetch Project
        const { data: project, error: projErr } = await supabase
            .from('projects').select('*').eq('id', projectId).single();

        if (projErr || !project) throw new Error(`Project not found: ${projectId}`);

        // 2. Fetch Expenses
        const { data: expenses } = await supabase
            .from('expenses').select('*').eq('project_id', projectId)
            .order('date', { ascending: true });

        const expenseList = expenses || [];
        const totalAmount = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);

        // 3. Fetch Attachments
        const expenseIds = expenseList.map(e => e.id);
        let allAttachments = [];
        if (expenseIds.length > 0) {
            const { data } = await supabase
                .from('attachments').select('*').in('expense_id', expenseIds);
            allAttachments = data || [];
        }

        const attachmentsByExpense = {};
        allAttachments.forEach(att => {
            if (!attachmentsByExpense[att.expense_id]) attachmentsByExpense[att.expense_id] = [];
            attachmentsByExpense[att.expense_id].push(att);
        });

        // 4. Download and Rename Attachments
        const emailAttachments = [];
        let globalAttCount = 0;

        for (const expense of expenseList) {
            const expAtts = attachmentsByExpense[expense.id] || [];
            console.log(`Processing ${expAtts.length} attachments for expense: ${expense.merchant}`);

            for (const att of expAtts) {
                try {
                    let buffer;
                    let contentType = '';

                    if (att.url.startsWith('data:')) {
                        // Handle Data URI
                        const parts = att.url.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        contentType = mime;
                        const base64Data = parts[parts.length - 1];
                        buffer = Buffer.from(base64Data, 'base64');
                    } else {
                        // Handle Remote URL
                        const response = await fetch(att.url);
                        if (!response.ok) {
                            console.error(`Failed to download: ${att.url}`);
                            continue;
                        }
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                        contentType = response.headers.get('content-type');
                    }

                    // Robust extension detection
                    let ext = '';
                    if (contentType) {
                        const ct = contentType.toLowerCase();
                        if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
                        else if (ct.includes('png')) ext = 'png';
                        else if (ct.includes('pdf')) ext = 'pdf';
                        else if (ct.includes('webp')) ext = 'webp';
                        else if (ct.includes('heic')) ext = 'heic';
                    }

                    // Fallback to URL parsing if content-type is generic or missing
                    if (!ext || ext === 'bin') {
                        try {
                            const urlPath = att.url.split(/[?,#;]/)[0];
                            const baseExt = urlPath.split('.').pop()?.toLowerCase();
                            if (baseExt && baseExt.length <= 4 && !baseExt.includes(':')) ext = baseExt;
                        } catch (e) { }
                    }

                    if (!ext) ext = 'jpg'; // Final fallback

                    globalAttCount++;
                    const seq = String(globalAttCount).padStart(2, '0');

                    // Sanitize merchant name for filename
                    const safeMerchant = (expense.merchant || 'Expense').replace(/[\\/:*?"<>|\s]/g, '_');
                    const filename = `${safeMerchant}-${seq}.${ext}`;

                    emailAttachments.push({
                        filename,
                        content: buffer
                    });
                    console.log(`Attached: ${filename} (${buffer.length} bytes)`);
                } catch (e) {
                    console.error('Attachment processing error:', e);
                }
            }
        }

        // 5. Build HTML Email (English)
        const expenseTableRows = expenseList.map(e => `
            <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a2e">${e.merchant}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666">${e.category || 'General'}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#666">${e.date}</td>
                <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:bold;color:#1a1a2e">¥${Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const attachmentNote = emailAttachments.length > 0
            ? `<div style="margin-top:24px;padding:16px;background:#fdf9ea;border-radius:12px;border:1px solid #faecc1">
                <p style="margin:0;color:#8a6d3b;font-size:13px;font-weight:600">📎 Attachments Included</p>
                <p style="margin:4px 0 0;color:#a48a4c;font-size:12px">This email contains ${emailAttachments.length} attachments (receipts/invoices). Filenames are formatted as "MerchantName-Sequence" for easy reference.</p>
               </div>`
            : '';

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
                </style>
            </head>
            <body style="margin:0;padding:0;background-color:#f4f7f9">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f7f9;padding:40px 20px">
                    <tr>
                        <td align="center">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05)">
                                <!-- Header -->
                                <tr>
                                    <td style="background:linear-gradient(135deg, #D4AF37, #B09028);padding:40px;text-align:center">
                                        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">Expense Report</h1>
                                        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;font-weight:500">Project Reimbursement Claim</p>
                                    </td>
                                </tr>
                                <!-- Body -->
                                <tr>
                                    <td style="padding:40px">
                                        <div style="margin-bottom:32px">
                                            <h2 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;font-weight:800">${project.name}</h2>
                                            <p style="margin:0;color:#888;font-size:13px;font-weight:500">Project ID: <span style="color:#1a1a2e">${project.id}</span> • Created: ${project.created_date}</p>
                                        </div>

                                        <div style="margin-bottom:32px;padding:24px;background:#f8f9fa;border-radius:16px">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td>
                                                        <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Total Amount</p>
                                                        <p style="margin:4px 0 0;font-size:32px;font-weight:800;color:#D4AF37">¥${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                    </td>
                                                    <td align="right">
                                                        <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Records</p>
                                                        <p style="margin:4px 0 0;font-size:32px;font-weight:800;color:#1a1a2e">${expenseList.length}</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>

                                        <h3 style="margin:0 0 16px;font-size:16px;color:#1a1a2e;font-weight:800;text-transform:uppercase;letter-spacing:0.5px">Expense Records</h3>
                                        <div style="overflow-x:auto">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                                                <thead>
                                                    <tr style="background:#f8f9fa">
                                                        <th style="padding:12px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;font-weight:700">Merchant</th>
                                                        <th style="padding:12px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;font-weight:700">Category</th>
                                                        <th style="padding:12px 16px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;font-weight:700">Date</th>
                                                        <th style="padding:12px 16px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;font-weight:700">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${expenseTableRows}
                                                    <tr style="background:#f8f9fa">
                                                        <td colspan="3" style="padding:16px;font-weight:800;font-size:15px;color:#1a1a2e">Grand Total</td>
                                                        <td style="padding:16px;text-align:right;font-weight:800;font-size:15px;color:#D4AF37">¥${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        ${attachmentNote}

                                        <div style="margin-top:40px;padding-top:24px;border-top:1px solid #f0f0f0;text-align:center">
                                            <p style="margin:0;color:#aaa;font-size:12px">Sent via Apex Expense Management System</p>
                                            <p style="margin:4px 0 0;color:#ccc;font-size:11px">${dateStr}</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // 6. Send Email
        await transporter.sendMail({
            from: `Apex Expense System <${ICLOUD_EMAIL}>`,
            to: SECRETARY_EMAIL,
            subject: `[Apex Report] ${project.name} - ¥${totalAmount.toFixed(2)}`,
            html: htmlBody,
            attachments: emailAttachments,
        });

        res.json({
            success: true,
            message: '邮件发送成功',
            summary: {
                projectName: project.name,
                projectId: project.id,
                expenseCount: expenseList.length,
                totalAmount,
                attachmentCount: emailAttachments.length,
                sentTo: SECRETARY_EMAIL
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
    }
});

app.post('/api/ocr-receipt', async (req, res) => {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
        }

        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

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
        const GEMINI_MODEL = 'gemini-2.5-flash';

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

        if (!rawText) throw new Error('No response from Gemini');

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
                if (!jsonMatch) throw new Error('Could not parse JSON from Gemini response');
                ocrData = JSON.parse(jsonMatch[0]);
            }
        }

        res.json({
            merchant: ocrData.merchant || 'Unknown Merchant',
            amount: parseFloat(ocrData.amount) || 0,
            category: ocrData.category || '其他',
            date: ocrData.date || new Date().toISOString().split('T')[0],
            icon: ocrData.icon || 'receipt_long',
        });

    } catch (error) {
        console.error('OCR API Error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal OCR error' });
    }
});

app.listen(port, () => {
    console.log(`Local Email Server running at http://localhost:${port}`);
});
