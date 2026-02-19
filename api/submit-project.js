import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const ICLOUD_EMAIL = process.env.ICLOUD_EMAIL;
const ICLOUD_APP_PASSWORD = process.env.ICLOUD_APP_PASSWORD;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { projectId } = req.body;

        if (!projectId) return res.status(400).json({ error: 'Project ID required' });
        
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase environment variables missing' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch profile for email
        const { data: profileData } = await supabase
            .from('profiles').select('secretary_email, email').limit(1).single();

        const SECRETARY_EMAIL = profileData?.secretary_email || profileData?.email || '1604285278@qq.com';

        // 2. Fetch Project
        const { data: project, error: projErr } = await supabase
            .from('projects').select('*').eq('id', projectId).single();

        if (projErr || !project) throw new Error(`Project not found: ${projectId}`);

        // 3. Fetch Expenses
        const { data: expenses } = await supabase
            .from('expenses').select('*').eq('project_id', projectId)
            .order('date', { ascending: true });

        const expenseList = expenses || [];
        const totalAmount = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);

        // 4. Fetch Attachments
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

        // 5. Download and Process Attachments
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

                        const meta = parts[0];
                        const mimeMatch = meta.match(/:(.*?);/);
                        contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                        
                        const base64Data = parts[parts.length - 1];
                        // Using Buffer.from is safe in Node environments
                        buffer = Buffer.from(base64Data, 'base64');
                    } else {
                        const response = await fetch(att.url);
                        if (!response.ok) continue;

                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                        contentType = response.headers.get('content-type') || '';
                    }

                    if (!buffer || buffer.length === 0) continue;

                    let ext = 'jpg';
                    if (contentType) {
                        const ct = contentType.toLowerCase();
                        if (ct.includes('jpeg') || ct.includes('jpg')) ext = 'jpg';
                        else if (ct.includes('png')) ext = 'png';
                        else if (ct.includes('pdf')) ext = 'pdf';
                        else if (ct.includes('webp')) ext = 'webp';
                        else if (ct.includes('heic')) ext = 'heic';
                    }

                    globalAttCount++;
                    const seq = String(globalAttCount).padStart(2, '0');
                    const safeMerchant = (expense.merchant || 'Expense').replace(/[\\/:*?"<>|\s]/g, '_');
                    const filename = `${safeMerchant}-${seq}.${ext}`;

                    emailAttachments.push({
                        filename,
                        content: buffer
                    });
                } catch (e) {
                    console.error('Attachment processing error:', e);
                }
            }
        }

        // 6. Build Email
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
            <body style="margin:0;padding:0;font-family:sans-serif;background-color:#f4f7f9">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 20px">
                    <tr>
                        <td align="center">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05)">
                                <tr>
                                    <td style="background:linear-gradient(135deg, #D4AF37, #B09028);padding:40px;text-align:center">
                                        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800">Expense Report</h1>
                                        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">${project.name}</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:40px">
                                        <div style="margin-bottom:32px;padding:24px;background:#f8f9fa;border-radius:16px">
                                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td>
                                                        <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase">Total Amount</p>
                                                        <p style="margin:4px 0 0;font-size:32px;font-weight:800;color:#D4AF37">¥${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                                    </td>
                                                    <td align="right">
                                                        <p style="margin:0;color:#888;font-size:11px;text-transform:uppercase">Count</p>
                                                        <p style="margin:4px 0 0;font-size:32px;font-weight:800;color:#1a1a2e">${expenseList.length}</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </div>
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:20px">
                                            <thead>
                                                <tr style="background:#f8f9fa">
                                                    <th style="padding:12px 16px;text-align:left;font-size:11px;color:#888">Merchant</th>
                                                    <th style="padding:12px 16px;text-align:left;font-size:11px;color:#888">Category</th>
                                                    <th style="padding:12px 16px;text-align:left;font-size:11px;color:#888">Date</th>
                                                    <th style="padding:12px 16px;text-align:right;font-size:11px;color:#888">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${expenseTableRows}
                                            </tbody>
                                        </table>
                                        <div style="text-align:center;margin-top:40px;color:#aaa;font-size:12px">
                                            <p>Sent via Apex Expense Management System • ${dateStr}</p>
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

        if (ICLOUD_EMAIL && ICLOUD_APP_PASSWORD) {
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
        }

        return res.status(200).json({
            success: true,
            message: 'Report submitted successfully',
            summary: {
                projectName: project.name,
                projectId: project.id,
                totalAmount,
                expenseCount: expenseList.length,
                attachmentCount: emailAttachments.length,
                sentTo: SECRETARY_EMAIL
            }
        });

    } catch (error) {
        console.error('Submission error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
