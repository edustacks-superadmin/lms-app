const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Subject -> Parent mapping from Testpress table
const subjectParentMap = {
    "Earthquake Resistant Buildings": "Civil",
    "GT3": "Civil",
    "Theory of Architecture": "Architecture Engineering",
    "Highway Engineering": "Civil",
    "FM": "Civil",
    "Surveying": "Civil",
    "Strength of Materials": "Civil",
    "GT15": "Civil",
    "SOM4": "Civil",
    "SS7": "Civil",
    "Construction Technology & Project Management": "Architecture Engineering",
    "Noise Pollution": "Civil",
    "SA7": "Civil",
    "SOM10": "Civil",
    "SOM13": "Civil",
    "SS10": "Civil",
    "SA3": "Civil",
    "SS4": "Civil",
    "GT16": "Civil",
    "GT6": "Civil",
    "Hydro ch 7": "Civil",
    "Irri ch 7": "Civil",
    "Irri ch 8": "Civil",
    "SOM6": "Civil",
    "SS5": "Civil",
    "Professional Ethics & Tools for Practice": "Architecture Engineering",
    "SS3": "Civil",
    "GT14": "Civil",
    "GT7": "Civil",
    "Hydro ch 3": "Civil",
    "Irri ch 3": "Civil",
    "RCC CH 7": "Civil",
    "SA6": "Civil",
    "SOM16": "Civil",
    "GT10": "Civil",
    "RCC CH 2": "Civil",
    "Hydro ch 2": "Civil",
    "SS1": "Civil",
    "SS6": "Civil",
    "GT4": "Civil",
    "Hydro ch 4": "Civil",
    "SS9": "Civil",
    "Electrical and Electronics Engineering": "Mech Engg",
    "GT2": "Civil",
    "RCC CH 8": "Civil",
    "SA4": "Civil",
    "SOM12": "Civil",
    "SOM15": "Civil",
    "Irri ch 2": "Civil",
    "Irri ch 5": "Civil",
    "Irri ch 6": "Civil",
    "SOM5": "Civil",
    "Hydro ch 1": "Civil",
    "GT5": "Civil",
    "GT9": "Civil",
    "Hydro ch 5": "Civil",
    "Computer Applications": "Mech Engg",
    "Irri ch 4": "Civil",
    "SOM2": "Civil",
    "PM & Estimation": "Civil",
    "Production Technology": "Mech Engg",
    "RCC CH 4": "Civil",
    "Design of RCC & Steel Structures": "Civil",
    "GT11": "Civil",
    "BM-CP-CT": "Civil",
    "SOM7": "Civil",
    "Computer Integrated Manufacturing": "Mech Engg",
    "Fluid Mechanics and Machinery": "Mech Engg",
    "GT8": "Civil",
    "RCC CH 6": "Civil",
    "Heat Power Engineering": "Mech Engg",
    "Hydraulics & WRE": "Civil",
    "RCC CH 5": "Civil",
    "SA1": "Civil",
    "Solid Waste Management": "Civil",
    "SS2": "Civil",
    "GT13": "Civil",
    "SA5": "Civil",
    "SOM11": "Civil",
    "Mechanics of Materials": "Mech Engg",
    "RCC CH 1": "Civil",
    "Irri Ch 1": "Civil",
    "SOM9": "Civil",
    "SA2": "Civil",
    "Industrial Management": "Mech Engg",
    "RCC CH 3": "Civil",
    "Hydro ch 6": "Civil",
    "SOM3": "Civil",
    "GT1": "Civil",
    "Transportation Engg": "Civil",
    "GT12": "Civil",
    "PSC": "Civil",
    "SOM1": "Civil",
    "Traffic Engineering": "Civil",
    "Industrial Engineering": "Mech Engg",
    "Design of Machine Elements": "Mech Engg",
    "GPS": "Civil",
    "Harbours and Docks": "Civil",
    "OCF": "Civil",
    "Buildings & Drainage": "Civil",
    "Bridge Engineering": "Civil",
    "Heat & Mass Transfer": "Mech Engg",
    "Airport Engineering": "Civil",
    "Air Pollution": "Civil",
    "CAD": "Civil",
    "Total Station": "Civil",
    "Foundation Engineering": "Civil",
    "Estimating, Costing and Valuation": "Civil",
    "Environmental Engg": "Civil",
    "Concrete Technology": "Civil",
    "HM": "Civil",
    "Engineering Drawing": "Civil",
    "Hydrology": "Civil",
    "Construction Practice": "Civil",
    "Project Management": "Civil",
    "Soil mechanics": "Civil",
    "Railway Engineering": "Civil",
    "Structural Analysis": "Civil",
    "EE-1": "Civil",
    "Geotech": "Civil",
    "EE-2": "Civil",
    "RCC": "Civil",
    "IE": "Civil",
    "Steel structures": "Civil",
    "Building Materials": "Civil",
    // General Studies children
    "Botany": "General Studies",
    "Current Affairs": "General Studies",
    "Science & Technology": "General Studies",
    "#Modern History": "General Studies",
    "Biology": "General Studies",
    "Physics": "General Studies",
    "Chemistry": "General Studies",
    "General Intelligence & Reasoning": "General Studies",
    "GK": "General Studies",
    "Geography": "General Studies",
    "Economy": "General Studies",
    "Polity": "General Studies",
    "History": "General Studies",
    "#Ancient History": "General Studies",
    "#medieval India": "General Studies",
    "General Science": "General Studies",
    // Reasoning children
    "Non-Verbal": "Reasoning",
    "Clerical Aptitude": "Reasoning",
    "Verbal": "Reasoning",
    // Self-referential (keep as top-level)
    "Puzzles": null,
    "Area": null,
    "Volume": null,
    "Number Series": null,
    "Alpha-numeric Reasoning": null,
    "Compound Interest": null,
    "Ratio and Proportion": null,
    "Time and Work": null,
    "Simple Interest": null,
    "Logical Reasoning": null,
    "Percentage": null,
    "Highest Common Factor (HCF) - Lowest Common Multiple (LCM)": null,
    "Simplification": null,
    "General Aptitude": null,
    "SSC JE GI": null,
    "Autocad": null,
    "OPSC": null,
    "Thermodynamics": "Mech Engg",
    "QA": null,
    "Mathematics": null,
    "Engineering Mechanics": null,
    "Engineering Mathematics": null,
    "Material Science": null,
    "Quantitative Aptitude": null,
    "CE": null,
    "தமிழ்மொழி": null,
    "Field Surveyor": null,
    "Draftsman": null,
    "SAD": null,
    "Architecture Engineering": null,
    "Mech Engg": null,
    "Civil": null,
    "General Studies": null,
    "Reasoning": null,
    "HM": null,
    "EE-1": null,
    "EE-2": null,
    "Physics": null,
    "Polity": null,
    "General Science": null,
    "Mechanics of structure": null,
    "Traffic Engineering": null,
    "Bridge Engineering": null
};

