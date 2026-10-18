// Indian States and Union Territories in ISO 3166-2:IN format
// Reference: https://en.wikipedia.org/wiki/ISO_3166-2:IN

export const INDIAN_STATES = [
    { code: 'IN-AP', name: 'Andhra Pradesh' },
    { code: 'IN-AR', name: 'Arunachal Pradesh' },
    { code: 'IN-AS', name: 'Assam' },
    { code: 'IN-BR', name: 'Bihar' },
    { code: 'IN-CT', name: 'Chhattisgarh' },
    { code: 'IN-GA', name: 'Goa' },
    { code: 'IN-GJ', name: 'Gujarat' },
    { code: 'IN-HR', name: 'Haryana' },
    { code: 'IN-HP', name: 'Himachal Pradesh' },
    { code: 'IN-JH', name: 'Jharkhand' },
    { code: 'IN-KA', name: 'Karnataka' },
    { code: 'IN-KL', name: 'Kerala' },
    { code: 'IN-MP', name: 'Madhya Pradesh' },
    { code: 'IN-MH', name: 'Maharashtra' },
    { code: 'IN-MN', name: 'Manipur' },
    { code: 'IN-ML', name: 'Meghalaya' },
    { code: 'IN-MZ', name: 'Mizoram' },
    { code: 'IN-NL', name: 'Nagaland' },
    { code: 'IN-OR', name: 'Odisha' },
    { code: 'IN-PB', name: 'Punjab' },
    { code: 'IN-RJ', name: 'Rajasthan' },
    { code: 'IN-SK', name: 'Sikkim' },
    { code: 'IN-TN', name: 'Tamil Nadu' },
    { code: 'IN-TG', name: 'Telangana' },
    { code: 'IN-TR', name: 'Tripura' },
    { code: 'IN-UP', name: 'Uttar Pradesh' },
    { code: 'IN-UT', name: 'Uttarakhand' },
    { code: 'IN-WB', name: 'West Bengal' },
    // Union Territories
    { code: 'IN-AN', name: 'Andaman and Nicobar Islands' },
    { code: 'IN-CH', name: 'Chandigarh' },
    { code: 'IN-DN', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { code: 'IN-DL', name: 'Delhi' },
    { code: 'IN-JK', name: 'Jammu and Kashmir' },
    { code: 'IN-LA', name: 'Ladakh' },
    { code: 'IN-LD', name: 'Lakshadweep' },
    { code: 'IN-PY', name: 'Puducherry' }
];

// Helper function to get state name from code
export const getStateName = (code) => {
    const state = INDIAN_STATES.find(s => s.code === code);
    return state ? state.name : code;
};

// Helper function to get state code from name
export const getStateCode = (name) => {
    const state = INDIAN_STATES.find(s => s.name.toLowerCase() === name.toLowerCase());
    return state ? state.code : name;
};
