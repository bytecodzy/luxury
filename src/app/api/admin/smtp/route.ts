import { NextRequest, NextResponse } from 'next/server';
import { getSmtpSettings, testSmtpConnection, resetSmtpTransporter } from '@/lib/email';
import { verifyAuth } from '@/lib/auth';

/**
 * Verify admin access using raw token string
 */
async function verifyAdminFromToken(token: string) {
  // Create a minimal request-like object for verifyAuth
  const req = new NextRequest(new URL('http://localhost'), {
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  return verifyAuth(req);
}

/**
 * GET /api/admin/smtp — Get current SMTP configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = request.headers.get('authorization');
    const user = await verifyAdminFromToken(auth?.replace('Bearer ', '') ?? '');

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const settings = getSmtpSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('SMTP GET error:', error);
    return NextResponse.json({ error: 'Failed to get SMTP settings' }, { status: 500 });
  }
}

/**
 * POST /api/admin/smtp — Test SMTP connection with provided or current settings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = request.headers.get('authorization');
    const user = await verifyAdminFromToken(auth?.replace('Bearer ', '') ?? '');

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { action, host, port, user: smtpUser, pass, from } = body;

    if (action === 'test') {
      // Test connection with provided or current settings
      const testConfig = (host && port && smtpUser)
        ? { host, port: parseInt(String(port), 10), user: smtpUser, pass: pass || '', from: from || smtpUser }
        : undefined;

      const result = await testSmtpConnection(testConfig);
      return NextResponse.json(result);
    }

    if (action === 'send-test-email') {
      // Send a test email to the admin
      const { sendEmail } = await import('@/lib/email');
      const targetEmail = smtpUser || process.env.SMTP_USER || '';

      if (!targetEmail) {
        return NextResponse.json({ success: false, message: 'No email address to send test to' }, { status: 400 });
      }

      const success = await sendEmail({
        to: targetEmail,
        subject: '3 Boxes Luxury — SMTP Test Email',
        html: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #292524; border-radius: 12px; border: 1px solid #44403c; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #92400e, #b45309); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #fef3c7; font-size: 24px; font-weight: 700; letter-spacing: 2px;">3 BOXES LUXURY</h1>
              <p style="margin: 8px 0 0; color: #fcd34d; font-size: 12px; text-transform: uppercase; letter-spacing: 3px;">SMTP Configuration Test</p>
            </div>
            <div style="padding: 35px 40px;">
              <p style="color: #d6d3d1; font-size: 15px; line-height: 1.6; margin: 0;">
                ✅ <strong>Congratulations!</strong> Your SMTP configuration is working correctly. This test email confirms that:
              </p>
              <ul style="color: #a8a29e; font-size: 14px; line-height: 1.8; margin: 20px 0; padding-left: 20px;">
                <li>SMTP server connection is successful</li>
                <li>Authentication credentials are valid</li>
                <li>Email delivery is working properly</li>
                <li>2FA verification codes will be sent to users</li>
              </ul>
              <p style="color: #78716c; font-size: 12px; margin: 20px 0 0;">
                Sent at: ${new Date().toLocaleString()}
              </p>
            </div>
            <div style="background: #1c1917; padding: 20px 40px; border-top: 1px solid #44403c;">
              <p style="margin: 0; color: #78716c; font-size: 11px; text-align: center;">
                This is an automated test email from 3 Boxes Luxury Admin Panel.
              </p>
            </div>
          </div>
        `,
        text: '3 Boxes Luxury — SMTP Test Email\n\nCongratulations! Your SMTP configuration is working correctly. 2FA verification codes will be sent to users successfully.',
      });

      return NextResponse.json({
        success,
        message: success
          ? `✅ Test email sent successfully to ${targetEmail}`
          : '❌ Failed to send test email. Check SMTP credentials.',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "test" or "send-test-email".' }, { status: 400 });
  } catch (error) {
    console.error('SMTP POST error:', error);
    return NextResponse.json({ error: 'SMTP operation failed' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/smtp — Update SMTP configuration (updates process.env at runtime)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const auth = request.headers.get('authorization');
    const user = await verifyAdminFromToken(auth?.replace('Bearer ', '') ?? '');

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, user: smtpUser, pass, from } = body;

    if (!host || !port || !smtpUser) {
      return NextResponse.json(
        { error: 'Host, port, and username are required' },
        { status: 400 }
      );
    }

    // Update environment variables at runtime
    process.env.SMTP_HOST = host;
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_USER = smtpUser;
    process.env.SMTP_FROM = from || smtpUser;
    if (pass) {
      process.env.SMTP_PASS = pass;
    }

    // Reset transporter so it picks up new config
    resetSmtpTransporter();

    // Test the new connection
    const testResult = await testSmtpConnection({
      host,
      port: parseInt(String(port), 10),
      user: smtpUser,
      pass: pass || process.env.SMTP_PASS || '',
      from: from || smtpUser,
    });

    return NextResponse.json({
      success: true,
      message: 'SMTP configuration updated successfully',
      connectionTest: testResult,
    });
  } catch (error) {
    console.error('SMTP PUT error:', error);
    return NextResponse.json({ error: 'Failed to update SMTP settings' }, { status: 500 });
  }
}
