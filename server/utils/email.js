const nodemailer = require('nodemailer');

/**
 * Creates a reusable nodemailer transporter using Gmail SMTP.
 * Requires EMAIL_USER and EMAIL_PASS environment variables.
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

/**
 * Sends a password recovery OTP email.
 * @param {string} to - Recipient email address
 * @param {string} otp - The plaintext 6-digit OTP code
 */
const sendOTPEmail = async (to, otp) => {
    const transporter = createTransporter();

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Password Recovery</title>
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:36px 40px 32px;text-align:center;">
                  <div style="display:inline-flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;line-height:36px;text-align:center;">
                      <span style="color:#fff;font-size:18px;">📚</span>
                    </div>
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Tenz <span style="color:#93c5fd;">Learn</span></span>
                  </div>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 16px;">
                  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Password Recovery</h1>
                  <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
                    We received a request to reset your password. Use the verification code below to continue. This code expires in <strong>10 minutes</strong>.
                  </p>
                  <!-- OTP Box -->
                  <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Your one-time code</p>
                    <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:14px;color:#1e40af;font-variant-numeric:tabular-nums;">${otp}</p>
                  </div>
                  <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                    If you didn't request a password reset, please ignore this email. Your password will remain unchanged and no action is required.
                  </p>
                  <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
                    <p style="margin:0;font-size:13px;color:#92400e;">⚠️ Never share this code with anyone. Tenz Learn staff will never ask for it.</p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 40px 32px;border-top:1px solid #f1f5f9;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                    © ${new Date().getFullYear()} TenZe. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: `"Tenz Learn" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Your password reset code is ${otp}`,
        html,
    });
};

module.exports = { sendOTPEmail };
