const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

async function main() {
    let excelPath = path.join(process.cwd(), '..', 'testpress_data.xlsx');
    if (!fs.existsSync(excelPath)) {
        excelPath = path.join(process.cwd(), 'testpress_data.xlsx');
    }
    if (!fs.existsSync(excelPath)) {
        console.error('Error: file not found.');
        return;
    }

    console.log('Reading Excel file...');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read as Array of Arrays to handle dynamic options
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`Total rows in Excel: ${rows.length}`);
}

main().catch(console.error);
