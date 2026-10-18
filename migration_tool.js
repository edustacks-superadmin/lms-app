import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';
import path from 'path';

// ==========================================
// CONFIGURATION
// ==========================================

// Supabase Config
const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

// Testpress Config (Default)
const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const DEFAULT_PASSWORD = 'TestpressUser123';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CLI Interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// ==========================================
// UTILS
// ==========================================

function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell);
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
}

async function fetchFromTestpress(endpoint, params = '', version = 'v2.5') {
    // Build URL properly - don't add trailing slash if endpoint already has query params
    let url;
    if (endpoint.includes('?')) {
        // Endpoint already has query params, don't add trailing slash
        url = `${TESTPRESS_BASE_URL}api/${version}/${endpoint}${params}`;
    } else {
        // Normal endpoint without query params
        url = `${TESTPRESS_BASE_URL}api/${version}/${endpoint}/${params}`;
    }

    console.log(`   🌐 Fetching: ${url}`);
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error(`   ❌ API Error: ${e.message}`);
        return null;
    }
}

async function fetchSubjects() {
    const { data, error } = await supabase.from('subjects').select('id, name, parent_id');
    if (error) return [];
    return data;
}

async function getOrCreateSubject(subjectName, subjectMap, parentId = null) {
    if (!subjectName) return null;

    // Handle Hierarchy "Parent > Child"
    if (subjectName.includes('>')) {
        const parts = subjectName.split('>').map(s => s.trim());
        let currentParentId = null;

        for (const part of parts) {
            currentParentId = await getOrCreateSubject(part, subjectMap, currentParentId);
        }
        return currentParentId;
    }

    // 1. Check local map
    let existing = subjectMap.find(s =>
        s.name.toLowerCase() === subjectName.toLowerCase() &&
        (parentId ? s.parent_id === parentId : true)
    );

    if (existing) return existing.id;

    // 2. Create new subject
    console.log(`   ✨ Creating new subject: "${subjectName}" ${parentId ? `(under parent ${parentId})` : ''}...`);
    const newSubject = { name: subjectName, parent_id: parentId };

    const { data, error } = await supabase
        .from('subjects')
        .insert([newSubject])
        .select()
        .single();

    if (error) {
        console.error(`   ❌ Failed to create subject: ${error.message}`);
        return null;
    }

    // 3. Update map and return
    subjectMap.push(data);
    return data.id;
}

// ==========================================
// MAPPERS (The Transformation Layer)
// ==========================================

function mapUser(sourceData) {
    // 1. Identify Core Fields
    const email = sourceData.email;
    const username = sourceData.username || email?.split('@')[0];
    const firstName = sourceData.first_name || '';
    const lastName = sourceData.last_name || '';
    const name = sourceData.name || `${firstName} ${lastName}`.trim() || username;
    const phone = sourceData.phone_number || sourceData.mobile || sourceData.phone || '';

    // 2. Map Status
    let status = 'Student'; // Default role
    if (sourceData.is_staff) status = 'Staff';
    if (sourceData.is_superuser) status = 'Admin';

    // 3. Extract Custom Data (The Catch-All)
    // Add ALL fields we're mapping to the knownFields list so they don't go into custom_data
    const knownFields = [
        'email', 'username', 'first_name', 'last_name', 'name', 'display_name',
        'phone_number', 'mobile', 'phone',
        'birth_date', 'photo', 'mini_image', 'small_image', 'medium_image', 'large_image', 'x_small_image', 'medium_small_image',
        'address1', 'address2', 'address', 'city', 'state', 'state_code', 'zip',
        'gender', 'is_staff', 'is_superuser', 'is_active', 'is_blocked',
        'id', 'created', 'modified', 'report_card_url', 'password_hash'
    ];
    const customData = {};

    Object.keys(sourceData).forEach(key => {
        if (!knownFields.includes(key)) {
            customData[key] = sourceData[key];
        }
    });

    return {
        core: {
            id: sourceData.id, // Preserve Testpress user ID
            email,
            username,
            first_name: firstName,
            last_name: lastName,
            display_name: sourceData.display_name ||
                (firstName && lastName ? `${firstName} ${lastName}`.trim() : null) ||
                username ||
                email.split('@')[0],
            phone_number: phone,
            birth_date: sourceData.birth_date || null,
            photo_url: sourceData.photo || sourceData.medium_image || sourceData.small_image || null,
            address1: sourceData.address1 || sourceData.address || '',
            address2: sourceData.address2 || '',
            city: sourceData.city || '',
            state: sourceData.state ? sourceData.state.replace('IN-', '') : '', // "IN-TN" → "TN"
            state_code: sourceData.state || '', // Keep full "IN-TN" in state_code
            zip: sourceData.zip || '',
            gender: sourceData.gender || null,
            role: sourceData.is_staff || sourceData.is_superuser ? 'admin' : 'student',
            status: sourceData.is_active !== false ? 'active' : 'inactive',
            custom_data: customData,
            created_at: sourceData.created || new Date().toISOString(), // Actual join date from Testpress
            updated_at: sourceData.modified || new Date().toISOString()
        },
        original: sourceData
    };
}

