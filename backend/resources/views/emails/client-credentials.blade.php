<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Client Portal Credentials</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            min-height: 100vh;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 16px;
            padding: 0;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            color: #ffffff;
            padding: 40px 40px 30px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .title {
            font-size: 22px;
            font-weight: 500;
            color: #e5e7eb;
            margin-top: 10px;
        }
        .content {
            padding: 40px;
        }
        .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 24px;
        }
        .intro-text {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 32px;
            line-height: 1.7;
        }
        .credentials-section {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-radius: 12px;
            padding: 32px;
            margin: 32px 0;
            border: 1px solid #e5e7eb;
        }
        .credentials-title {
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 20px;
        }
        .credential-item {
            margin-bottom: 20px;
        }
        .credential-item:last-child {
            margin-bottom: 0;
        }
        .credential-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .credential-value {
            font-size: 18px;
            color: #111827;
            font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
            background-color: #ffffff;
            padding: 14px 16px;
            border-radius: 8px;
            border: 2px solid #e5e7eb;
            word-break: break-all;
            font-weight: 500;
        }
        .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 32px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
        }
        .warning-title {
            font-weight: 700;
            color: #92400e;
            font-size: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .warning-text {
            color: #78350f;
            font-size: 14px;
            margin: 0;
            line-height: 1.6;
        }
        .security-box {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 32px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }
        .security-title {
            font-weight: 700;
            color: #1e40af;
            font-size: 14px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .security-text {
            color: #1e3a8a;
            font-size: 14px;
            margin: 0;
            line-height: 1.6;
        }
        .closing {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
        }
        .closing-text {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 12px;
            line-height: 1.7;
        }
        .signature {
            font-size: 15px;
            color: #1f2937;
            margin-top: 16px;
        }
        .signature-name {
            font-weight: 600;
            color: #111827;
        }
        .footer {
            background-color: #f9fafb;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            color: #6b7280;
            font-size: 12px;
            line-height: 1.6;
            margin: 4px 0;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="container">
            <div class="header">
                <div class="logo">{{ $appName }}</div>
                <div class="title">Client Portal Access</div>
            </div>

            <div class="content">
                <div class="greeting">
                    Dear {{ $clientName }},
                </div>

                <p class="intro-text">
                    Your client portal account has been successfully created. You can now access your projects, view progress updates, and communicate with our team.
                </p>

                <div class="credentials-section">
                    <div class="credentials-title">Login Credentials</div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Email Address</div>
                        <div class="credential-value">{{ $email }}</div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="credential-item">
                        <div class="credential-label">Password</div>
                        <div class="credential-value">{{ $password }}</div>
                    </div>
                </div>

                <div class="warning-box">
                    <div class="warning-title">Important Security Notice</div>
                    <p class="warning-text">
                        For security reasons, you will be required to change your password immediately after your first login. Please use these credentials to log in and set a new password of your choice.
                    </p>
                </div>

                <div class="security-box">
                    <div class="security-title">Security Reminder</div>
                    <p class="security-text">
                        Please keep your credentials secure and do not share them with anyone. If you did not request this account, please contact our support team immediately.
                    </p>
                </div>

                <div class="closing">
                    <p class="closing-text">
                        If you have any questions or need assistance accessing your portal, please don't hesitate to contact our support team.
                    </p>
                    <div class="signature">
                        Best regards,<br>
                        <span class="signature-name">{{ $appName }} Team</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p class="footer-text">This is an automated message. Please do not reply to this email.</p>
                <p class="footer-text">&copy; {{ date('Y') }} {{ $appName }}. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>

