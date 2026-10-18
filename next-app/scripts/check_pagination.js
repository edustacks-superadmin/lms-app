const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, 'scraped_html', 'batches_101_to_110.html');
const content = fs.readFileSync(filePath, 'utf8');

// Load content into Cheerio. 
// Note: File contains multiple HTML docs concatenated. Cheerio might only parse the first one effectively if we just pass the whole string.
// We should extract one batch's HTML.
const batchStart = content.indexOf('<!-- ========================= BATCH 708 START');
const batchEnd = content.indexOf('<!-- ========================= BATCH 708 END');

if (batchStart === -1) {
    console.log('Batch 708 not found');
    process.exit(1);
}

const batchHtml = content.substring(batchStart, batchEnd !== -1 ? batchEnd : undefined);
const $ = cheerio.load(batchHtml);

console.log('--- Checking Batch 708 ---');

// Check for links with ?page=
const pageLinks = $('a[href*="page="]');
console.log(`Found ${pageLinks.length} links with "page=":`);
pageLinks.each((i, el) => {
    console.log(`- Text: "${$(el).text().trim()}", Href: "${$(el).attr('href')}"`);
});

// Check for "Next" button/link
const nextLink = $('a:contains("Next"), button:contains("Next")');
console.log(`Found ${nextLink.length} elements with "Next":`);
nextLink.each((i, el) => {
    console.log(`- Tag: ${el.tagName}, Text: "${$(el).text().trim()}"`);
    console.log(`- HTML: ${$.html(el)}`);
    console.log(`- Attributes:`, el.attribs);
});

// Check for table rows
const rows = $('table tr');
console.log(`Found ${rows.length} table rows (including header)`);

// Check for specific pagination classes often used
const pagination = $('.pagination, .pages, [aria-label="Pagination"]');
if (pagination.length > 0) {
    console.log('Found pagination container:', pagination.html().substring(0, 100) + '...');
} else {
    console.log('No standard pagination container found.');
}

