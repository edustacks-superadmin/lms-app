const XLSX = require('xlsx');
try {
    const workbook = XLSX.readFile('member.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('Total rows:', data.length);
} catch (e) {
    console.error(e);
}
