// Testpress API Authentication & Token Management
// This service handles token caching to avoid rate limits

let cachedToken = null;
let tokenExpiry = null;
const TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds

export async function getTestpressToken(forceRefresh = false) {
    // Return cached token if still valid
    if (!forceRefresh && cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log('Using cached Testpress token');
        return cachedToken;
    }

    // Fetch new token
    const baseUrl = process.env.TESTPRESS_BASE_URL;
    const username = process.env.TESTPRESS_USERNAME;
    const password = process.env.TESTPRESS_PASSWORD;

    if (!baseUrl || !username || !password) {
        throw new Error('Testpress credentials not configured');
    }

    console.log('Fetching new Testpress token...');

    const response = await fetch(`${baseUrl}/api/v2.5/auth-token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const errorText = await response.text();

        // Handle rate limiting
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new Error(`Rate limited. Retry after ${retryAfter || 'unknown'} seconds`);
        }

        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
    }

    const { token } = await response.json();

    if (!token) {
        throw new Error('No token received from Testpress');
    }

    // Cache the token
    cachedToken = token;
    tokenExpiry = Date.now() + TOKEN_LIFETIME;

    console.log('New Testpress token cached');

    return token;
}

// Retry wrapper with exponential backoff
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
                console.warn(`Rate limited. Attempt ${attempt + 1}/${maxRetries}. Waiting ${retryAfter}s...`);

                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
            }

            return response;

        } catch (error) {
            lastError = error;

            if (attempt < maxRetries - 1) {
                // Exponential backoff: 2^attempt seconds
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

// Clear cached token (useful for testing or manual refresh)
export function clearTokenCache() {
    cachedToken = null;
    tokenExpiry = null;
    console.log('Testpress token cache cleared');
}