async function updateParentRelationships() {
    try {
        console.log('🔄 Updating subject parent relationships...\n');

        let updated = 0;
        let notFound = 0;
        let errors = 0;

        for (const [subjectName, parentName] of Object.entries(subjectParentMap)) {
            try {
                // Find the subject
                const subject = await prisma.subjects.findFirst({
                    where: { name: subjectName }
                });

                if (!subject) {
                    console.log(`  ⚠️  Subject not found: ${subjectName}`);
                    notFound++;
                    continue;
                }

                // Find parent ID if parent name is provided
                let parentId = null;
                if (parentName) {
                    const parent = await prisma.subjects.findFirst({
                        where: { name: parentName }
                    });

                    if (parent) {
                        parentId = parent.id;
                    } else {
                        console.log(`  ⚠️  Parent not found: ${parentName} for ${subjectName}`);
                    }
                }

                // Update the subject
                await prisma.subjects.update({
                    where: { id: subject.id },
                    data: { parent_id: parentId }
                });

                if (parentName) {
                    console.log(`  ✅ ${subjectName} → ${parentName}`);
                } else {
                    console.log(`  📍 ${subjectName} → (top-level)`);
                }
                updated++;

            } catch (error) {
                console.error(`  ❌ Error updating ${subjectName}: ${error.message}`);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📈 UPDATE SUMMARY');
        console.log('='.repeat(50));
        console.log(`✅ Updated:     ${updated}`);
        console.log(`⚠️  Not found:   ${notFound}`);
        console.log(`❌ Errors:      ${errors}`);
        console.log('='.repeat(50));

        console.log('\n✅ Parent relationships updated!');

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

updateParentRelationships();
