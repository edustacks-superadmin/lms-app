const fs = require('fs');
const path = require('path');

// Read the malformed JSON file
const content = fs.readFileSync(path.join(__dirname, '..', 'manual-subjects.json'), 'utf8');

// Split by array boundaries and merge
const arrays = content.split(/\]\s*\[/);
let allSubjects = [];

arrays.forEach((arrayStr, index) => {
    // Clean up the string
    let cleanStr = arrayStr.trim();

    // Add opening bracket if not first
    if (index > 0 && !cleanStr.startsWith('[')) {
        cleanStr = '[' + cleanStr;
    }

    // Add closing bracket if not last
    if (index < arrays.length - 1 && !cleanStr.endsWith(']')) {
        cleanStr = cleanStr + ']';
    }

    try {
        const parsed = JSON.parse(cleanStr);
        allSubjects = allSubjects.concat(parsed);
    } catch (err) {
        console.log(`Warning: Could not parse array ${index + 1}`);
    }
});

console.log(`✅ Merged ${allSubjects.length} total subjects from multiple arrays`);

// Now update parent relationships for Civil sub-subjects
const civilSubjectNames = [
    "BM-CP-CT",
    "Buildings & Drainage",
    "CAD",
    "Design of RCC & Steel Structures",
    "Engineering Drawing",
    "Environmental Engg",
    "Geotech",
    "Hydraulics & WRE",
    "PM & Estimation",
    "Strength of Materials",
    "Structural Analysis",
    "Surveying",
    "Transportation Engg"
];

let updatedCount = 0;
allSubjects.forEach(subject => {
    if (civilSubjectNames.includes(subject.name)) {
        subject.parent_name = "Civil";
        updatedCount++;
    }
});

console.log(`✅ Updated ${updatedCount} subjects to have "Civil" as parent`);

// Remove duplicates by testpress_id
const uniqueSubjects = [];
const seenIds = new Set();

allSubjects.forEach(subject => {
    if (!seenIds.has(subject.testpress_id)) {
        uniqueSubjects.push(subject);
        seenIds.add(subject.testpress_id);
    }
});

console.log(`✅ Removed ${allSubjects.length - uniqueSubjects.length} duplicates`);
console.log(`📊 Final count: ${uniqueSubjects.length} unique subjects`);

// Sort by testpress_id for easier management
uniqueSubjects.sort((a, b) => a.testpress_id - b.testpress_id);

// Write back to file
fs.writeFileSync(
    path.join(__dirname, '..', 'manual-subjects.json'),
    JSON.stringify(uniqueSubjects, null, 2)
);

console.log('\n✅ Fixed JSON file!');
console.log('   - Merged all arrays into one');
console.log('   - Set parent_name="Civil" for civil sub-subjects');
console.log('   - Removed duplicates');
console.log('   - Sorted by ID');
console.log('\nReady to import! Run: node scripts/import-manual-subjects.js');
