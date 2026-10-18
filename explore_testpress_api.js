// Test script to explore Testpress API structure
import fs from 'fs';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function exploreAPI() {
    console.log('\n=== EXPLORING TESTPRESS API STRUCTURE ===\n');

    // 1. Fetch one exam
    const examUrl = 'https://thapovaninstitute.testpress.in/api/v2.3/exams/m-01-2/';
    console.log(`Fetching exam: ${examUrl}`);

    try {
        const examResponse = await fetch(examUrl, {
            headers: { 'Authorization': `JWT ${token}` }
        });

        if (!examResponse.ok) {
            console.error(`Failed to fetch exam: ${examResponse.status} ${examResponse.statusText}`);
            return;
        }

        const exam = await examResponse.json();
        console.log('\n✅ Exam fetched successfully!');
        console.log(`Title: ${exam.title}`);
        console.log(`Slug: ${exam.slug}`);
        console.log(`Number of questions: ${exam.number_of_questions}`);

        // Save full exam structure
        fs.writeFileSync('debug_exam_full.json', JSON.stringify(exam, null, 2));
        console.log('✅ Full exam saved to debug_exam_full.json');

        // 2. Try different question endpoint variations
        const questionEndpoints = [
            `${examUrl}questions/`,
            `https://thapovaninstitute.testpress.in/api/v2.3/exams/${exam.slug}/questions/`,
            `https://thapovaninstitute.testpress.in/api/v2.5/exams/${exam.slug}/questions/`,
            `https://thapovaninstitute.testpress.in/api/v2.3/exams/${exam.id}/questions/`,
            `https://thapovaninstitute.testpress.in/api/v2.3/questions/?exam=${exam.id}`,
            `https://thapovaninstitute.testpress.in/api/v2.3/questions/?exam=${exam.slug}`,
        ];

        console.log('\n\n=== TESTING QUESTION ENDPOINTS ===\n');

        for (const endpoint of questionEndpoints) {
            console.log(`\nTrying: ${endpoint}`);

            try {
                const response = await fetch(endpoint, {
                    headers: { 'Authorization': `JWT ${token}` }
                });

                console.log(`Status: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ SUCCESS!`);
                    console.log(`Response keys: ${Object.keys(data).join(', ')}`);

                    if (data.results) {
                        console.log(`Number of results: ${data.results.length}`);
                        if (data.results.length > 0) {
                            fs.writeFileSync('debug_questions_response.json', JSON.stringify(data, null, 2));
                            console.log('✅ Questions response saved to debug_questions_response.json');

                            // Show first question structure
                            console.log('\n📝 First question structure:');
                            console.log(JSON.stringify(data.results[0], null, 2).substring(0, 500) + '...');
                            break; // Found it!
                        }
                    }
                    if (data.count !== undefined) {
                        console.log(`Total count: ${data.count}`);
                    }
                }
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('\n=== EXPLORATION COMPLETE ===\n');
}

exploreAPI();
