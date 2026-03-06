<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>403 – Forbidden</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f3f4f6;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* ── Header (mirrors app header) ── */
        header {
            background: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 24px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0,0,0,.06);
        }
        header img { height: 32px; }

        /* ── Main ── */
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

        /* Icon badge */
        .icon-wrap {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fef2f2, #fee2e2);
            border: 2px solid #fecaca;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }
        .icon-wrap svg { width: 36px; height: 36px; color: #dc2626; stroke: #dc2626; }

        /* Code badge */
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

        /* Info box */
        .info-box {
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 24px 0;
            text-align: left;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .info-box svg { flex-shrink: 0; width: 18px; height: 18px; stroke: #2563eb; margin-top: 1px; }
        .info-box p { color: #1e40af; margin: 0; font-size: 13px; }

        /* Buttons */
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

        /* Footer */
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
                    <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"/>
                </svg>
            </div>

            <span class="code-badge">Error 403</span>
            <h1>Access Forbidden</h1>
            <p>You don't have permission to access this page or perform this action.</p>
            <p>If you believe this is a mistake, please contact your administrator.</p>

            <div class="info-box">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="1.8" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>
                </svg>
                <p>Your current role does not include the required permissions for this resource. Ask an administrator to grant you the appropriate access.</p>
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