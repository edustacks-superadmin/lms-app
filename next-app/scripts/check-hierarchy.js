const fs = require('fs');
const path = require('path');

function loadEnv(filename) {
    try {
        const envPath = path.resolve(__dirname, '..', filename);
        if (!fs.existsSync(envPath)) return;
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w_.]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    } catch (e) { }
}
loadEnv('.env');
loadEnv('.env.local');
async function checkChapterHierarchy() {
    const baseUrl = process.env.TESTPRESS_BASE_URL || 'https://maheshiesacademy.testpress.in';
    const username = process.env.TESTPRESS_USERNAME;
    const password = process.env.TESTPRESS_PASSWORD;

    // Get Token
    const tokenRes = await fetch(`${baseUrl}/api/v2.5/auth-token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!tokenRes.ok) {
        console.error(`Token Error: ${tokenRes.status}`);
        return;
    }
    const { token } = await tokenRes.json();
    const authHeader = `JWT ${token}`;

    console.log(`Username length: ${username?.length}, Password length: ${password?.length}`);
    console.log(`Base URL: ${baseUrl}`);

    // 1. Get a course
    console.log('Fetching courses...');
    const coursesRes = await fetch(`${baseUrl}/api/v2.5/admin/courses/`, { headers: { Authorization: authHeader } });
    if (!coursesRes.ok) {
        console.error(`Courses API Error: ${coursesRes.status} ${await coursesRes.text()}`);
        return;
    }
    const courses = await coursesRes.json();
    console.log('Courses response keys:', Object.keys(courses));

    if (!courses.results || courses.results.length === 0) {
        console.log('No courses found or results key missing.');
        if (Array.isArray(courses)) {
            const course = courses[0];
            // handle array response
        }
        return;
    }
    // Verify specific chapter 1954 (Book Back MCQs)
    console.log('\n--- Inspecting Book Back MCQs (ID 1954) ---');
    // Using list search since direct ID might fail
    const target2 = courses.results.find(c => c.title.includes('398'));
    if (target2) {
        const chUrl = `${baseUrl}/api/v2.5/admin/courses/${target2.id}/chapters/`;
        const chRes = await fetch(chUrl, { headers: { Authorization: authHeader } });
        const chData = await chRes.json();

        const mcqChapter = chData.results.find(c => c.id === 1954);
        if (mcqChapter) {
            console.log(`Found 1954: ${mcqChapter.name}`);
            console.log(`Parent URL: ${mcqChapter.parent_url}`);
            console.log(`Children URL: ${mcqChapter.children_url}`);
        } else {
            console.log('Chapter 1954 not found in list.');
        }
    }
    // Find target course
    const targetCourse = courses.results.find(c => c.title.includes('398'));

    if (targetCourse) {
        console.log(`\nFound Target Course: ${targetCourse.title} (${targetCourse.id})`);
        const chaptersUrl = `${baseUrl}/api/v2.5/admin/courses/${targetCourse.id}/chapters/`;
        const chaptersRes = await fetch(chaptersUrl, { headers: { Authorization: authHeader } });
        const chapters = await chaptersRes.json();

        console.log(`Found ${chapters.results?.length} chapters for target course.`);

        // Dump first few to see if any have parents
        chapters.results.slice(0, 5).forEach(ch => {
            console.log(`\nID: ${ch.id} | Name: ${ch.name} | Parent URL: ${ch.parent_url} | Children URL: ${ch.children_url}`);
        });

        const child = chapters.results.find(ch => ch.parent_url !== null);
        if (child) {
            console.log(`\nExample Child: ${child.name} | Parent URL: ${child.parent_url}`);
        }
    } else {
        console.log('Target course not found in first page results.');
    }
}

checkChapterHierarchy().catch(console.error);