function mapQuestion(sourceData) {
    // 1. Core Fields
    const questionText = sourceData.question_html || sourceData.question_text || '';
    const explanation = sourceData.explanation_html || sourceData.explanation || '';

    // 2. Subject Name (Resolution happens later)
    const subjectName = sourceData.subject || sourceData.subject_name || 'Uncategorized';

    // 3. Map Options
    // Testpress 'answers' -> Our 'options'
    let options = [];
    if (sourceData.answers && Array.isArray(sourceData.answers)) {
        const labels = ['a', 'b', 'c', 'd', 'e', 'f'];
        options = sourceData.answers.map((ans, index) => ({
            option_label: labels[index] || 'z',
            option_text: ans.answer_html || ans.text || '',
            is_correct: ans.is_correct || false
        }));
    } else {
        // Try flat CSV columns (option_a, option_b, etc.)
        const labels = ['a', 'b', 'c', 'd', 'e'];
        labels.forEach(label => {
            const optText = sourceData[`option_${label}`];
            if (optText) {
                options.push({
                    option_label: label,
                    option_text: optText,
                    is_correct: (sourceData.correct_option || '').toLowerCase() === label
                });
            }
        });
    }

    // 4. Map Difficulty
    const diffMap = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    const difficulty = diffMap[sourceData.difficulty] || 'Medium';

    // 5. Custom Data
    const knownFields = ['question_html', 'question_text', 'explanation_html', 'explanation', 'subject', 'answers', 'difficulty', 'tags', 'id', 'url'];
    const customData = {};
    Object.keys(sourceData).forEach(key => {
        if (!knownFields.includes(key)) customData[key] = sourceData[key];
    });

    return {
        question_text: questionText,
        explanation: explanation,
        subject_name_temp: subjectName, // Temporary field for resolution
        question_type: 'MCQ, Single Correct Question',
        difficulty_level: difficulty,
        options: options,
        tags: sourceData.tags || [],
        custom_data: customData
    };
}

// ==========================================
// IMPORTERS
// ==========================================

