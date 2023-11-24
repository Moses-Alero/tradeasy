import { environment as env } from '../config/environment';

export const invoiceEmailTemplate = (data: any) => {
  var htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f0f0f0;
            }
            .invoice-box {
                max-width: 800px;
                margin: auto;
                padding: 30px;
                border: 1px solid #eee;
                box-shadow: 0 0 10px rgba(0, 0, 0, .15);
                font-size: 16px;
                line-height: 24px;
                color: #555;
                background-color: #fff;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                background-color: #FF6641;
                color: #fff;
                padding: 20px;
            }
            .invoice-header img {
                height: 50px;
            }
            table {
                width: 100%;
                line-height: inherit;
                text-align: left;
                border-collapse: collapse;
            }
            table td, table th {
                padding: 12px;
                border: 1px solid #eee;
            }
            table th {
                background-color: #eee;
                color: #333;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #888;
            }
            .pay-now-button {
                display: block;
                width: 200px;
                height: 50px;
                margin: 20px auto;
                background-color: #4CAF50;
                color: white;
                text-align: center;
                line-height: 50px;
                font-size: 18px;
                cursor: pointer;
            }
            a{
                text-decoration: none;
                color: white;
            }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="invoice-header">
                <h1>TradEazy</h1>
                <img id="companyLogo" src="" alt="Company Logo">
            </div>
            <h2>Invoice</h2>
            <p>Invoice No: ${data.invoiceNo}</p>
            <p>Issued To: ${
              data.issuedTo.companyName
                ? data.issuedTo.companyName
                : data.issuedTo.fullname
            }</p>
            <p>Description: ${data.description}</p>
            <p>Total Amount: $${data.totalAmount}</p>
            <p>Client Email: ${data.issuedTo.email}</p>
            <table id="invoiceItems">
                <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit Price (NGN)</th>
                </tr>`;

  data.invoiceItems.forEach(function (item) {
    htmlContent += `
                <tr>
                    <td>${item.item}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unitPrice}</td>
                </tr>`;
  });

  htmlContent += `
            </table>
            <div class="pay-now-button" onclick="handlePayment()"><a href=${env.apiUri}/invoice/pay/${data.id}>
            Pay Now
          </a></div>
            <div class="footer">
                <p>The customer shall be responsible for the invoice services provided by the credit. For items not covered in the attached invoice, please contact COMPANY.</p>
            </div>
        </div>
    </body>
    </html>`;

  return htmlContent;
};

export const invoicePaymentTemplate = (data: any) => {
  var htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f0f0f0;
            }
            .invoice-box {
                max-width: 800px;
                margin: auto;
                padding: 30px;
                border: 1px solid #eee;
                box-shadow: 0 0 10px rgba(0, 0, 0, .15);
                font-size: 16px;
                line-height: 24px;
                color: #555;
                background-color: #fff;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                background-color: #FF6641;
                color: #fff;
                padding: 20px;
            }
            .invoice-header img {
                height: 50px;
            }
            table {
                width: 100%;
                line-height: inherit;
                text-align: left;
                border-collapse: collapse;
            }
            table td, table th {
                padding: 12px;
                border: 1px solid #eee;
            }
            table th {
                background-color: #eee;
                color: #333;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #888;
            }
            .pay-now-button {
                display: block;
                width: 200px;
                height: 50px;
                margin: 20px auto;
                background-color: #4CAF50;
                color: white;
                text-align: center;
                line-height: 50px;
                font-size: 18px;
                cursor: pointer;
            }
            a{
                text-decoration: none;
                color: white;
            }
        </style>
      </head>
      <script nonce="2726c7f26c" src="https://checkout.flutterwave.com/v3.js"></script>
      <script>    
      
          function handlePayment() {
            console.log("Handling Payments")
              makePayment();
          }
          
          function makePayment() {
              FlutterwaveCheckout({
                  public_key: "${env.flutterwave.publicKey}",
                  tx_ref: "titanic-48981487343MDI0NzMx",
                  amount: "${data.totalAmount}",
                  currency: "NGN",
                  payment_options: "card, mobilemoneyghana, ussd",
                  callback: function(payment) {
                      verifyTransactionOnBackend(payment.id);
                  },
                  onclose: function(incomplete) {
                      if (incomplete || window.verified === false) {
                          document.querySelector("#payment-failed").style.display = 'block';
                      } else {
                          document.querySelector("form").style.display = 'none';
                          if (window.verified == true) {
                              document.querySelector("#payment-success").style.display = 'block';
                          } else {
                              document.querySelector("#payment-pending").style.display = 'block';
                          }
                      }
                  },
                  meta: {
                      consumer_id: 23,
                      consumer_mac: "92a3-912ba-1192a",
                  },
                  customer: {
                      email: "${data.issuedTo.email}",
                      phone_number: "08102909304",
                      name: "${
                        data.issuedTo.companyName
                          ? data.issuedTo.companyName
                          : data.issuedTo.fullname
                      }",
                  },
                  customizations: {
                      title: "TradEazy Invoice",
                      description: "${data.description}",
                      logo: "https://www.logolynx.com/images/logolynx/22/2239ca38f5505fbfce7e55bbc0604386.jpeg",
                  },
              });
          }
  
          function verifyTransactionOnBackend(transactionId) {
              setTimeout(function() {
                  window.verified = true;
              }, 200);
          }
          
      </script>
      <body>
      <body>
      <div class="invoice-box">
          <div class="invoice-header">
              <h1>TradEazy</h1>
              <img id="companyLogo" src="" alt="Company Logo">
          </div>
          <h2>Invoice</h2>
          <p>Invoice No: ${data.invoiceNo}</p>
          <p>Issued To: ${
            data.issuedTo.companyName
              ? data.issuedTo.companyName
              : data.issuedTo.fullname
          }</p>
          <p>Description: ${data.description}</p>
          <p>Total Amount: NGN ${data.totalAmount}</p>
          <p>Client Email: ${data.issuedTo.email}</p>
          <table id="invoiceItems">
              <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
              </tr>`;

  data.invoiceItems.forEach(function (item) {
    htmlContent += `
              <tr>
                  <td>${item.item}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.unitPrice}</td>
              </tr>`;
  });

  htmlContent += `
          </table>
          <button id="pay-btn" class="pay-now-button">Pay Now</button>
          <div class="footer">
              <p>The customer shall be responsible for the invoice services provided by the credit. For items not covered in the attached invoice, please contact COMPANY.</p>
          </div>
      </div>
      </body>
      <script>
      document.getElementById("pay-btn").addEventListener("click", handlePayment)
      </script>
      </html>`;

  return htmlContent;
};

`
HTML CSSResult Skip Results Iframe
EDIT ON
<form method="POST" action="https://checkout.flutterwave.com/v3/hosted/pay">
  <div>
    Your order is N2,000
  </div>
  <input type="hidden" name="public_key" value="FLWPUBK_TEST-02b9b5fc6406bd4a41c3ff141cc45e93-X" />
  <input type="hidden" name="customer[email]" value="test@mailnator.com" />
  <input type="hidden" name="customer[name]" value="Ayomide Jimi-Oni" />
  <input type="hidden" name="tx_ref" value="txref-81123" />
  <input type="hidden" name="amount" value="2000" />
  <input type="hidden" name="currency" value="NGN" />
  <input type="hidden" name="meta[source]" value="docs-html-test" />
  <br>
  <button type="submit" id="start-payment-button">Pay Now</button>
</form>

`;
