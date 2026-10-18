const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tagsData = {
    'Subject': [
        '#PhysicsDerivations',
        '#OrganicChemistry',
        '#NCERTBiology',
        '#FormulaSheet',
        '#ImportantDiagrams',
        '#PhysicalChemistryNumericals'
    ],
    'Exam': [
        '#NEET2026',
        '#NTAUpdate',
        '#AdmitCard',
        '#CutOffMarks',
        '#ExamPattern',
        '#SyllabusReductions'
    ],
    'Resource': [
        '#DownloadPDF',
        '#DailyQuiz',
        '#HandwrittenNotes',
        '#QuestionBank',
        '#VideoSolutions'
    ]
};

const INSTITUTE_ID = 12;

async function main() {
    console.log(`Adding tags for Institute ID: ${INSTITUTE_ID}`);

    for (const [type, tags] of Object.entries(tagsData)) {
        console.log(`Processing group: ${type}`);
        for (const tagName of tags) {
            // Remove hash for storage if preferred, OR keep it.
            // User provided with hash. I will keep it as user requested "Add these tags".
            // Typically tags are stored without hash and hash is added in UI, but if user specifically wrote #Tag, I'll store #Tag.
            // Actually, usually tags define the slug.
            // Let's store exact string provided.

            const existing = await prisma.tags.findFirst({
                where: {
                    name: tagName,
                    institute_id: INSTITUTE_ID,
                    type: type
                }
            });

            if (existing) {
                console.log(`Tag already exists: ${tagName}`);
            } else {
                await prisma.tags.create({
                    data: {
                        name: tagName,
                        institute_id: INSTITUTE_ID,
                        type: type,
                        color: getGroupColor(type)
                    }
                });
                console.log(`Added tag: ${tagName}`);
            }
        }
    }
}

function getGroupColor(type) {
    switch (type) {
        case 'Subject': return '#4CAF50'; // Green
        case 'Exam': return '#F44336'; // Red
        case 'Resource': return '#2196F3'; // Blue
        default: return '#9E9E9E';
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
