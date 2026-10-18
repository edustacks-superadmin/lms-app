
const mapCommunity = (officialComm) => {
    if (!officialComm) return '';
    const norm = officialComm.toUpperCase().trim();

    // ORIGINAL LOGIC (SIMULATED) - To prove failure before fix, I'll comment out the fix first or just run this to see current behavior if I were running the actual component. 
    // But since this is a standalone script, I want to test the *intended* logic vs *broken* logic.
    
    // Broken Logic (current implementation in ExternalResultForm.jsx)
    /*
    if (norm.includes('MBC') || norm.includes('DNC')) return 'MBC';
    if (norm.includes('BCM')) return 'BCM'; // <--- This catches BC(OBCM)
    if (norm.includes('BC')) return 'BC';
    */

    // FIXED Logic
    if (norm.includes('MBC') || norm.includes('DNC')) return 'MBC';
    
    // Fix: Check for BC(OBCM) specifically BEFORE BCM
    if (norm.includes('BC(OBCM)') || norm.includes('BC (OBCM)')) return 'BC';
    
    if (norm.includes('BCM')) return 'BCM';
    if (norm.includes('BC')) return 'BC';
    if (norm.includes('SC(A)')) return 'SCA';
    if (norm.includes('SC')) return 'SC';
    if (norm.includes('ST')) return 'ST';
    if (norm.includes('GT')) return 'GT';

    return norm;
};

const testCases = [
    { input: 'BC(OBCM)', expected: 'BC' },
    { input: 'BCM', expected: 'BCM' },
    { input: 'BC', expected: 'BC' },
    { input: 'MBC/DNC', expected: 'MBC' },
    { input: 'SC', expected: 'SC' },
    { input: 'SC(A)', expected: 'SCA' },
    { input: 'GT', expected: 'GT' }
];

console.log('Running Community Mapping Tests...');
let failures = 0;

testCases.forEach(({ input, expected }) => {
    const result = mapCommunity(input);
    if (result !== expected) {
        console.error(`❌ FAIL: Input "${input}" -> Expected "${expected}", but got "${result}"`);
        failures++;
    } else {
        console.log(`✅ PASS: Input "${input}" -> "${result}"`);
    }
});

if (failures === 0) {
    console.log('\n🎉 All tests passed!');
} else {
    console.error(`\n💀 ${failures} tests failed.`);
    process.exit(1);
}
