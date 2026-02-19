import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const ICLOUD_EMAIL = process.env.ICLOUD_EMAIL;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("Triggering submit-project serverless function...");

    try {
        const { projectId } = req.body;
        if (!projectId) return res.status(400).json({ error: 'Project ID required' });

        // 1. 严格校验环境变量
        if (!ICLOUD_EMAIL || !ICLOUD_APP_PASSWORD) {
            console.error("Missing iCloud credentials");
            throw new Error('Server configuration error: ICLOUD credentials not set in Vercel.');
        }
        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing Supabase credentials");
            throw new Error('Server configuration error: Supabase credentials not set.');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. 获取收件人地址
        const { data: profileData, error: profileErr } = await supabase
            .from('profiles').select('secretary_email, email').limit(1).single();

        if (profileErr) console.warn("Profile fetch error:", profileErr);

        const SECRETARY_EMAIL = profileData?.secretary_email || profileData?.email || '1604285278@qq.com';
        console.log(`Target Recipient: ${SECRETARY_EMAIL}`);

        // 3. 获取项目资料
        const { data: project, error: projErr } = await supabase
            .from('projects').select('*').eq('id', projectId).single();

        if (projErr || !project) throw new Error(`Project not found: ${projectId}`);

        // 4. 获取费用列表
        const { data: expenses, error: expErr } = await supabase
            .from('expenses').select('*').eq('project_id', projectId)
            .order('date', { ascending: true });

        if (expErr) throw expErr;
        const expenseList = expenses || [];
        const totalAmount = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);
        console.log(`Processing ${expenseList.length} expenses, total ¥${totalAmount}`);

        // 5. 获取并处理附件
        const expenseIds = expenseList.map(e => e.id);
        let allAttachments = [];
        if (expenseIds.length > 0) {
            const { data: attData } = await supabase
                .from('attachments').select('*').in('expense_id', expenseIds);
            allAttachments = attData || [];
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
                    if (!att.url) continue;
                    let buffer;
                    let contentType = '';

                    if (att.url.startsWith('data:')) {
                        const parts = att.url.split(',');
                        if (parts.length < 2) continue;
                        const mimeMatch = parts[0].match(/:(.*?);/);
                        contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                        buffer = Buffer.from(parts[1], 'base64');
                    } else {
                        const response = await fetch(att.url);
                        if (!response.ok) continue;
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                        contentType = response.headers.get('content-type') || '';
                    }

                    if (!buffer || buffer.length === 0) continue;

                    let ext = 'jpg';
                    if (contentType.includes('png')) ext = 'png';
                    else if (contentType.includes('pdf')) ext = 'pdf';
                    else if (contentType.includes('webp')) ext = 'webp';

                    globalAttCount++;
                    const filename = `${(expense.merchant || 'Exp').replace(/\s+/g, '_')}-${String(globalAttCount).padStart(2, '0')}.${ext}`;
                    emailAttachments.push({ filename, content: buffer });
                } catch (e) {
                    console.error('Attachment error:', e);
                }
            }
        }

        // 6. 构建 HTML 邮件内容
        const expenseTableRows = expenseList.map(e => `
            <tr>
                <td style="padding:10px; border-bottom:1px solid #eee; font-size:14px;">${e.merchant}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; font-size:14px; color:#666;">${e.category}</td>
                <td style="padding:10px; border-bottom:1px solid #eee; font-size:14px; text-align:right; font-weight:bold;">¥${Number(e.amount).toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlBody = `
            <div style="font-family:sans-serif; max-width:600px; margin:auto; border:1px solid #eee; padding:20px; border-radius:10px;">
                <h1 style="color:#D4AF37; text-align:center;">Expense Report</h1>
                <p><strong>Project:</strong> ${project.name}</p>
                <p><strong>Total Amount:</strong> <span style="font-size:20px; color:#D4AF37; font-weight:bold;">¥${totalAmount.toFixed(2)}</span></p>
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                    <tr style="background:#f8f8f8;">
                        <th style="padding:10px; text-align:left;">Merchant</th>
                        <th style="padding:10px; text-align:left;">Category</th>
                        <th style="padding:10px; text-align:right;">Amount</th>
                    </tr>
                    ${expenseTableRows}
                </table>
                <p style="text-align:center; font-size:12px; color:#aaa; margin-top:30px;">Sent via Apex Expense System</p>
            </div>
        `;

        // 7. 发送邮件
        const transporter = nodemailer.createTransport({
            host: 'smtp.mail.me.com',
            port: 587,
            secure: false, // iCloud 必须为 false 使用 STARTTLS
            auth: { user: ICLOUD_EMAIL, pass: ICLOUD_APP_PASSWORD },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });

        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("SMTP Verified. Sending mail...");

        const info = await transporter.sendMail({
            from: `"Apex System" <${ICLOUD_EMAIL}>`,
            to: SECRETARY_EMAIL,
            subject: `[Report] ${project.name} - Total ¥${totalAmount.toFixed(2)}`,
            html: htmlBody,
            attachments: emailAttachments,
        });

        console.log("Mail sent successfully, Message ID:", info.messageId);

        return res.status(200).json({
            success: true,
            summary: {
                projectName: project.name,
                sentTo: SECRETARY_EMAIL,
                totalAmount,
                attachmentCount: emailAttachments.length
            }
        });

    } catch (error) {
        console.error('Vercel API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error while sending email' });
    }
}
