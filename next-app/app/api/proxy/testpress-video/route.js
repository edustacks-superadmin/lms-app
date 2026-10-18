
import { NextResponse } from 'next/server';
import { getTestpressToken } from '../../../../lib/testpressAuth';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const token = await getTestpressToken();
        const response = await fetch(targetUrl, {
            headers: {
                'Authorization': `JWT ${token}`
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Testpress API Error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();

        // Logic to extract the best video source
        let videoUrl = null;
        let isEmbed = false;

        if (data.video) {
            // 1. Prefer direct MP4/YouTube URL
            if (data.video.url && (data.video.url.includes('http') || data.video.url.startsWith('//'))) {
                videoUrl = data.video.url;
            }
            // 2. Check for Embed code
            else if (data.video.embed_code) {
                // simple extraction if it's an iframe src
                const srcMatch = data.video.embed_code.match(/src="([^"]+)"/);
                if (srcMatch) {
                    videoUrl = srcMatch[1];
                    isEmbed = true;
                } else {
                    // Return raw embed code? Or just fail for now. 
                    // Usually we want a URL.
                    videoUrl = null;
                }
            }
            // 3. Transcoded (HLS)
            else if (data.video.transcoded_video && data.video.transcoded_video.url) {
                videoUrl = data.video.transcoded_video.url;
            }
        }

        if (videoUrl) {
            return NextResponse.json({ url: videoUrl, isEmbed });
        } else {
            return NextResponse.json({ error: 'No playable video URL found' }, { status: 404 });
        }

    } catch (error) {
        console.error('Testpress Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
