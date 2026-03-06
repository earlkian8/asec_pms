<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 – Page Not Found</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f3f4f6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        header {
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        header img { height: 32px; }

        main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
        }

        .card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,.08);
            padding: 48px 40px;
            max-width: 520px;
            width: 100%;
            text-align: center;
        }

        .icon-wrap {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fff7ed, #ffedd5);
            border: 2px solid #fed7aa;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .icon-wrap svg { width: 36px; height: 36px; stroke: #ea580c; }

        .code-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3f3f46, #27272a);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            padding: 4px 14px;
            border-radius: 999px;
            margin-bottom: 16px;
        }

        h1 {
            font-size: 26px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
        }

        p {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 8px;
        }

        .info-box {
            background: linear-gradient(135deg, #fff7ed, #ffedd5);
            border: 1px solid #fed7aa;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: left;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .info-box svg { flex-shrink: 0; width: 18px; height: 18px; stroke: #ea580c; margin-top: 1px; }
        .info-box p { color: #9a3412; margin: 0; font-size: 13px; }

        .btn-group { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all .15s ease;
            border: none;
        }
        .btn-primary {
            background: linear-gradient(135deg, #3f3f46, #27272a);
            color: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,.15);
        }
        .btn-primary:hover { background: linear-gradient(135deg, #27272a, #18181b); box-shadow: 0 4px 12px rgba(0,0,0,.2); }
        .btn-outline {
            background: #fff;
            color: #374151;
            border: 1.5px solid #d1d5db;
        }
        .btn-outline:hover { background: #f9fafb; }

        footer {
            background: #ffffff;
            border-top: 1px solid #e5e7eb;
            padding: 14px 24px;
            text-align: center;
            font-size: 13px;
            color: #9ca3af;
        }
    </style>
</head>
<body>

    <header>
        <img src="/logo.svg" alt="Logo" onerror="this.style.display='none'">
    </header>

    <main>
        <div class="card">
            <div class="icon-wrap">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z"/>
                </svg>
            </div>

            <span class="code-badge">Error 404</span>
            <h1>Page Not Found</h1>
            <p>The page you're looking for doesn't exist or may have been moved.</p>
            <p>Please check the URL or navigate back to a known page.</p>

            <div class="info-box">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/>
                </svg>
                <p>This could be due to a mistyped URL, an outdated bookmark, or a page that has been removed from the system.</p>
            </div>

            <div class="btn-group">
                <a href="javascript:history.back()" class="btn btn-outline">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                    Go Back
                </a>
                <a href="/" class="btn btn-primary">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/></svg>
                    Go to Dashboard
                </a>
            </div>
        </div>
    </main>

    <footer>
        &copy; 2025 Abdurauf Sawadjaan Engineering Consultancy. All rights reserved.
    </footer>

</body>
</html>