async function importUsers(sourceType) {
    console.log('\n🚀 Starting User Import...');
    let usersToProcess = [];

    if (sourceType === 'api') {
        console.log('   📡 Connecting to Testpress API...');

        // Ask for batch size
        const batchChoice = await question('   Import mode?\n   1. Import ALL users (~14,000)\n   2. Import in batches (safer)\n   Choose (1/2): ');

        let maxPages = Infinity;
        if (batchChoice === '2') {
            const pagesInput = await question('   How many pages to import? (1 page = ~20 users, default: 5): ');
            maxPages = parseInt(pagesInput) || 5;
            console.log(`   ℹ️  Will import up to ${maxPages} pages (~${maxPages * 20} users)`);
        }

        // Fetch ALL users with pagination
        let nextUrl = 'admin/users';
        let pageNum = 1;

        while (nextUrl && pageNum <= maxPages) {
            console.log(`   📄 Fetching page ${pageNum}/${maxPages === Infinity ? '?' : maxPages}...`);
            const data = await fetchFromTestpress(nextUrl.replace('admin/users/', 'admin/users'));

            if (data && data.results) {
                usersToProcess = usersToProcess.concat(data.results);
                console.log(`      ✓ Got ${data.results.length} users (Total: ${usersToProcess.length})`);
                console.log(`      🔍 API response has 'next': ${!!data.next}`);
                if (data.next) console.log(`      🔍 Next URL: ${data.next}`);

                // Check if there's a next page
                if (data.next && pageNum < maxPages) {
                    // Extract the endpoint from the full URL
                    const url = new URL(data.next);
                    nextUrl = 'admin/users' + url.search; // Keep query params like ?page=2
                    pageNum++;
                } else {
                    nextUrl = null; // No more pages or reached limit
                }
            } else {
                nextUrl = null; // Stop if error
            }
        }

        console.log(`   ✅ Fetched ${usersToProcess.length} total users from API.`);

        // Sort users by ID in descending order (newest first)
        console.log('   🔄 Sorting users by ID (descending order)...');
        usersToProcess.sort((a, b) => (b.id || 0) - (a.id || 0));
        console.log(`   ✅ Users sorted. First user ID: ${usersToProcess[0]?.id}, Last user ID: ${usersToProcess[usersToProcess.length - 1]?.id}`);
    } else {
        const filePath = await question('   Tb Path to CSV file (default: testpress_users.csv): ') || 'testpress_users.csv';
        if (!fs.existsSync(filePath)) {
            console.error('   ❌ File not found.');
            return;
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const headers = parseCSVLine(lines[0]);

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = parseCSVLine(lines[i]);
            const userObj = {};
            headers.forEach((h, idx) => userObj[h] = row[idx]);
            usersToProcess.push(userObj);
        }
        console.log(`   ✅ Parsed ${usersToProcess.length} users from CSV.`);

        // Sort users by ID in descending order (newest first)
        console.log('   🔄 Sorting users by ID (descending order)...');
        usersToProcess.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0));
        console.log(`   ✅ Users sorted. First user ID: ${usersToProcess[0]?.id}, Last user ID: ${usersToProcess[usersToProcess.length - 1]?.id}`);
    }

    // Process Loop
    let successCount = 0;
    let skippedCount = 0;
    for (const rawUser of usersToProcess) {
        const mapped = mapUser(rawUser);
        const { email } = mapped.core;

        if (!email) {
            console.log(`   ⚠️ Skipping user without email.`);
            skippedCount++;
            continue;
        }

        // Skip inactive or blocked users
        if (rawUser.is_active === false || rawUser.is_blocked === true) {
            console.log(`   ⏭️  Skipping inactive/blocked user: ${email}`);
            skippedCount++;
            continue;
        }

        // Skip ghost/test users (UUID-based emails)
        if (email.includes('@testpress.in') || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@/.test(email)) {
            console.log(`   👻 Skipping ghost/test user: ${email}`);
            skippedCount++;
            continue;
        }

        process.stdout.write(`   👤 Processing ${email}... `);

        // Skip auth creation to avoid rate limiting - users can reset password later
        // Just insert directly into members table
        const { error: dbError } = await supabase
            .from('members')
            .upsert(mapped.core, { onConflict: 'email' });

        if (dbError) {
            console.log(`❌ DB Error: ${dbError.message}`);
        } else {
            console.log(`✅ Done.`);
            successCount++;
        }
    }

    console.log(`\n✨ Import Complete. Successfully imported ${successCount} users.`);
    if (skippedCount > 0) {
        console.log(`   ⏭️  Skipped ${skippedCount} inactive/blocked users.`);
    }
    // To reset ID sequence, run: migrations/reset_members_sequence.sql
    console.log('   ℹ️  Note: If needed, run migrations/reset_members_sequence.sql to reset the ID sequence.');
}

