<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 – Server Error</title>
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
            background: linear-gradient(135deg, #fafafa, #f4f4f5);
            border: 2px solid #d4d4d8;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .icon-wrap svg { width: 36px; height: 36px; stroke: #52525b; }

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
            background: linear-gradient(135deg, #fafafa, #f4f4f5);
            border: 1px solid #d4d4d8;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: left;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .info-box svg { flex-shrink: 0; width: 18px; height: 18px; stroke: #52525b; margin-top: 1px; }
        .info-box p { color: #3f3f46; margin: 0; font-size: 13px; }

        /* Divider */
        .divider {
            border: none;
            border-top: 1px solid #f3f4f6;
            margin: 8px 0 20px;
        }

        /* Status steps */
        .steps {
            display: flex;
            flex-direction: column;
            gap: 8px;
            text-align: left;
            margin-bottom: 28px;
        }
        .step {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: #6b7280;
        }
        .step-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #d4d4d8;
            flex-shrink: 0;
        }
        .step-dot.active { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.2); }

        .btn-group { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

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
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/>
                </svg>
            </div>

            <span class="code-badge">Error 500</span>
            <h1>Internal Server Error</h1>
            <p>Something went wrong on our end. Our team has been notified.</p>
            <p>Please try again in a moment or contact your administrator.</p>

            <div class="info-box">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                </svg>
                <p>This is an unexpected server-side error. You don't need to do anything — refreshing the page or going back usually resolves it. If this keeps happening, please contact your system administrator.</p>
            </div>

            <hr class="divider">

            <div class="steps">
                <div class="step">
                    <span class="step-dot active"></span>
                    Your session and data are safe
                </div>
                <div class="step">
                    <span class="step-dot active"></span>
                    No action was taken on your behalf
                </div>
                <div class="step">
                    <span class="step-dot"></span>
                    Server team has been automatically notified
                </div>
            </div>

            <div class="btn-group">
                <a href="javascript:location.reload()" class="btn btn-outline">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                    Retry
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