const fs = require('fs');

const envPath = '.env.local';

try {
    let content = fs.readFileSync(envPath, 'utf8');

    console.log('File content preview:', content.substring(0, 500));

    // Broader regex: look for NEXT_PUBLIC_SUPABASE_URL not preceded by newline (and not at start of file)
    // We match any character that is NOT \n or \r, followed immediately by NEXT_PUBLIC_SUPABASE_URL
    const regex = /([^\n\r])(NEXT_PUBLIC_SUPABASE_URL=)/;

    if (regex.test(content)) {
        console.log('Found concatenated env vars. Fixing...');
        const newContent = content.replace(regex, '$1\n$2');
        fs.writeFileSync(envPath, newContent, 'utf8');
        console.log('✅ .env.local fixed.');
    } else {
        console.log('No concatenation found.');
    }

} catch (e) {
    console.error('Error fixing .env.local:', e);
}
