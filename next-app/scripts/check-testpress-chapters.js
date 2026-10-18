require('dotenv').config({ path: '.env.local' });

async function checkTestpressChapters() {
    const baseUrl = 'https://maheshiesacademy.testpress.in';
    const username = process.env.TESTPRESS_USERNAME;
    const password = process.env.TESTPRESS_PASSWORD;

    // Get all courses first
    const coursesResponse = await fetch(`${baseUrl}/api/v2.5/admin/courses/`, {
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        }
    });

    const coursesData = await coursesResponse.json();
    console.log(`Found ${coursesData.count} courses`);

    if (coursesData.results && coursesData.results.length > 0) {
        const firstCourse = coursesData.results[0];
        console.log('\n=== First Course ===');
        console.log(`ID: ${firstCourse.id}, Title: ${firstCourse.title}`);

        // Get chapters for first course
        const chaptersResponse = await fetch(`${baseUrl}/api/v2.5/admin/courses/${firstCourse.id}/chapters/`, {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
            }
        });

        const chaptersData = await chaptersResponse.json();
        console.log(`\n=== Chapters for Course ${firstCourse.id} ===`);
        console.log(`Total chapters: ${chaptersData.count || chaptersData.length}`);

        if (chaptersData.results && chaptersData.results.length > 0) {
            console.log('\n=== First Chapter Fields ===');
            console.log(JSON.stringify(chaptersData.results[0], null, 2));
        } else if (Array.isArray(chaptersData) && chaptersData.length > 0) {
            console.log('\n=== First Chapter Fields ===');
            console.log(JSON.stringify(chaptersData[0], null, 2));
        }
    }
}

checkTestpressChapters().catch(console.error);
