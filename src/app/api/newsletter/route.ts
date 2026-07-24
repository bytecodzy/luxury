import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // In a production environment, this would integrate with an email service
    // like Mailchimp, SendGrid, etc. For now, we log and return success.
    console.log(`Newsletter subscription: ${email}`);

    return NextResponse.json({ success: true, message: 'Successfully subscribed' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
