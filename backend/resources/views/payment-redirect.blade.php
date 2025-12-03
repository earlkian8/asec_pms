<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment {{ ucfirst($status) }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        h1 {
            margin: 0 0 20px 0;
            font-size: 28px;
        }
        p {
            margin: 10px 0;
            opacity: 0.9;
        }
        .button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: scale(1.05);
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Payment {{ ucfirst($status) }}</h1>
        <p>Redirecting you back to the app...</p>
        <div class="spinner"></div>
        <p style="font-size: 14px; margin-top: 20px; opacity: 0.7;">
            If you are not redirected automatically, 
            <a href="{{ $deepLink }}" class="button" style="display: inline-block; margin-top: 10px;">
                Tap here
            </a>
        </p>
    </div>

    <script>
        // Try to open the deep link
        const deepLink = @json($deepLink);
        
        // Attempt to open the app
        function openApp() {
            // Try multiple methods for better compatibility
            window.location.href = deepLink;
            
            // Fallback: try opening in a new window/tab
            setTimeout(() => {
                window.open(deepLink, '_blank');
            }, 500);
        }

        // Try immediately
        openApp();

        // Also try on page load
        window.addEventListener('load', () => {
            setTimeout(openApp, 100);
        });

        // For iOS, we might need user interaction
        document.addEventListener('click', () => {
            openApp();
        }, { once: true });
    </script>
</body>
</html>

