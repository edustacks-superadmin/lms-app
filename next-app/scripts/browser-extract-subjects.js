// ===================================================================
// TESTPRESS SUBJECT EXTRACTOR - Browser Console Script
// ===================================================================
// 
// HOW TO USE:
// 1. Go to: https://thapovaninstitute.testpress.in/admin/subjects/
// 2. Open Browser Console (F12)
// 3. Paste this entire script and press Enter
// 4. Wait for it to finish (it will auto-paginate)
// 5. Copy the JSON output and save to manual-subjects.json
// ===================================================================

(async function extractAllSubjects() {
    console.log('🚀 Starting subject extraction...\n');

    const allSubjects = [];
    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages) {
        console.log(`📄 Processing page ${currentPage}...`);

        // Extract subjects from current page
        const subjects = [];
        document.querySelectorAll('table tbody tr').forEach(row => {
            const nameCell = row.querySelector('td:first-child a');
            const questionLink = row.querySelector('a[href*="subject="]');

            if (nameCell && questionLink) {
                const name = nameCell.textContent.trim();
                const match = questionLink.href.match(/subject=(\d+)/);
                if (match) {
                    subjects.push({
                        name: name,
                        testpress_id: parseInt(match[1]),
                        parent_name: null  // You can manually set parent relationships later
                    });
                }
            }
        });

        console.log(`   Found ${subjects.length} subjects`);
        allSubjects.push(...subjects);

        // Check for next page
        const nextButton = document.querySelector('.pagination a:contains("Next"), .pagination a[rel="next"]');

        if (nextButton) {
            currentPage++;

            // Navigate to next page
            const nextUrl = nextButton.href;
            console.log(`   Moving to next page...`);

            // Load next page
            await new Promise((resolve) => {
                window.location.href = nextUrl;
                // Wait for page load
                window.addEventListener('load', resolve, { once: true });
            });

            // Small delay for page to settle
            await new Promise(r => setTimeout(r, 1000));
        } else {
            hasMorePages = false;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Extraction complete!`);
    console.log(`📊 Total subjects found: ${allSubjects.length}`);
    console.log('='.repeat(50));

    // Output as formatted JSON
    const jsonOutput = JSON.stringify(allSubjects, null, 2);

    console.log('\n📋 Copy this JSON:');
    console.log(jsonOutput);

    // Copy to clipboard
    try {
        await navigator.clipboard.writeText(jsonOutput);
        console.log('\n✅ JSON copied to clipboard!');
        console.log('   Paste it into manual-subjects.json');
    } catch (err) {
        console.log('\n⚠️  Could not copy to clipboard, please copy manually');
    }

    return allSubjects;
})();
