import { NextResponse } from 'next/server';

export const maxDuration = 60;

// Simple fetch helper - no AbortSignal.timeout for max compat
async function fetchPage(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                ...(options.headers || {})
            },
            body: options.body || undefined,
            redirect: 'manual'
        });

        const body = await response.text();
        // Collect headers safely
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });

        return { status: response.status, headers, body };
    } catch (fetchErr) {
        console.error(`[fetchPage] Error fetching ${url}:`, fetchErr.message);
        throw new Error(`Failed to connect to TNPSC website: ${fetchErr.message}`);
    }
}

function encodeParam(str) {
    if (!str) return '';
    return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
}

const TNPSC_URL = 'https://tnpscresults.tn.gov.in/Diploma_iti_202602/cts-index.aspx?token=JDHSUJWJ9873JHDY87JD';
const TNPSC_RESULT_URL = 'https://tnpscresults.tn.gov.in/Diploma_iti_202602/cts-result.aspx';

export async function POST(req) {
    try {
        const { registration_number, dob } = await req.json();

        if (!registration_number || !dob) {
            return NextResponse.json({ error: 'Registration number and DOB are required' }, { status: 400 });
        }

        console.log(`[Diploma/ITI] Verifying: ${registration_number}`);

        // ── Step 1: Get the form page (session cookie + CSRF tokens) ──
        const page = await fetchPage(TNPSC_URL);

        if (page.status !== 200) {
            throw new Error(`TNPSC returned status ${page.status} on form page`);
        }

        const html = page.body;

        // Extract hidden ASP.NET fields
        const getVal = (name) => {
            const match = html.match(new RegExp(`hidden" name="${name}" id="${name}" value="([^"]+)"`));
            return match ? match[1] : '';
        };

        const viewState = getVal('__VIEWSTATE');
        const eventValidation = getVal('__EVENTVALIDATION');
        const viewStateGenerator = getVal('__VIEWSTATEGENERATOR');

        if (!viewState || !eventValidation) {
            throw new Error('Could not extract ASP.NET form tokens from TNPSC page');
        }

        // Solve the simple math captcha (e.g., "What is 8 + 11 ?")
        const capMatch = html.match(/What\s+is\s+(\d+)\s*\+\s*(\d+)\s*\?/i);
        const captchaAnswer = capMatch ? String(parseInt(capMatch[1]) + parseInt(capMatch[2])) : '';

        if (!captchaAnswer) {
            throw new Error('Could not solve captcha on TNPSC page');
        }

        // Extract session cookie
        const setCookie = page.headers['set-cookie'] || '';
        const cookie = setCookie.split(';')[0];

        // ── Step 2: Submit the form ──
        const params = [
            '__VIEWSTATE=' + encodeParam(viewState),
            '__EVENTVALIDATION=' + encodeParam(eventValidation),
            '__VIEWSTATEGENERATOR=' + encodeParam(viewStateGenerator),
            'txtRegNo=' + encodeParam(registration_number),
            'txtDOB=' + encodeParam(dob),
            'txtCaptchaAnswer=' + encodeParam(captchaAnswer),
            'btnSubmit=' + encodeParam('Submit')
        ].join('&');

        const submitResult = await fetchPage(TNPSC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookie,
                'Referer': TNPSC_URL
            },
            body: params
        });

        // ── Step 3: Follow redirect to result page ──
        let resultHtml = submitResult.body;

        if (submitResult.status === 302) {
            const resultPage = await fetchPage(TNPSC_RESULT_URL, {
                headers: { 'Cookie': cookie, 'Referer': TNPSC_URL }
            });
            resultHtml = resultPage.body;
        }

        // ── Step 4: Parse the result HTML ──
        const cleanHtml = resultHtml.replace(/\s+/g, ' ');

        if (cleanHtml.includes('Incorrect Captcha') || cleanHtml.includes('Enter the characters')) {
            return NextResponse.json({ error: 'Captcha verification failed. Please try again.' }, { status: 422 });
        }

        if (cleanHtml.includes('Register number is required')) {
            return NextResponse.json({ error: 'Missing input fields' }, { status: 400 });
        }

        // Find registration number in the result table
        const regIndex = cleanHtml.indexOf(`>${registration_number}<`);
        if (regIndex === -1) {
            return NextResponse.json({ error: 'No results found for this registration number and date of birth.' }, { status: 404 });
        }

        // Extract candidate profile cells
        const afterReg = cleanHtml.substring(regIndex);
        const parts = afterReg.split('</td>');
        const rawCells = parts.slice(1, 15).map(p => p.replace(/<[^>]+>/g, '').trim());

        const data = { rows: [] };

        // Determine column alignment based on gender position
        const genderIndex = rawCells.findIndex(c =>
            c === 'MALE' || c === 'FEMALE' || c === 'TRANSGENDER'
        );

        if (genderIndex === 3) {
            data.paper1_part_a = rawCells[0];
            data.paper1_part_b = rawCells[1];
            data.communal_category = rawCells[2];
            data.gender = rawCells[3];
            data.pstm = rawCells[4];
            data.special_category = rawCells[5];
        } else if (genderIndex === 4) {
            data.official_name = rawCells[0];
            data.paper1_part_a = rawCells[1];
            data.paper1_part_b = rawCells[2];
            data.communal_category = rawCells[3];
            data.gender = rawCells[4];
            data.pstm = rawCells[5];
            data.special_category = rawCells[6];
        } else {
            data.paper1_part_a = rawCells[0];
            data.paper1_part_b = rawCells[1];
            data.communal_category = rawCells[2];
            data.gender = rawCells[3];
        }

        // Parse post/rank rows from the table
        const rows = cleanHtml.split('<tr');
        for (const row of rows) {
            const tds = row.match(/<td[^>]*>\s*(.*?)\s*<\/td>/gi);
            if (tds && tds.length >= 6) {
                const clean = tds.map(td => td.replace(/<[^>]+>/g, '').trim());
                // Look for rows with a serial number as first column (1, 2, 3...)
                if (/^\d+$/.test(clean[0]) && clean[1].length > 5) {
                    data.rows.push({
                        post_name: clean[1].replace(/&amp;/g, '&'),
                        paper2_marks: clean[2],
                        total_marks: clean[3],
                        overall_rank: clean[4],
                        communal_rank: clean[5] || '-',
                        special_category_rank: clean[6] || '-'
                    });
                }
            }
        }

        if (data.rows.length === 0 && !data.paper1_part_a) {
            return NextResponse.json({ error: 'No results found', debug: 'Parse failed' }, { status: 404 });
        }

        console.log(`[Diploma/ITI] Success for ${registration_number}: ${data.rows.length} posts found`);

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error('[Diploma/ITI] Verification Error:', error);
        return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 });
    }
}
