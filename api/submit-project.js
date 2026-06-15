import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
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
        const { projectId } = req.body;
        if (!projectId) return res.status(400).json({ error: 'Project ID required' });

        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        const supabaseAdmin = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

        if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization token' });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: profileData } = await supabase
            .from('profiles').select('secretary_email, email').eq('id', user.id).single();

        const SECRETARY_EMAIL = profileData?.secretary_email || profileData?.email;
        if (!SECRETARY_EMAIL) {
            return res.status(400).json({ error: 'No secretary email configured. Please set it in your profile.' });
        }

        const { data: project, error: projErr } = await supabase
            .from('projects').select('*').eq('id', projectId).single();
        if (projErr || !project) throw new Error(`Project not found: ${projectId}`);

        const { data: expenses } = await supabase
            .from('expenses').select('*').eq('project_id', projectId)
            .order('date', { ascending: true });

        const expenseList = expenses || [];
        const totalAmount = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);

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

        const emailAttachments = [];
        let globalAttCount = 0;

        for (const expense of expenseList) {
            const expAtts = attachmentsByExpense[expense.id] || [];
            for (const att of expAtts) {
                try {
                    let buffer;
                    let contentType = '';

                    if (att.url.startsWith('data:')) {
                        const parts = att.url.split(',');
                        const mime = parts[0].match(/:(.*?);/)[1];
                        contentType = mime;
                        const base64Data = parts[parts.length - 1];
                        buffer = Buffer.from(base64Data, 'base64');
                    } else {
                        const response = await fetch(att.url);
                        if (!response.ok) continue;
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                        contentType = response.headers.get('content-type');
                    }

                    let ext = '';
                    if (contentType) {
                        const ct = contentType.toLowerCase();
                        if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
                        else if (ct.includes('png')) ext = 'png';
                        else if (ct.includes('pdf')) ext = 'pdf';
                        else if (ct.includes('webp')) ext = 'webp';
                        else if (ct.includes('heic')) ext = 'heic';
                    }

                    if (!ext || ext === 'bin') {
                        try {
                            const urlPath = att.url.split(/[?,#;]/)[0];
                            const baseExt = urlPath.split('.').pop()?.toLowerCase();
                            if (baseExt && baseExt.length <= 4 && !baseExt.includes(':')) ext = baseExt;
                        } catch (e) { }
                    }

                    if (!ext) ext = 'jpg';

                    globalAttCount++;
                    const seq = String(globalAttCount).padStart(2, '0');
                    const safeMerchant = (expense.merchant || 'Expense').replace(/[\\/:*?"<>|\s]/g, '_');
                    const filename = `${safeMerchant}-${seq}.${ext}`;

                    emailAttachments.push({ filename, content: buffer });
                } catch (e) {
                    console.error('Attachment processing error:', e);
                }
            }
        }

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

        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:40px 20px;font-family:sans-serif;background-color:#f4f7f9">
                <div style="max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:16px;">
                    <h2>Expense Report: ${project.name}</h2>
                    <p>Total Amount: ¥${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <table width="100%" style="border-collapse:collapse;margin-top:20px;">
                        <thead>
                            <tr style="background:#f8f9fa;text-align:left;">
                                <th style="padding:12px;">Merchant</th>
                                <th style="padding:12px;">Category</th>
                                <th style="padding:12px;">Date</th>
                                <th style="padding:12px;text-align:right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenseTableRows}
                        </tbody>
                    </table>
                    <p style="margin-top:40px;color:#888;font-size:12px;">Sent via Apex Expense Management System on ${dateStr}</p>
                </div>
            </body>
            </html>
        `;

        const ICLOUD_EMAIL = process.env.ICLOUD_EMAIL;
        const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;

        if (!ICLOUD_EMAIL || !ICLOUD_APP_PASSWORD) {
            throw new Error('ICLOUD_EMAIL or ICLOUD_APP_PASSWORD not set in environment');
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.mail.me.com',
            port: 587,
            secure: false,
            auth: { user: ICLOUD_EMAIL, pass: ICLOUD_APP_PASSWORD },
        });

        await transporter.sendMail({
            from: `Apex Expense System <${ICLOUD_EMAIL}>`,
            to: SECRETARY_EMAIL,
            subject: `[Apex Report] ${project.name} - ¥${totalAmount.toFixed(2)}`,
            html: htmlBody,
            attachments: emailAttachments,
        });

        res.status(200).json({
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
        res.status(500).json({ error: error.message || 'Failed to send email' });
    }
}
