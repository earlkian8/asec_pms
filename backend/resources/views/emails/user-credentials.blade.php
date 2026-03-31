<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Account Credentials</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <div style="display:none;max-height:0;overflow:hidden;color:#f5f5f4;">
        Your system account credentials for Abdurauf Sawadjaan Engineering Consultancy.
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f4;padding:48px 16px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

                    <!-- Brand -->
                    <tr>
                        <td style="padding-bottom:28px;text-align:center;">
                            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#78716c;">
                                Abdurauf Sawadjaan Engineering Consultancy
                            </p>
                        </td>
                    </tr>

                    <!-- Card -->
                    <tr>
                        <td style="background-color:#ffffff;border-radius:8px;border:1px solid #e7e5e4;overflow:hidden;">

                            <!-- Header band -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="background-color:#1c1917;padding:36px 40px 32px;">
                                        <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#a8a29e;">
                                            System Access
                                        </p>
                                        <h1 style="margin:0;font-size:24px;font-weight:700;color:#fafaf9;line-height:1.2;">
                                            Your Account Credentials
                                        </h1>
                                        <p style="margin:8px 0 0;font-size:13px;color:#a8a29e;line-height:1.6;">
                                            Welcome to the team. Your account is ready.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Body -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="padding:36px 40px 0;">

                                        <!-- Greeting -->
                                        <p style="margin:0 0 8px;font-size:17px;font-weight:600;color:#1c1917;">
                                            Dear {{ $userName }},
                                        </p>
                                        <p style="margin:0 0 32px;font-size:14px;color:#57534e;line-height:1.75;">
                                            Your account has been created with the role of <strong>{{ $role }}</strong>. You can now log in to the system to manage your tasks and responsibilities. Your login details are below.
                                        </p>

                                        <!-- Divider -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                                            <tr><td style="height:1px;background-color:#f5f5f4;"></td></tr>
                                        </table>

                                        <!-- Credentials -->
                                        <p style="margin:0 0 16px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a8a29e;">
                                            Login Credentials
                                        </p>

                                        <!-- Email field -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                                            <tr>
                                                <td style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:16px 20px;">
                                                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a8a29e;">
                                                        Email Address
                                                    </p>
                                                    <p style="margin:0;font-size:15px;font-weight:500;color:#1c1917;font-family:'SF Mono','Fira Code','Courier New',monospace;word-break:break-all;">
                                                        {{ $email }}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Password field -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                                            <tr>
                                                <td style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;padding:16px 20px;">
                                                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#a8a29e;">
                                                        Temporary Password
                                                    </p>
                                                    <p style="margin:0;font-size:15px;font-weight:500;color:#1c1917;font-family:'SF Mono','Fira Code','Courier New',monospace;word-break:break-all;">
                                                        {{ $password }}
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Notice -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                                            <tr>
                                                <td style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;">
                                                    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#92400e;">
                                                        Action Required
                                                    </p>
                                                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.65;">
                                                        Please change your password after your first login. Keep your credentials private and do not share them with anyone.
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Login button -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                                            <tr>
                                                <td align="center">
                                                    <a href="{{ $loginUrl }}" style="display:inline-block;background-color:#1c1917;color:#fafaf9;font-size:14px;font-weight:600;padding:12px 32px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;">
                                                        Log In to Your Account
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Closing -->
                                        <p style="margin:0 0 6px;font-size:14px;color:#57534e;line-height:1.75;">
                                            If you have any questions or need assistance, please reach out to us directly.
                                        </p>
                                        <p style="margin:0 0 32px;font-size:14px;color:#57534e;line-height:1.75;">
                                            We look forward to working with you.
                                        </p>

                                        <!-- Signature -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                                            <tr>
                                                <td style="border-top:1px solid #f5f5f4;padding-top:24px;">
                                                    <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1c1917;">
                                                        Abdurauf Sawadjaan
                                                    </p>
                                                    <p style="margin:0;font-size:13px;color:#a8a29e;">
                                                        Abdurauf Sawadjaan Engineering Consultancy
                                                    </p>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding-top:24px;text-align:center;">
                            <p style="margin:0 0 4px;font-size:11px;color:#a8a29e;">
                                This is an automated message — please do not reply to this email.
                            </p>
                            <p style="margin:0;font-size:11px;color:#d6d3d1;">
                                &copy; {{ date('Y') }} Abdurauf Sawadjaan Engineering Consultancy. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
