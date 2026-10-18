
const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(process.cwd(), 'testpress_data.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// Header is row 0
// Data starts row 1
const C_EXAMS = 2;

function checkRow(idx) {
    const row = rows[idx];
    if (!row) return console.log(`Row ${idx} is empty`);
    console.log(`--- Row ${idx} Analysis ---`);
    console.log('Question ID:', row[0]);
    console.log('Exams/Folders (Col 2):', JSON.stringify(row[C_EXAMS]));
}

checkRow(1);
checkRow(50000);
checkRow(68000);
checkRow(80000);
