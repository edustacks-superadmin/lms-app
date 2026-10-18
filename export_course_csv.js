import fs from 'fs';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

async function exportCourseContent() {
    console.log('Finding course...');
    let currentUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/`;
    let course = null;

    // Search for course by title (specific keyword)
    const keyword = '398';

    while (currentUrl) {
        const res = await fetch(currentUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        const data = await res.json();

        course = data.results.find(c => c.title.includes(keyword));

        if (course) break;
        currentUrl = data.next;
    }

    if (!course) {
        console.log('❌ Course not found.');
        return;
    }

    console.log(`✅ Found Course: "${course.title}" (ID: ${course.id})`);

    // Fetch Chapters
    console.log('Fetching chapters...');
    let chapters = [];
    let chaptersUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/courses/${course.id}/chapters/`;

    while (chaptersUrl) {
        const res = await fetch(chaptersUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
        const data = await res.json();
        chapters = chapters.concat(data.results);
        chaptersUrl = data.next;
    }

    console.log(`Found ${chapters.length} chapters.`);

    // Prepare CSV data
    const csvRows = ['Chapter Order,Chapter Title,Content Order,Content Title,Content Type,URL,Exam ID'];

    for (const chapter of chapters) {
        // Fetch contents for each chapter
        let contentsUrl = chapter.contents_url || `${TESTPRESS_BASE_URL}api/v2.5/admin/chapters/${chapter.id}/contents/`;
        let contents = [];

        try {
            while (contentsUrl) {
                const res = await fetch(contentsUrl, { headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` } });
                if (!res.ok) break;
                const data = await res.json();
                contents = contents.concat(data.results);
                contentsUrl = data.next;
            }
        } catch (e) {
            console.log(`   ⚠️ Could not fetch contents for chapter ${chapter.id}`);
        }

        if (contents.length === 0) {
            // Escape quotes in title
            const safeTitle = (chapter.name || chapter.title || '').replace(/"/g, '""');
            csvRows.push(`${chapter.order},"${safeTitle}",,,,`);
        } else {
            for (const content of contents) {
                const type = content.exam ? 'Exam' : (content.video ? 'Video' : (content.attachment ? 'File' : 'Html'));
                const url = content.video ? content.video.url : (content.attachment ? content.attachment.attachment_url : '');
                const examId = content.exam ? content.exam.id : '';

                const safeChapterTitle = (chapter.name || chapter.title || '').replace(/"/g, '""');
                const safeContentTitle = (content.name || content.title || '').replace(/"/g, '""');

                csvRows.push(`${chapter.order},"${safeChapterTitle}",${content.order},"${safeContentTitle}",${type},"${url}",${examId}`);
            }
        }
    }

    const filename = `course_${course.id}_content.csv`;
    fs.writeFileSync(filename, csvRows.join('\n'));
    console.log(`\n✅ Saved to ${filename}`);
}

exportCourseContent();
