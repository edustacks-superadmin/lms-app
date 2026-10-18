
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const buildId = "PROXY_BUILD_0945"; // Unique build ID

    console.log(`[Proxy] [${buildId}] Request received at ${new Date().toLocaleTimeString()}`);

    if (!id) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
    }

    // Security Checks (Prevent direct browser access)
    // We allow if:
    // 1. It's an internal fetch (sec-fetch-dest is 'embed' or 'object')
    // 2. It has a valid Referer from our own site
    // 3. It identifies as the Mobile App (via custom header)
    const secFetchDest = request.headers.get('sec-fetch-dest');
    const referer = request.headers.get('referer');
    const xPlatform = request.headers.get('x-platform');
    const platformParam = searchParams.get('platform');
    const isMobileApp = xPlatform === 'mobile' || platformParam === 'mobile';

    console.log('[Proxy] Request Details:', {
        'sec-fetch-dest': secFetchDest,
        'referer': referer,
        'x-platform': xPlatform,
        'platform-param': platformParam,
        'id': id
    });

    const isValidRequest =
        secFetchDest === 'embed' ||
        secFetchDest === 'object' ||
        (referer && (
            referer.includes('/student/course/') ||
            referer.includes('/course/content/') ||
            referer.includes('localhost:8081') ||
            referer.includes('edustacks.co.in')
        )) ||
        isMobileApp;

    if (!isValidRequest) {
        const headersObj = {};
        request.headers.forEach((value, key) => {
            if (key.toLowerCase() !== 'cookie' && key.toLowerCase() !== 'authorization') {
                headersObj[key] = value;
            }
        });

        return NextResponse.json({
            error: 'Security Check Failed (Unauthorized Platform)',
            debug: {
                dest: secFetchDest,
                referer: referer || 'missing',
                platform: isMobileApp ? 'mobile' : 'unknown',
                headers: headersObj,
                id: id
            }
        }, { status: 403 });
    }

    try {
        // Fetch content details from database
        const content = await prisma.chapter_contents.findUnique({
            where: { id: parseInt(id) },
            select: { url: true, free_preview: true, title: true }
        });

        if (!content) {
            console.warn(`[Proxy] [${buildId}] 404: ID ${id} not found in database.`);
            return NextResponse.json({
                error: `PDF Content Record (ID: ${id}) Not Found`,
                build: buildId
            }, { status: 404 });
        }

        console.log(`[Proxy] [${buildId}] Found content: "${content.title}"`);
        console.log(`[Proxy] [${buildId}] Source URL: ${content.url}`);

        // Fetch PDF with longer timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout

        try {
            const response = await fetch(content.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; EdustacksBot/1.0)'
                }
            });

            clearTimeout(timeout);

            console.log(`[Proxy] [${buildId}] Fetch response status: ${response.status}`);
            console.log(`[Proxy] [${buildId}] Content-Type: ${response.headers.get('content-type')}`);

            if (!response.ok) {
                console.error(`[Proxy] [${buildId}] Failed to fetch PDF: ${response.status} ${response.statusText}`);
                return NextResponse.json({
                    error: `Failed to fetch PDF from source`,
                    details: {
                        status: response.status,
                        statusText: response.statusText,
                        sourceUrl: content.url,
                        contentType: response.headers.get('content-type')
                    },
                    build: buildId
                }, { status: 502 });
            }

            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.includes('pdf') && !contentType.includes('octet-stream')) {
                console.warn(`[Proxy] [${buildId}] Warning: Unexpected content type: ${contentType}`);
            }

            console.log(`[Proxy] [${buildId}] Streaming PDF: ${content.title}`);

            const responseHeaders = new Headers();
            responseHeaders.set('Content-Type', 'application/pdf');
            responseHeaders.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            responseHeaders.set('X-Proxy-Build', buildId);
            responseHeaders.set('X-Content-Title', encodeURIComponent(content.title));

            if (response.headers.get('content-length')) {
                responseHeaders.set('Content-Length', response.headers.get('content-length'));
            }

            return new Response(response.body, {
                status: 200,
                headers: responseHeaders,
            });
        } catch (fetchError) {
            clearTimeout(timeout);

            if (fetchError.name === 'AbortError') {
                console.error(`[Proxy] [${buildId}] Timeout: PDF fetch took longer than 25 seconds`);
                return NextResponse.json({
                    error: 'PDF fetch timeout',
                    details: 'The PDF source took too long to respond. Try again later.',
                    build: buildId
                }, { status: 504 });
            }

            throw fetchError;
        }
    } catch (error) {
        console.error(`[Proxy] [${buildId}] PDF Proxy Error:`, error);
        return NextResponse.json({
            error: 'Failed to fetch PDF',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            build: buildId
        }, { status: 500 });
    }
}