async function importQuestions(sourceType) {
    console.log('\n🚀 Starting Question Import...');

    console.log('   📚 Fetching existing subjects...');
    let subjects = await fetchSubjects();
    console.log(`   ✅ Loaded ${subjects.length} subjects.`);

    let questionsToProcess = [];

    if (sourceType === 'api') {
        console.log('   📡 Connecting to Testpress API...');
        const data = await fetchFromTestpress('admin/questions');
        if (data && data.results) {
            questionsToProcess = data.results;
            console.log(`   ✅ Fetched ${questionsToProcess.length} questions from API (Page 1).`);
        }
    } else {
        const filePath = await question('   Tb Path to CSV file (default: testpress_questions.csv): ') || 'testpress_questions.csv';
        if (!fs.existsSync(filePath)) {
            console.error('   ❌ File not found.');
            return;
        }
        console.log('   ⚠️ CSV Import for Questions is complex. Using simplified parser.');

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const headers = parseCSVLine(lines[0]);

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const row = parseCSVLine(lines[i]);
            const qObj = {};
            headers.forEach((h, idx) => qObj[h] = row[idx]);
            questionsToProcess.push(qObj);
        }
        console.log(`   ✅ Parsed ${questionsToProcess.length} questions from CSV.`);
    }

    let successCount = 0;
    for (const rawQ of questionsToProcess) {
        const mapped = mapQuestion(rawQ);

        // Resolve Subject
        const subjectId = await getOrCreateSubject(mapped.subject_name_temp, subjects);
        delete mapped.subject_name_temp; // Remove temp field
        mapped.subject_id = subjectId;

        if (!mapped.question_text) {
            console.log(`   ⚠️ Skipping question without text.`);
            continue;
        }

        process.stdout.write(`   ❓ Processing Question... `);

        const { error } = await supabase
            .from('questions')
            .insert([mapped]);

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Done.`);
            successCount++;
        }
    }

    console.log(`\n✨ Import Complete. Successfully imported ${successCount} questions.`);
}

// ==========================================
// PRODUCT HELPERS
// ==========================================

async function fetchProductCategories() {
    const { data, error } = await supabase.from('product_categories').select('id, name');
    if (error) return [];
    return data;
}

async function getOrCreateProductCategory(categoryName, categoryMap) {
    if (!categoryName) return null;

    // 1. Check local map
    const existing = categoryMap.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (existing) return existing.id;

    // 2. Create new category
    console.log(`   ✨ Creating new product category: "${categoryName}"...`);
    const { data, error } = await supabase
        .from('product_categories')
        .insert([{ name: categoryName }])
        .select()
        .single();

    if (error) {
        console.error(`   ❌ Failed to create category: ${error.message}`);
        return null;
    }

    // 3. Update map and return
    categoryMap.push(data);
    return data.id;
}

function mapProduct(sourceData) {
    // 1. Core Fields
    const title = sourceData.title;
    const slug = sourceData.slug;
    const price = sourceData.price || 0;
    const description = sourceData.description || '';

    // 2. Image (Take first if array, or string)
    let image = null;
    if (Array.isArray(sourceData.images) && sourceData.images.length > 0) {
        image = sourceData.images[0].original || sourceData.images[0].medium || sourceData.images[0];
    } else if (sourceData.image) {
        image = sourceData.image;
    } else if (sourceData.cover_image) {
        image = sourceData.cover_image;
    }

    // 3. Category (First one if array)
    let categoryName = 'General';
    if (sourceData.categories && sourceData.categories.length > 0) {
        categoryName = sourceData.categories[0];
    }

    // 4. Dates
    const startDate = sourceData.start_date || null;
    const endDate = sourceData.end_date || null;

    return {
        core: {
            title,
            slug,
            price,
            description,
            image,
            start_date: startDate,
            end_date: endDate,
            display_order: sourceData.order || 0,
            // category_id will be resolved later
        },
        category_name_temp: categoryName
    };
}

async function importProducts(sourceType) {
    console.log('\n🚀 Starting Product Import...');

    console.log('   📚 Fetching existing product categories...');
    let categories = await fetchProductCategories();
    console.log(`   ✅ Loaded ${categories.length} categories.`);

    let productsToProcess = [];

    if (sourceType === 'api') {
        console.log('   📡 Connecting to Testpress API...');

        // 1. Fetch Active Products
        console.log('   ⬇️  Fetching Active Products...');
        const activeData = await fetchFromTestpress('products', '', 'v2.2');
        if (activeData && activeData.results) {
            productsToProcess = [...productsToProcess, ...activeData.results];
        }

        // 2. Fetch Inactive Products
        console.log('   ⬇️  Fetching Inactive Products...');
        const inactiveData = await fetchFromTestpress('products', '?status=inactive', 'v2.2');
        if (inactiveData && inactiveData.results) {
            productsToProcess = [...productsToProcess, ...inactiveData.results];
        }

        console.log(`   ✅ Fetched total ${productsToProcess.length} products from API.`);
    } else {
        console.log('   ⚠️ CSV Import for Products not yet implemented. Using API is recommended.');
        return;
    }

    let successCount = 0;
    for (const rawP of productsToProcess) {
        const mapped = mapProduct(rawP);

        // Resolve Category
        const categoryId = await getOrCreateProductCategory(mapped.category_name_temp, categories);
        mapped.core.category_id = categoryId;

        process.stdout.write(`   📦 Processing ${mapped.core.title}... `);

        // Check for duplicate by slug
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('slug', mapped.core.slug)
            .single();

        let error;
        if (existing) {
            // Update
            const { error: updateError } = await supabase
                .from('products')
                .update(mapped.core)
                .eq('id', existing.id);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('products')
                .insert([mapped.core]);
            error = insertError;
        }

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Done.`);
            successCount++;
        }
    }

    console.log(`\n✨ Import Complete. Successfully imported ${successCount} products.`);
}

// ==========================================
// COURSE HELPERS
// ==========================================

