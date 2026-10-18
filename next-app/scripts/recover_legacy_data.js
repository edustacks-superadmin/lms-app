
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const legacyStudents = [
    { reg: "0101013175", name: "Sathyapriya Karuna" },
    { reg: "0101037131", name: "subi sundar" },
    { reg: "0401008160", name: "Dhivin M" },
    { reg: "1901009130", name: "Saravana kumar" },
    { reg: "1001016189", name: "Ageshwaran N" },
    { reg: "18005093008", name: "Dharun" },
    { reg: "1501005192", name: "Kavya M" },
    { reg: "1805003046", name: "DHARMALINGAM DHARMA" },
    { reg: "1901001135", name: "Vidyalakshmi" },
    { reg: "0201012086", name: "AK" },
    { reg: "18005403008", name: "Dheen" },
    { reg: "26", name: "La" },
    { reg: "2001004539", name: "Kaleesh" },
    { reg: "18007009008", name: "Rague" },
    { reg: "0201003008", name: "Priya Sukumar" },
    { reg: "18003809988", name: "Tami" },
    { reg: "5", name: "L" },
    { reg: "0101053121", name: "Manikanda" },
    { reg: "45", name: "L" },
    { reg: "2601011268", name: "Ramkumar m" },
    { reg: "0601011228", name: "P.Thiruvenkatachalam" },
    { reg: "0101040152", name: "VENKATESH J" },
    { reg: "1901001137", name: "Swetha" },
    { reg: "1701007032", name: "dhinesh kumar" },
    { reg: "3301008181", name: "Abdul Wahaab" }
];

async function recover() {
    console.log('--- Recovering Legacy Data ---');
    const results = [];

    for (const student of legacyStudents) {
        // Search by name
        let { data: members, error } = await supabase
            .from('members')
            .select('registration_no:username, full_name:display_name, first_name, last_name, birth_date, phone_number')
            .or(`display_name.ilike.%${student.name}%,first_name.ilike.%${student.name}%,last_name.ilike.%${student.name}%,username.eq.${student.reg}`);

        if (error) {
            console.error(`Error searching for ${student.name}:`, error);
            continue;
        }

        if (members && members.length > 0) {
            members.forEach(m => {
                results.push({
                    original_name: student.name,
                    original_reg: student.reg,
                    found_name: m.full_name || `${m.first_name} ${m.last_name}`,
                    found_reg: m.registration_no,
                    dob: m.birth_date,
                    phone: m.phone_number
                });
            });
        } else {
            results.push({
                original_name: student.name,
                original_reg: student.reg,
                status: 'NOT_FOUND'
            });
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

recover();
