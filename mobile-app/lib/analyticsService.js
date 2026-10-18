import { supabase } from './supabase';

/**
 * Fetch and calculate user's performance analytics
 * @param {string} userId - The user's ID
 * @returns {Promise} Performance data with overall and subject-wise metrics
 */
export const getUserPerformanceData = async (userId) => {
    try {
        // Step 1: Fetch all exam attempts for the user
        const { data: attempts, error: attemptsError } = await supabase
            .from('exam_attempts')
            .select('id, exam_id, answers, score')
            .eq('member_id', userId);

        if (attemptsError) throw attemptsError;

        if (!attempts || attempts.length === 0) {
            return {
                overall: {
                    correct: 0,
                    incorrect: 0,
                    unanswered: 0,
                    totalQuestions: 0,
                    totalTests: 0
                },
                subjects: []
            };
        }

        // Step 2: Get unique exam IDs
        const examIds = [...new Set(attempts.map(a => a.exam_id))];

        // Step 3: Fetch exam questions for these exams
        const { data: examQuestions, error: eqError } = await supabase
            .from('exam_questions')
            .select('exam_id, question_id')
            .in('exam_id', examIds);

        if (eqError) throw eqError;

        // Step 4: Get unique question IDs
        const questionIds = [...new Set(examQuestions.map(eq => eq.question_id))];

        // Step 5: Fetch questions
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('id, subject_id')
            .in('id', questionIds);

        if (qError) throw qError;

        // Step 6: Fetch question options to get correct answers
        const { data: options, error: optError } = await supabase
            .from('question_options')
            .select('question_id, option_label, is_correct')
            .in('question_id', questionIds);

        if (optError) throw optError;

        // Create map of correct answers (both label and index format)
        const correctAnswerMap = {};
        const optionLabelToIndex = {};

        // Group options by question for index mapping
        const optionsByQuestion = {};
        options.forEach(opt => {
            if (!optionsByQuestion[opt.question_id]) {
                optionsByQuestion[opt.question_id] = [];
            }
            optionsByQuestion[opt.question_id].push(opt);
        });

        // Sort options and create mappings
        Object.keys(optionsByQuestion).forEach(qId => {
            const qOptions = optionsByQuestion[qId].sort((a, b) =>
                a.option_label.localeCompare(b.option_label)
            );

            qOptions.forEach((opt, index) => {
                // Store label-to-index mapping for this question
                if (!optionLabelToIndex[qId]) {
                    optionLabelToIndex[qId] = {};
                }
                optionLabelToIndex[qId][opt.option_label] = index;
                optionLabelToIndex[qId][index] = opt.option_label;

                // Store correct answer
                if (opt.is_correct) {
                    correctAnswerMap[qId] = {
                        label: opt.option_label,
                        index: index
                    };
                }
            });
        });

        // Step 7: Get unique subject IDs
        const subjectIds = [...new Set(questions.map(q => q.subject_id).filter(Boolean))];

        // Step 8: Fetch all subjects (including parents)
        const { data: subjects, error: sError } = await supabase
            .from('subjects')
            .select('id, name, parent_id')
            .in('id', subjectIds);

        if (sError) throw sError;

        // Get parent subjects too
        const parentIds = [...new Set(subjects.map(s => s.parent_id).filter(Boolean))];
        let parentSubjects = [];
        if (parentIds.length > 0) {
            const { data: parents } = await supabase
                .from('subjects')
                .select('id, name, parent_id')
                .in('id', parentIds);
            parentSubjects = parents || [];
        }

        // Combine all subjects
        const allSubjects = [...subjects, ...parentSubjects];
        const subjectMap = {};
        allSubjects.forEach(s => {
            subjectMap[s.id] = s;
        });

        // Create question map with correct answers
        const questionMap = {};
        questions.forEach(q => {
            questionMap[q.id] = {
                ...q,
                correct_answer: correctAnswerMap[q.id]
            };
        });

        // Create exam-question mapping
        const examQuestionMap = {};
        examQuestions.forEach(eq => {
            if (!examQuestionMap[eq.exam_id]) {
                examQuestionMap[eq.exam_id] = [];
            }
            examQuestionMap[eq.exam_id].push(eq.question_id);
        });

        // Initialize metrics
        let totalCorrect = 0;
        let totalIncorrect = 0;
        let totalUnanswered = 0;
        let totalQuestions = 0;
        const subjectMetrics = {};

        // Process each attempt
        attempts.forEach(attempt => {
            const questionIdsForExam = examQuestionMap[attempt.exam_id] || [];
            const userAnswers = attempt.answers || {};

            questionIdsForExam.forEach(questionId => {
                const question = questionMap[questionId];
                if (!question || !question.subject_id) return;

                const subject = subjectMap[question.subject_id];
                if (!subject) return;

                const userAnswer = userAnswers[questionId];
                const correctAnswer = correctAnswerMap[questionId];

                totalQuestions++;

                // Determine answer status
                let isCorrect = false;
                let isUnanswered = false;

                if (!userAnswer && userAnswer !== 0) {
                    // No answer provided
                    isUnanswered = true;
                    totalUnanswered++;
                } else if (correctAnswer) {
                    // Normalize user answer (handle both index and label formats)
                    let normalizedUserAnswer = userAnswer;

                    // If user answer is a number (index), convert to label
                    if (typeof userAnswer === 'number') {
                        const labelMapping = optionLabelToIndex[questionId];
                        normalizedUserAnswer = labelMapping ? labelMapping[userAnswer] : userAnswer;
                    }

                    // Compare with correct answer (check both label and index)
                    if (normalizedUserAnswer === correctAnswer.label ||
                        userAnswer === correctAnswer.index) {
                        isCorrect = true;
                        totalCorrect++;
                    } else {
                        totalIncorrect++;
                    }
                } else {
                    // No correct answer found, count as incorrect
                    console.log(`Q${questionId}: No correct answer found in database`);
                    totalIncorrect++;
                }

                // Get parent subject (or use current if no parent)
                const parentSubject = subject.parent_id ? subjectMap[subject.parent_id] : subject;
                const parentId = parentSubject ? parentSubject.id : subject.id;
                const parentName = parentSubject ? parentSubject.name : subject.name;

                // Initialize parent subject metrics
                if (!subjectMetrics[parentId]) {
                    subjectMetrics[parentId] = {
                        id: parentId,
                        name: parentName,
                        correct: 0,
                        incorrect: 0,
                        unanswered: 0,
                        total: 0,
                        children: {}
                    };
                }

                // Update parent metrics
                subjectMetrics[parentId].total++;
                if (isCorrect) subjectMetrics[parentId].correct++;
                else if (isUnanswered) subjectMetrics[parentId].unanswered++;
                else subjectMetrics[parentId].incorrect++;

                // If this is a child subject, track it separately
                if (subject.parent_id) {
                    const childId = subject.id;
                    const childName = subject.name;

                    if (!subjectMetrics[parentId].children[childId]) {
                        subjectMetrics[parentId].children[childId] = {
                            id: childId,
                            name: childName,
                            correct: 0,
                            incorrect: 0,
                            unanswered: 0,
                            total: 0
                        };
                    }

                    const child = subjectMetrics[parentId].children[childId];
                    child.total++;
                    if (isCorrect) child.correct++;
                    else if (isUnanswered) child.unanswered++;
                    else child.incorrect++;
                }
            });
        });

        // Calculate percentages and sort children by weakness
        const subjectsArray = Object.values(subjectMetrics).map(subject => {
            const overallScore = subject.total > 0
                ? Math.round((subject.correct / subject.total) * 100)
                : 0;

            // Convert children object to array and calculate percentages
            const children = Object.values(subject.children).map(child => {
                const accuracy = child.total > 0
                    ? Math.round((child.correct / child.total) * 100)
                    : 0;
                const incorrectPct = child.total > 0
                    ? Math.round((child.incorrect / child.total) * 100)
                    : 0;
                const unansweredPct = child.total > 0
                    ? Math.round((child.unanswered / child.total) * 100)
                    : 0;

                return {
                    ...child,
                    accuracy,
                    incorrectPct,
                    unansweredPct,
                    tag: getPerformanceTag(accuracy, incorrectPct, unansweredPct)
                };
            });

            // Sort children by weakness (lowest accuracy first)
            children.sort((a, b) => a.accuracy - b.accuracy);

            return {
                ...subject,
                overallScore,
                children,
                tag: getPerformanceTag(overallScore,
                    Math.round((subject.incorrect / subject.total) * 100),
                    Math.round((subject.unanswered / subject.total) * 100))
            };
        });

        // Sort subjects by overall score (lowest first - weakest areas)
        subjectsArray.sort((a, b) => a.overallScore - b.overallScore);

        return {
            overall: {
                correct: totalCorrect,
                incorrect: totalIncorrect,
                unanswered: totalUnanswered,
                totalQuestions,
                totalTests: attempts.length
            },
            subjects: subjectsArray
        };

    } catch (error) {
        console.error('Error fetching performance data:', error);
        throw error;
    }
};

/**
 * Determine performance tag based on metrics
 */
const getPerformanceTag = (correctPct, incorrectPct, unansweredPct) => {
    if (correctPct >= 75) {
        return { label: 'Mastered', color: '#22c55e', bgColor: '#dcfce7' };
    } else if (incorrectPct > 50) {
        return { label: 'Needs Improvement', color: '#ef4444', bgColor: '#fee2e2' };
    } else if (unansweredPct > 50) {
        return { label: 'Review Concepts', color: '#94a3b8', bgColor: '#f1f5f9' };
    } else {
        return { label: 'Average', color: '#f59e0b', bgColor: '#fef3c7' };
    }
};