function mapCourse(sourceData) {
    // 1. Core Fields
    const title = sourceData.title;
    const slug = sourceData.slug;
    const description = sourceData.description || '';
    const image = sourceData.image || sourceData.cover_image || null;

    // 2. Custom Data
    const knownFields = ['title', 'slug', 'description', 'image', 'cover_image', 'url'];
    const customData = {};
    Object.keys(sourceData).forEach(key => {
        if (!knownFields.includes(key)) customData[key] = sourceData[key];
    });

    return {
        core: {
            title,
            // slug removed as column does not exist
            description,
            image,
            // Default values for required fields if any
            category: 'General',
            level: 'Beginner',
            duration: '0h',
            order: sourceData.order || 0
        }
    };
}

async function importCourses(sourceType) {
    console.log('\n🚀 Starting Course Import...');
    let coursesToProcess = [];

    if (sourceType === 'api') {
        console.log('   📡 Connecting to Testpress API (v2.4)...');
        // Use v2.4 for Courses as discovered
        const data = await fetchFromTestpress('admin/courses', '', 'v2.4');
        if (data && data.results) {
            coursesToProcess = data.results;
            console.log(`   ✅ Fetched ${coursesToProcess.length} courses from API.`);
        }
    } else {
        console.log('   ⚠️ CSV Import for Courses not yet implemented. Using API is recommended.');
        return;
    }

    let successCount = 0;
    for (const rawC of coursesToProcess) {
        const mapped = mapCourse(rawC);

        process.stdout.write(`   🎓 Processing ${mapped.core.title}... `);

        // Check for duplicate by title (since slug is missing)
        const { data: existing } = await supabase
            .from('courses')
            .select('id')
            .eq('title', mapped.core.title)
            .single();

        let error;
        if (existing) {
            // Update
            const { error: updateError } = await supabase
                .from('courses')
                .update(mapped.core)
                .eq('id', existing.id);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('courses')
                .insert([mapped.core]);
            error = insertError;
        }

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Done.`);
            successCount++;
        }
    }

    console.log(`\n✨ Import Complete. Successfully imported ${successCount} courses.`);
}

// ==========================================
// BATCH HELPERS
// ==========================================

function mapBatch(sourceData) {
    return {
        name: sourceData.name,
        // created_at will be auto-set
    };
}

async function importBatches(sourceType) {
    console.log('\n🚀 Starting Batch Import...');

    if (sourceType !== 'api') {
        console.log('   ⚠️ CSV Import for Batches not yet implemented. Using API is recommended.');
        return;
    }

    // 1. Fetch all courses from LMS to know which ones to check
    console.log('   📚 Fetching courses from LMS...');
    const { data: courses, error } = await supabase
        .from('courses')
        .select('id, title');
    // Wait, we didn't store testpress_id in custom_data because custom_data column was missing!
    // We only have title and slug (mapped to title).
    // So we need to fetch courses from Testpress again to get the IDs, 
    // OR we match by title if we can. 
    // But to call the API /courses/:id/batches, we need the Testpress Course ID.
    // Since we didn't store Testpress ID in LMS (due to missing custom_data), 
    // we MUST fetch courses from Testpress first to get their IDs.

    if (error) {
        console.error(`   ❌ Failed to fetch courses from LMS: ${error.message}`);
        return;
    }

    // We will fetch courses from Testpress to get the ID, then match with LMS course by Title/Slug
    console.log('   📡 Connecting to Testpress API (v2.4) to get Course IDs...');
    const tpCoursesData = await fetchFromTestpress('courses', '', 'v2.4');
    if (!tpCoursesData || !tpCoursesData.results) {
        console.log('   ❌ Failed to fetch courses from Testpress.');
        return;
    }

    const tpCourses = tpCoursesData.results;
    console.log(`   ✅ Found ${tpCourses.length} courses in Testpress.`);

    let successCount = 0;

    for (const tpCourse of tpCourses) {
        console.log(`\n   🎓 Checking batches for course: "${tpCourse.title}" (ID: ${tpCourse.id})...`);

        // Find corresponding LMS course
        // We matched by title in importCourses (since slug was missing)
        const lmsCourse = courses.find(c => c.title === tpCourse.title);

        if (!lmsCourse) {
            console.log(`      ⚠️  LMS Course not found for "${tpCourse.title}". Skipping.`);
            continue;
        }

        // Fetch batches for this course
        const batchesData = await fetchFromTestpress(`admin/courses/${tpCourse.id}/batches`, '', 'v2.5');

        if (!batchesData || !batchesData.results || batchesData.results.length === 0) {
            console.log(`      ℹ️  No batches found.`);
            continue;
        }

        const batches = batchesData.results;
        console.log(`      ✅ Found ${batches.length} batches.`);

        const batchIdsForCourse = [];

        for (const rawBatch of batches) {
            const mapped = mapBatch(rawBatch);

            // Check if batch exists (by name)
            // Note: Batches might have same name across courses. 
            // If we want to reuse, we check. If we want separate, we don't.
            // Usually "Batch 2023" is distinct per course? Or shared?
            // Given schema has only 'name', let's assume shared if name matches, or just create new if not exists.

            let batchId;
            const { data: existingBatch } = await supabase
                .from('batches')
                .select('id')
                .eq('name', mapped.name)
                .single();

            if (existingBatch) {
                batchId = existingBatch.id;
                // console.log(`         Reusing existing batch: "${mapped.name}"`);
            } else {
                const { data: newBatch, error: insertError } = await supabase
                    .from('batches')
                    .insert([mapped])
                    .select()
                    .single();

                if (insertError) {
                    console.error(`         ❌ Failed to insert batch "${mapped.name}": ${insertError.message}`);
                    continue;
                }
                batchId = newBatch.id;
                console.log(`         ✨ Created batch: "${mapped.name}"`);
            }

            if (batchId) batchIdsForCourse.push(batchId);
        }

        // Link batches to LMS Course
        if (batchIdsForCourse.length > 0) {
            // Get current allowed_batches
            let currentBatches = [];
            // We need to fetch current allowed_batches. 
            // The 'courses' variable from earlier select might not have it if we didn't select it.
            // Let's fetch it now.
            const { data: currentCourseData } = await supabase
                .from('courses')
                .select('allowed_batches')
                .eq('id', lmsCourse.id)
                .single();

            if (currentCourseData && currentCourseData.allowed_batches) {
                currentBatches = currentCourseData.allowed_batches;
            }

            // Merge and unique
            const updatedBatches = [...new Set([...currentBatches, ...batchIdsForCourse])];

            const { error: updateError } = await supabase
                .from('courses')
                .update({ allowed_batches: updatedBatches })
                .eq('id', lmsCourse.id);

            if (updateError) {
                console.error(`      ❌ Failed to link batches to course: ${updateError.message}`);
            } else {
                console.log(`      🔗 Linked ${batchIdsForCourse.length} batches to course.`);
                successCount += batchIdsForCourse.length;
            }
        }
    }

    console.log(`\n✨ Import Complete. Processed ${successCount} batch links.`);
}

// ==========================================
// EXAM HELPERS
// ==========================================

function parseDurationToMinutes(duration) {
    // Convert "HH:MM:SS" to minutes
    if (!duration) return null;
    const parts = duration.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return (hours * 60) + minutes;
}

function mapExam(sourceData) {
    // Parse duration
    const durationMinutes = parseDurationToMinutes(sourceData.duration);

    // Calculate passing marks from percentage
    const totalMarks = parseFloat(sourceData.total_marks) || 0;
    const passPercentage = parseFloat(sourceData.pass_percentage) || 0;
    const passingMarks = (passPercentage / 100) * totalMarks;

    // Check if negative marking is enabled
    const negativeMarks = parseFloat(sourceData.negative_marks) || 0;
    const negativeMarkingEnabled = negativeMarks > 0;

    return {
        core: {
            title: sourceData.title,
            description: sourceData.description || '',
            start_date: sourceData.start_date || null,
            end_date: sourceData.end_date || null,
            duration_minutes: durationMinutes,
            total_marks: totalMarks,
            passing_marks: passingMarks,
            is_active: sourceData.published || false,
            marks_per_question: parseFloat(sourceData.mark_per_question) || 0,
            negative_marks_per_question: negativeMarks,
            negative_marking_enabled: negativeMarkingEnabled,
            number_of_questions: sourceData.number_of_questions || 0,
            // NEW: Fields from Testpress that now have columns in LMS
            show_answers: sourceData.show_answers !== undefined ? sourceData.show_answers : true,
            show_score: sourceData.show_score !== undefined ? sourceData.show_score : true,
            show_percentile: sourceData.show_percentile !== undefined ? sourceData.show_percentile : false,
            show_pass_or_fail: sourceData.show_pass_or_fail !== undefined ? sourceData.show_pass_or_fail : true,
            slug: sourceData.slug || null,
            enable_ranks: sourceData.enable_ranks || false,
            // Defaults for fields not in Testpress
            randomize_questions: false,
            randomize_options: false,
            auto_submit_on_timeout: true,
            detect_tab_switch: false,
            restrict_copy_paste: false,
            variable_marks: false
        },
        testpress_id: sourceData.id
    };
}

async function importExams(sourceType) {
    console.log('\n🚀 Starting Exam Import...');

    if (sourceType !== 'api') {
        console.log('   ⚠️ CSV Import for Exams not yet implemented. Using API is recommended.');
        return;
    }

    console.log('   📡 Connecting to Testpress API (v2.5)...');
    const data = await fetchFromTestpress('admin/exams', '', 'v2.5');

    if (!data || !data.results) {
        console.log('   ❌ Failed to fetch exams from Testpress.');
        return;
    }

    const examsToProcess = data.results;
    console.log(`   ✅ Found ${examsToProcess.length} exams.`);

    let successCount = 0;

    for (const rawExam of examsToProcess) {
        const mapped = mapExam(rawExam);

        process.stdout.write(`   📝 Processing "${mapped.core.title}"... `);

        // Check for duplicate by title (since we don't have slug in LMS exams table)
        const { data: existing } = await supabase
            .from('exams')
            .select('id')
            .eq('title', mapped.core.title)
            .single();

        let error;
        if (existing) {
            // Update
            const { error: updateError } = await supabase
                .from('exams')
                .update(mapped.core)
                .eq('id', existing.id);
            error = updateError;
        } else {
            // Insert
            const { error: insertError } = await supabase
                .from('exams')
                .insert([mapped.core]);
            error = insertError;
        }

        if (error) {
            console.log(`❌ Error: ${error.message}`);
        } else {
            console.log(`✅ Done.`);
            successCount++;
        }
    }

    console.log(`\n✨ Import Complete. Successfully imported ${successCount} exams.`);
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

async function exportUsers() {
    console.log('\n📤 Starting User Export from Testpress...');

    // Ask for batch size
    const batchChoice = await question('   Export mode?\n   1. Export ALL users (~14,000)\n   2. Export in batches (recommended)\n   Choose (1/2): ');

    let maxPages = Infinity;
    if (batchChoice === '2') {
        const pagesInput = await question('   How many pages to export? (1 page = ~20 users, default: 5): ');
        maxPages = parseInt(pagesInput) || 5;
        console.log(`   ℹ️  Will export up to ${maxPages} pages (~${maxPages * 20} users)`);
    }

    console.log('   📡 Connecting to Testpress API...');
    let allUsers = [];
    let nextUrl = 'admin/users';
    let pageNum = 1;

    while (nextUrl && pageNum <= maxPages) {
        console.log(`   📄 Fetching page ${pageNum}/${maxPages === Infinity ? '?' : maxPages}...`);
        const data = await fetchFromTestpress(nextUrl.replace('admin/users/', 'admin/users'));

        if (data && data.results) {
            allUsers = allUsers.concat(data.results);
            console.log(`      ✓ Got ${data.results.length} users (Total: ${allUsers.length})`);

            // Check if there's a next page
            if (data.next && pageNum < maxPages) {
                const url = new URL(data.next);
                nextUrl = 'admin/users' + url.search;
                pageNum++;
            } else {
                nextUrl = null;
            }
        } else {
            nextUrl = null;
        }
    }

    if (allUsers.length === 0) {
        console.log('   ❌ No users fetched.');
        return;
    }

    console.log(`   ✅ Fetched ${allUsers.length} total users.`);

    // Sort users by ID in descending order
    console.log('   🔄 Sorting users by ID (descending order)...');
    allUsers.sort((a, b) => (b.id || 0) - (a.id || 0));
    console.log(`   ✅ Users sorted. First user ID: ${allUsers[0]?.id}, Last user ID: ${allUsers[allUsers.length - 1]?.id}`);

    // Ask for output format
    const formatChoice = await question('   Output format? (1: JSON, 2: CSV): ');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    if (formatChoice === '2') {
        // Export as CSV
        const filename = `testpress_users_export_${timestamp}.csv`;
        console.log(`   💾 Saving to ${filename}...`);

        // Define CSV headers
        const headers = ['id', 'email', 'username', 'first_name', 'last_name', 'display_name',
            'phone_number', 'birth_date', 'address', 'city', 'state', 'zip',
            'gender', 'is_active', 'is_staff', 'is_superuser', 'created', 'modified'];

        let csvContent = headers.join(',') + '\n';

        for (const user of allUsers) {
            const row = headers.map(header => {
                let value = user[header] || '';
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        }

        fs.writeFileSync(filename, csvContent, 'utf-8');
        console.log(`   ✅ Successfully exported ${allUsers.length} users to ${filename}`);
    } else {
        // Export as JSON (default)
        const filename = `testpress_users_export_${timestamp}.json`;
        console.log(`   💾 Saving to ${filename}...`);

        fs.writeFileSync(filename, JSON.stringify(allUsers, null, 2), 'utf-8');
        console.log(`   ✅ Successfully exported ${allUsers.length} users to ${filename}`);
    }
}

async function exportBatches() {
    console.log('\n📤 Starting Batch Export from Testpress...');

    console.log('   📡 Connecting to Testpress API...');

    let allBatches = [];
    let nextUrl = 'admin/batches';
    let pageNum = 1;

    // Fetch all pages of batches
    while (nextUrl) {
        console.log(`   📄 Fetching page ${pageNum}...`);
        const data = await fetchFromTestpress(nextUrl.replace('admin/batches/', 'admin/batches'), '', 'v2.5');

        if (data && data.results) {
            allBatches = allBatches.concat(data.results);
            console.log(`      ✓ Got ${data.results.length} batches (Total: ${allBatches.length})`);

            // Check if there's a next page
            if (data.next) {
                const url = new URL(data.next);
                nextUrl = 'admin/batches' + url.search;
                pageNum++;
            } else {
                nextUrl = null;
            }
        } else {
            console.log('   ❌ Failed to fetch batches from Testpress.');
            return;
        }
    }

    if (allBatches.length === 0) {
        console.log('   ⚠️  No batches found.');
        return;
    }

    console.log(`\n   ✅ Total batches fetched: ${allBatches.length}`);

    // Ask for output format
    const formatChoice = await question('   Output format? (1: JSON, 2: CSV): ');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    if (formatChoice === '2') {
        // Export as CSV
        const filename = `testpress_batches_export_${timestamp}.csv`;
        console.log(`   💾 Saving to ${filename}...`);

        // Get all unique keys from batches to determine headers
        const allKeys = new Set();
        allBatches.forEach(batch => Object.keys(batch).forEach(key => allKeys.add(key)));
        const headers = Array.from(allKeys);

        let csvContent = headers.join(',') + '\n';

        for (const batch of allBatches) {
            const row = headers.map(header => {
                let value = batch[header] !== undefined ? batch[header] : '';
                // Convert objects/arrays to JSON strings
                if (typeof value === 'object' && value !== null) {
                    value = JSON.stringify(value);
                }
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        }

        fs.writeFileSync(filename, csvContent, 'utf-8');
        console.log(`   ✅ Successfully exported ${allBatches.length} batches to ${filename}`);
    } else {
        // Export as JSON (default)
        const filename = `testpress_batches_export_${timestamp}.json`;
        console.log(`   💾 Saving to ${filename}...`);

        fs.writeFileSync(filename, JSON.stringify(allBatches, null, 2), 'utf-8');
        console.log(`   ✅ Successfully exported ${allBatches.length} batches to ${filename}`);
    }
}

// ==========================================
// MAIN MENU
// ==========================================

async function main() {
    console.clear();
    console.log('╔════════════════════════════════════════════╗');
    console.log('║      LMS MIGRATION TOOL v1.4               ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('1. Import Users');
    console.log('2. Import Questions');
    console.log('3. Import Products');
    console.log('4. Import Courses');
    console.log('5. Import Batches');
    console.log('6. Import Exams');
    console.log('7. Export Users from Testpress');
    console.log('8. Export Batches from Testpress');
    console.log('9. Exit');

    const choice = await question('\nSelect an option (1-9): ');

    switch (choice) {
        case '1':
            const sourceUser = await question('Source? (1: CSV, 2: Testpress API): ');
            await importUsers(sourceUser === '2' ? 'api' : 'csv');
            break;
        case '2':
            const sourceQ = await question('Source? (1: CSV, 2: Testpress API): ');
            await importQuestions(sourceQ === '2' ? 'api' : 'csv');
            break;
        case '3':
            await importProducts('api');
            break;
        case '4':
            await importCourses('api');
            break;
        case '5':
            await importBatches('api');
            break;
        case '6':
            await importExams('api');
            break;
        case '7':
            await exportUsers();
            break;
        case '8':
            await exportBatches();
            break;
        case '9':
            console.log('Bye!');
            rl.close();
            process.exit(0);
            break;
        default:
            console.log('Invalid option.');
    }

    // Loop back to main
    await question('\nPress Enter to continue...');
    main();
}

main();
