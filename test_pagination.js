// Quick debug script to check what values are being used

console.log('Testing batch import logic:');

// Simulate the prompts
const batchChoice = '1'; // or '2'
let maxPages = Infinity;

if (batchChoice === '2') {
    const pagesInput = ''; // User presses enter
    maxPages = parseInt(pagesInput) || 5;
    console.log(`Batch mode: ${maxPages} pages`);
} else {
    console.log(`All mode: ${maxPages} pages`);
}

// Test conditions
const pageNum = 1;
const hasNext = true;

console.log(`Condition check: nextUrl && pageNum <= maxPages`);
console.log(`  hasNext: ${hasNext}`);
console.log(`  pageNum (${pageNum}) <= maxPages (${maxPages}): ${pageNum <= maxPages}`);
console.log(`  Will continue: ${hasNext && pageNum <= maxPages}`);
