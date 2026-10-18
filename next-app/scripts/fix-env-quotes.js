const fs = require('fs');

const envPath = '.env.local';

try {
    let content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n'); // using simple split for analysis
    let fixed = false;
    let newLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('R2_PUBLIC_DOMAIN=')) {
            console.log(`Found R2_PUBLIC_DOMAIN line: ${line}`);
            // Check for quotes
            const parts = line.split('=');
            if (parts.length >= 2) {
                const value = parts.slice(1).join('=');
                if (value.startsWith('"') && !value.endsWith('"')) {
                    console.log('❌ Unclosed quote detected! Fixing...');
                    newLines.push(line + '"');
                    fixed = true;
                } else if (!value.startsWith('"')) {
                    console.log('Value does not start with quote. Checking if it should.');
                    // If it looks like a URL and doesn't have quotes, it might be fine, 
                    // unless next line is smashed.
                    // But if it was smashed, the newline is gone? 
                    // If fs.readFileSync read it, the newline is present in buffer if it's there?
                    // IF the file has `VAR="val` (EOF/EOL) and next line is `NEXT=...`, 
                    // then `fs` sees `\n`.
                    newLines.push(line);
                } else {
                    newLines.push(line);
                }
            } else {
                newLines.push(line);
            }
        } else {
            newLines.push(line);
        }
    }

    if (fixed) {
        fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
        console.log('✅ Fixed unclosed quote in .env.local');
    } else {
        console.log('No unclosed quote found in R2_PUBLIC_DOMAIN line.');
        // Fallback: check for the smashed content directly again with simpler regex?
        if (content.includes('r2.devNEXT_PUBLIC')) {
            console.log('Wait, "r2.devNEXT_PUBLIC" IS found. Forcing split.');
            const fixedContent = content.replace('r2.devNEXT_PUBLIC', 'r2.dev"\nNEXT_PUBLIC');
            fs.writeFileSync(envPath, fixedContent, 'utf8');
            console.log('✅ Forced split and added quote.');
        }
    }

} catch (e) {
    console.error('Error:', e);
}
