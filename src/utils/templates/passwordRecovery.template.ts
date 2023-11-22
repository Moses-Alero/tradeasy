export const passwordRecoveryTemplate = (name: string, otp: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>TradEasy Password Recovery</title>
        <style>
            body {
                font-family: Arial, sans-serif;
            }
            .container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
            }
            .header {
                text-align: center;
                padding: 20px;
                background-color: #f8f9fa;
                border-bottom: 1px solid #dee2e6;
            }
            .content {
                padding: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>TradEasy Password Recovery</h1>
            </div>
            <div class="content">
                <p>Dear ${name},</p>
                <p>You have requested to recover your password. Please use the following One-Time Password (OTP) to proceed:</p>
                <p><strong>${otp}</strong></p>
                <p>If you did not request this password recovery, please ignore this email or contact our support team.</p>
                <p>Best regards,</p>
                <p>The TradEasy Team</p>
            </div>
        </div>
    </body>
    </html>
    `;
};
