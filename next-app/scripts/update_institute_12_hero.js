const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INSTITUTE_ID = 12;
const IMAGE_URL = '/assets/images/mahesh_medico_hero.png';

async function main() {
    console.log(`Updating Hero Image for Institute ID: ${INSTITUTE_ID}`);

    // Try finding existing home settings or create/update
    // Note: Schema has `home_settings` with `institute_id` (BigInt)

    // Using raw query or findFirst depending on schema capabilities for BigInt
    // Let's try findFirst
    const settings = await prisma.home_settings.findFirst({
        where: {
            institute_id: INSTITUTE_ID
        }
    });

    if (settings) {
        console.log('Found existing settings, updating...');
        await prisma.home_settings.update({
            where: {
                id: settings.id
            },
            data: {
                hero_banner_image: IMAGE_URL
            }
        });
        console.log('Updated successfully.');
    } else {
        console.log('No settings found, creating new...');
        // Need to provide defaults if creating
        await prisma.home_settings.create({
            data: {
                institute_id: INSTITUTE_ID,
                hero_banner_image: IMAGE_URL,
                signup_link_text: 'Sign Up',
                hero_title: 'Welcome to Mahesh Medico Academy',
                hero_subtitle: 'Learn. Master. Achieve.',
                hero_cta_text: 'Explore Courses',
                hero_cta_link: '/courses'
            }
        });
        console.log('Created successfully.');
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
