export const invoiceTemplate = (data: any) => {
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
    <script>    
        function handlePayment() {
            // Add your payment handling code here
            alert('Pay Now button clicked!');
        }
</script>
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
            <div class="pay-now-button" onclick="handlePayment()"><a href="https://www.google.com">Pay Now</a></div>
            <div class="footer">
                <p>The customer shall be responsible for the invoice services provided by the credit. For items not covered in the attached invoice, please contact COMPANY.</p>
            </div>
        </div>
    </body>
    </html>`;

  return htmlContent;
};
