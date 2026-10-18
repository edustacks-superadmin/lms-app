import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { username, password } = await request.json();

        // Use credentials from env or from request
        const testpressUsername = username || process.env.TESTPRESS_USERNAME;
        const testpressPassword = password || process.env.TESTPRESS_PASSWORD;
        const baseUrl = process.env.TESTPRESS_BASE_URL;

        if (!baseUrl || !testpressUsername || !testpressPassword) {
            return NextResponse.json(
                { error: 'Testpress credentials not configured' },
                { status: 400 }
            );
        }

        // Authenticate with Testpress
        const authResponse = await fetch(`${baseUrl}/api/v2.5/auth-token/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: testpressUsername,
                password: testpressPassword
            })
        });

        if (!authResponse.ok) {
            const errorText = await authResponse.text();
            return NextResponse.json(
                { error: 'Authentication failed', details: errorText },
                { status: authResponse.status }
            );
        }

        const data = await authResponse.json();

        return NextResponse.json({
            success: true,
            token: data.token
        });

    } catch (error) {
        console.error('Testpress auth error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
