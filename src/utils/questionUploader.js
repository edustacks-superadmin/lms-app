import { read, utils } from 'xlsx';
import { supabase } from '../supabaseClient';

/**
 * Parse Excel/CSV file and return array of questions
 */
export const parseQuestionFile = async (file) => {
    try {
        const data = await file.arrayBuffer();
        const workbook = read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]; // First sheet
        const jsonData = utils.sheet_to_json(worksheet);

        return jsonData;
    } catch (error) {
        throw new Error('Failed to parse file: ' + error.message);
    }
};

/**
 * Validate questions data
 */
export const validateQuestions = (questions) => {
    const errors = [];

    questions.forEach((q, index) => {
        const rowNum = index + 2; // Excel row number (starting from row 2)

        // Debug: Log column names for first row
        if (index === 0) {
            console.log('📋 Excel Column Names:', Object.keys(q));
        }

        // Debug: Log row 986 specifically
        if (rowNum === 986) {
            console.log('🔍 Row 986 Debug:');
            console.log('  Column keys:', Object.keys(q));
            console.log('  Option A:', q['Option A'], '| Type:', typeof q['Option A']);
            console.log('  Option B:', q['Option B'], '| Type:', typeof q['Option B']);
            console.log('  Option C:', q['Option C'], '| Type:', typeof q['Option C']);
            console.log('  Option D:', q['Option D'], '| Type:', typeof q['Option D']);
            console.log('  Correct:', q.Correct);
        }

        // Check required fields
        if (!q.Question || String(q.Question).trim() === '') {
            errors.push(`Row ${rowNum}: Question text is required`);
        }

        // Check options - Convert to string first to handle numbers and booleans
        // IMPORTANT: Check for null/undefined, not falsy (false boolean is valid!)
        const hasOptionA = (q['Option A'] != null) && String(q['Option A']).trim();
        const hasOptionB = (q['Option B'] != null) && String(q['Option B']).trim();
        const hasOptionC = (q['Option C'] != null) && String(q['Option C']).trim();
        const hasOptionD = (q['Option D'] != null) && String(q['Option D']).trim();

        const optionCount = [hasOptionA, hasOptionB, hasOptionC, hasOptionD].filter(Boolean).length;

        if (optionCount < 2) {
            errors.push(`Row ${rowNum}: At least 2 options are required`);
        }

        // Check correct answer
        if (!q.Correct || !['A', 'B', 'C', 'D'].includes(q.Correct.toUpperCase())) {
            errors.push(`Row ${rowNum}: Correct answer must be A, B, C, or D`);
        } else {
            const correctOption = q[`Option ${q.Correct.toUpperCase()}`];
            if (correctOption == null || !String(correctOption).trim()) {
                // Enhanced error message
                errors.push(`Row ${rowNum}: Correct answer points to empty option ${q.Correct} (Value: "${correctOption}", Available columns: ${Object.keys(q).filter(k => k.startsWith('Option')).join(', ')})`);
            }
        }

        // Validate marks
        if (q.Marks && isNaN(parseInt(q.Marks))) {
            errors.push(`Row ${rowNum}: Marks must be a number`);
        }

        // Validate difficulty
        if (q.Difficulty && !['easy', 'medium', 'hard'].includes(q.Difficulty.toLowerCase())) {
            errors.push(`Row ${rowNum}: Difficulty must be easy, medium, or hard`);
        }
    });

    return errors;
};

/**
 * Upload questions to database
 */
export const uploadQuestions = async (questions, folderId, onProgress) => {
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    // Preload subjects to resolve row.Subject by name
    const subjectMap = new Map();
    try {
        const { data: dbSubjects } = await supabase.from('subjects').select('id, name');
        if (dbSubjects) {
            dbSubjects.forEach(s => {
                if (s.name) {
                    subjectMap.set(s.name.trim().toLowerCase(), s.id);
                }
            });
        }
    } catch (e) {
        console.warn('Could not preload subjects:', e);
    }

    for (let i = 0; i < questions.length; i++) {
        const row = questions[i];
        const rowNum = i + 2;

        try {
            // Update progress
            if (onProgress) {
                onProgress({
                    current: i + 1,
                    total: questions.length,
                    currentQuestion: row.Question
                });
            }

            // Determine subject_id
            let subjectId = null;
            const subjectInput = row.Subject || row.subject || row['Subject Name'] || row['subject_name'];
            if (subjectInput) {
                const cleanSub = String(subjectInput).trim().toLowerCase();
                if (subjectMap.has(cleanSub)) {
                    subjectId = subjectMap.get(cleanSub);
                } else if (!isNaN(parseInt(subjectInput, 10))) {
                    subjectId = parseInt(subjectInput, 10);
                }
            }

            // 1. Insert Question
            const { data: question, error: questionError } = await supabase
                .from('questions')
                .insert({
                    question_text: row.Question,
                    marks: parseInt(row.Marks) || 1,
                    difficulty: (row.Difficulty || 'medium').toLowerCase(),
                    explanation: row.Explanation || null,
                    folder_id: folderId || null,
                    question_type: 'MCQ, Single Correct Question',
                    subject_id: subjectId
                })
                .select()
                .single();

            if (questionError) throw questionError;

            // 2. Link to Folder (question_folder_items) - Only if folderId is provided
            if (folderId) {
                // First get the next position
                const { data: existingItems } = await supabase
                    .from('question_folder_items')
                    .select('position')
                    .eq('folder_id', folderId)
                    .order('position', { ascending: false })
                    .limit(1);

                const nextPosition = existingItems && existingItems.length > 0
                    ? existingItems[0].position + 1
                    : 1;

                const { error: folderLinkError } = await supabase
                    .from('question_folder_items')
                    .insert({
                        question_id: question.id,
                        folder_id: folderId,
                        position: nextPosition
                    });

                if (folderLinkError) throw folderLinkError;
            }

            // 3. Insert Options
            const options = ['A', 'B', 'C', 'D']
                .map((letter, index) => {
                    const optionText = row[`Option ${letter}`];
                    if (optionText == null) return null; // Check for null/undefined

                    const optionStr = String(optionText).trim();
                    if (!optionStr) return null;

                    return {
                        question_id: question.id,
                        option_label: letter,
                        option_text: optionStr,
                        is_correct: row.Correct.toUpperCase() === letter,
                        option_order: index + 1
                    };
                })
                .filter(Boolean); // Remove null entries

            const { error: optionsError } = await supabase
                .from('question_options')
                .insert(options);

            if (optionsError) throw optionsError;

            results.success++;
        } catch (error) {
            console.error('Upload error:', error);
            results.failed++;
            results.errors.push(`Row ${rowNum}: ${error.message}`);
        }
    }

    return results;
};

/**
 * Main function to process and upload file
 */
export const processQuestionUpload = async (file, folderId, onProgress) => {
    // 1. Parse file
    const questions = await parseQuestionFile(file);

    if (questions.length === 0) {
        throw new Error('No questions found in file');
    }

    // 2. Validate
    const validationErrors = validateQuestions(questions);

    if (validationErrors.length > 0) {
        return {
            success: false,
            validationErrors
        };
    }

    // 3. Upload
    const results = await uploadQuestions(questions, folderId, onProgress);

    return {
        success: true,
        results
    };
};
