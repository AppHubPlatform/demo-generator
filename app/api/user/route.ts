import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // Read Cloudflare Access header
    const email = request.headers.get('cf-access-authenticated-user-email');

    if (email) {
        return NextResponse.json({
            email: email,
            authenticated: true,
        });
    }

    return NextResponse.json({
        authenticated: false,
    });
}
