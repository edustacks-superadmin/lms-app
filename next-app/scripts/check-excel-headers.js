
const xlsx = require('xlsx');
const path = require('path');

const excelPath = path.join(process.cwd(), 'testpress_data.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Get headers
const headers = [];
const range = xlsx.utils.decode_range(sheet['!ref']);
const R = range.s.r; // First row
for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[xlsx.utils.encode_cell({ r: R, c: C })];
    // console.log(`Col ${C}:`, cell ? cell.v : undefined);
    if (cell && cell.v) headers.push({ colIndex: C, name: cell.v });
}

console.log('Headers found:', headers);

// Peek at first row of data (Row Index 1 if headers are 0)
const firstRow = [];
for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = sheet[xlsx.utils.encode_cell({ r: R + 1, c: C })];
    if (cell && cell.v) firstRow.push({ colIndex: C, val: String(cell.v).substring(0, 50) + '...' });
}
console.log('First Data Row Snippet:', firstRow);
