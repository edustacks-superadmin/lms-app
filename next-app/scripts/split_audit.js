
const fs = require('fs');

const students = JSON.parse(fs.readFileSync('scripts/audit_students.json', 'utf-8'));
const BATCH_SIZE = Math.ceil(students.length / 4);

for (let i = 0; i < 4; i++) {
    const batch = students.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    fs.writeFileSync(`scripts/audit_batch_${i}.json`, JSON.stringify(batch, null, 2));
    console.log(`Created batch ${i} with ${batch.length} students`);
}
