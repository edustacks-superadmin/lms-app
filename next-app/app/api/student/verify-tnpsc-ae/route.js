import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow 60s for N8N to reply

export async function POST(req) {
    try {
        const { registration_number, dob } = await req.json();

        if (!registration_number || !dob) {
            return NextResponse.json({ error: 'Registration number and DOB are required' }, { status: 400 });
        }

        const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;

        if (!N8N_WEBHOOK) {
            console.error("N8N_WEBHOOK_URL is missing.");
            return NextResponse.json({
                error: 'Server Misconfiguration: N8N_WEBHOOK_URL not set. Please set this in Vercel Environment Variables.'
            }, { status: 500 });
        }

        console.log(`Proxying to N8N: ${N8N_WEBHOOK} for ${registration_number}`);

        // Call N8N Webhook
        const n8nRes = await fetch(N8N_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                body: {
                    registration_number,
                    dob
                }
            })
        });

        if (!n8nRes.ok) {
            const errorText = await n8nRes.text();
            console.error(`N8N Error ${n8nRes.status}:`, errorText);
            throw new Error(`N8N Gateway Error: ${n8nRes.status}`);
        }

        const n8nData = await n8nRes.json();
        console.log('N8N Response:', JSON.stringify(n8nData, null, 2));

        const responseObj = Array.isArray(n8nData) ? n8nData[0] : n8nData;

        if (responseObj.error) {
            console.warn("N8N returned error:", responseObj.error);
            return NextResponse.json({ error: responseObj.error }, { status: 404 });
        }

        let candidateData = null;
        if (responseObj.data && responseObj.data.rows) {
            candidateData = responseObj.data;
        } else if (responseObj.rows) {
            candidateData = responseObj;
        } else if (responseObj.success && responseObj.data) {
            candidateData = responseObj.data;
        }

        if (candidateData) {
            console.log("Success! Returning valid data.");
            return NextResponse.json({
                success: true,
                data: candidateData
            });
        }

        console.error("Invalid Structure:", responseObj);
        // DEBUG: Return the actual object received to help diagnosis on frontend
        return NextResponse.json({
            error: `Debug: N8N Response Invalid. Received keys: ${Object.keys(responseObj).join(', ')}`
        }, { status: 404 });

    } catch (error) {
        console.error('Verification Proxy Error:', error);
        return NextResponse.json({ error: error.message || 'Verification failed downstream' }, { status: 500 });
    }
}
