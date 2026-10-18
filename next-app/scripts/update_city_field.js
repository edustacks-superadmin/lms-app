const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing via process.env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// List of major Indian cities
const INDIAN_CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat",
    "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam",
    "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad",
    "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad",
    "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Howrah", "Ranchi", "Gwalior", "Jabalpur",
    "Coimbatore", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh",
    "Solapur", "Hubli-Dharwad", "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur",
    "Gurgaon", "Moradabad", "Jalandhar", "Bhubaneswar", "Salem", "Warangal", "Mira-Bhayandar",
    "Jalgaon", "Guntur", "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner",
    "Amravati", "Noida", "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore",
    "Bhavnagar", "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer",
    "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar", "Jammu",
    "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum", "Ambattur", "Tirunelveli", "Malegaon",
    "Gaya", "Udaipur", "Kakinada", "Davanagere", "Kozhikode", "Maheshtala", "Rajpur Sonarpur",
    "Rajahmundry", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur", "Agartala",
    "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur", "Dhule", "Rohtak", "Korba",
    "Bhilwara", "Berhampur", "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa",
    "Kamarhati", "Sambalpur", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur", "Shivamogga",
    "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman", "Kulti", "Nizamabad", "Parbhani",
    "Tumkur", "Khammam", "Ozhukarai", "Bihar Sharif", "Panipat", "Darbhanga", "Bally", "Aizawl",
    "Dewas", "Ichalkaranji", "Karnal", "Bathinda", "Jalna", "Eluru", "Barasat", "Kirari Suleman Nagar",
    "Purnia", "Satna", "Mau", "Sonipat", "Farrukhabad", "Sagar", "Rourkela", "Durg", "Imphal",
    "Ratlam", "Hapur", "Arrah", "Anantapur", "Karimnagar", "Etawah", "Ambernath", "North Dumdum",
    "Bharatpur", "Begusarai", "New Delhi", "Gandhidham", "Baranagar", "Tirupati", "Pondicherry",
    "Sikar", "Thoothukudi", "Rewa", "Mirzapur", "Raichur", "Pali", "Ramagundam", "Silchar", "Haridwar",
    "Vijayanagaram", "Tenali", "Nagercoil", "Sri Ganganagar", "Karawal Nagar", "Mango", "Thanjavur",
    "Bulandshahr", "Uluberia", "Katni", "Sambhal", "Singrauli", "Nadiad", "Secunderabad", "Naihati",
    "Yamunanagar", "Bidhan Nagar", "Pallavaram", "Bidar", "Munger", "Panchkula", "Burhanpur", "Raurkela Industrial Township",
    "Kharagpur", "Dindigul", "Gandhinagar", "Hospet", "Nangloi Jat", "Malda", "Ongole", "Deoghar",
    "Chapra", "Haldia", "Khandwa", "Nandyal", "Morena", "Amroha", "Anand", "Bhind", "Bhalswa Jahangir Pur",
    "Madhyamgram", "Bhiwani", "Berhampore", "Ambala", "Morbi", "Fatehpur", "Raebareli", "Khora", "Chittoor",
    "Bhusawal", "Orai", "Bahraich", "Vellore", "Mahesana", "Sambalpur", "Raiganj", "Sirsa", "Danapur",
    "Serampore", "Sultan Pur Majra", "Guna", "Jaunpur", "Panvel", "Shivpuri", "Surendranagar Dudhrej",
    "Unnao", "Hugli and Chinsurah", "Alappuzha", "Kottayam"
].sort().map(city => ({ label: city, value: city }));

async function updateCityField() {
    console.log('Updating City field to dropdown...');

    const { data: field, error: fetchError } = await supabase
        .from('registration_fields')
        .select('id')
        .eq('field_key', 'city')
        .single();

    if (fetchError) {
        console.error('Error fetching city field:', fetchError);
        return;
    }

    if (!field) {
        console.error('City field not found!');
        return;
    }

    const { error: updateError } = await supabase
        .from('registration_fields')
        .update({
            field_type: 'select',
            field_options: INDIAN_CITIES
        })
        .eq('id', field.id);

    if (updateError) {
        console.error('Error updating city field:', updateError);
    } else {
        console.log('Successfully updated City field to dropdown with major Indian cities.');
    }
}

updateCityField();
