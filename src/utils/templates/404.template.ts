export const NotFoundtemplate = () => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f8f8f8;
                font-family: Arial, sans-serif;
            }
            .container {
                text-align: center;
            }
            h1 {
                font-size: 4em;
                color: #333;
            }
            p {
                color: #666;
            }
            a {
                display: inline-block;
                color: #fff;
                background-color: #007BFF;
                padding: 12px 24px;
                margin-top: 24px;
                text-decoration: none;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            a:hover {
                background-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>404</h1>
            <p>Sorry, the page you are looking for could not be found.</p>
            <a href="/">Go Home</a>
        </div>
    </body>
    </html>
    
    
    
    `;
};
