const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'CTSE 10_2025 (Diploma_ITI Level) (Responses).xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet);

if (data.length > 0) {
    console.log('--- Excel Headers ---');
    console.log(Object.keys(data[0]));
    console.log('--- Sample Row ---');
    console.log(data[0]);
} else {
    console.log('Excel sheet is empty.');
}
