export const welcomeTemplate = (name: string, otp: string) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <title>Welcome to TradEasy</title>
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
              <h1>Welcome to TradEasy</h1>
          </div>
          <div class="content">
              <p>Dear ${name},</p>
              <p>Welcome to TradEasy! We're excited to have you on board.</p>
              <p>To get started, please use the following One-Time Password (OTP) to complete your registration:</p>
              <p><strong>${otp}</strong></p>
              <p>If you did not request this, please ignore this email or contact our support team.</p>
              <p>We look forward to providing you with the best service. If you have any questions, feel free to reach out to us.</p>
              <p>Best regards,</p>
              <p>The TradEasy Team</p>
          </div>
      </div>
  </body>
  </html>
  
    `;
};
