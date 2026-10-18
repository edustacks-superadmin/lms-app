'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useExams } from '../context/ExamContext';
import { ArrowLeft, Save } from 'lucide-react';
import TagSelector from './TagSelector';
import { useToast } from '../context/ToastContext';

const CreateExam = ({ examId }) => {
    const router = useRouter();
    const params = useParams();
    const id = examId || params?.id;
    const { addExam, updateExam, getExamById } = useExams();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        slug: '',
        start_date: '',
        end_date: '',
        duration_minutes: 60,
        total_marks: 0,
        passing_marks: 0,
        marks_per_question: 1,
        number_of_questions: 0,
        is_active: true,
        variable_marks: false,
        // Result Display Settings (NEW)
        show_answers: true,
        show_score: true,
        show_percentile: false,
        show_pass_or_fail: true,
        enable_ranks: false,
        show_pass_or_fail: true,
        enable_ranks: false,
        is_public_result: false,
        result_publish_date: '',
        // Quiz Mode Settings
        enable_instant_feedback: false,
        allow_mode_toggle: false,
        // Advanced options
        randomize_questions: false,
        randomize_options: false,
        auto_submit_on_timeout: true,
        negative_marking_enabled: false,
        negative_marks_per_question: 0,
        round_off_marks: false,
        detect_tab_switch: false,
        restrict_copy_paste: false,
        max_attempts: 1,
        max_attempts: 1,
        attempt_gap_minutes: 0,
        tags: [] // Initialize tags
    });

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);

    useEffect(() => {
        if (id) {
            const fetchExam = async () => {
                const exam = await getExamById(id);
                if (exam) {
                    // Helper function to format date for datetime-local input
                    const formatDateForInput = (dateString) => {
                        if (!dateString) return '';
                        const date = new Date(dateString);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                    };

                    const baseMarks = exam.marks_per_question || 1;
                    const baseCount = exam.number_of_questions || 0;
                    const calculatedTotal = exam.variable_marks ? (exam.total_marks || 0) : (baseMarks * baseCount);

                    setFormData({
                        title: exam.title || '',
                        description: exam.description || '',
                        slug: exam.slug || '',
                        start_date: formatDateForInput(exam.start_date),
                        end_date: formatDateForInput(exam.end_date),
                        duration_minutes: exam.duration_minutes || 60,
                        total_marks: calculatedTotal,
                        passing_marks: exam.passing_marks || 0,
                        marks_per_question: baseMarks,
                        number_of_questions: baseCount,
                        is_active: exam.is_active !== false,
                        variable_marks: exam.variable_marks || false,
                        // Result Display Settings (NEW)
                        show_answers: exam.show_answers !== false,
                        show_score: exam.show_score !== false,
                        show_percentile: exam.show_percentile || false,
                        show_pass_or_fail: exam.show_pass_or_fail !== false,
                        enable_ranks: exam.enable_ranks || false,
                        show_pass_or_fail: exam.show_pass_or_fail !== false,
                        enable_ranks: exam.enable_ranks || false,
                        is_public_result: exam.is_public_result || false,
                        result_publish_date: formatDateForInput(exam.result_publish_date),
                        // Quiz Mode Settings
                        enable_instant_feedback: exam.enable_instant_feedback || false,
                        allow_mode_toggle: exam.allow_mode_toggle || false,
                        // Advanced options
                        randomize_questions: exam.randomize_questions || false,
                        randomize_options: exam.randomize_options || false,
                        auto_submit_on_timeout: exam.auto_submit_on_timeout !== false,
                        negative_marking_enabled: exam.negative_marking_enabled || false,
                        negative_marks_per_question: exam.negative_marks_per_question || 0,
                        round_off_marks: exam.round_off_marks || false,
                        detect_tab_switch: exam.detect_tab_switch || false,
                        restrict_copy_paste: exam.restrict_copy_paste || false,
                        max_attempts: exam.max_attempts || 1,
                        max_attempts: exam.max_attempts || 1,
                        attempt_gap_minutes: exam.attempt_gap_minutes || 0,
                        tags: exam.tag_ids || []
                    });
                }
                setInitialLoading(false);
            };
            fetchExam();
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            const newVal = type === 'checkbox' ? checked : value; // fixed syntax error
            const newData = {
                ...prev,
                [name]: newVal
            };

            // Auto-calculate total marks if relevant fields change and variable_marks is false
            if ((name === 'marks_per_question' || name === 'number_of_questions' || name === 'variable_marks')) {
                const isVariable = name === 'variable_marks' ? checked : prev.variable_marks;

                if (!isVariable) {
                    const marks = parseFloat(name === 'marks_per_question' ? value : prev.marks_per_question) || 0;
                    const count = parseInt(name === 'number_of_questions' ? value : prev.number_of_questions) || 0;
                    newData.total_marks = marks * count;
                } else if (name === 'variable_marks' && checked) {
                    // Reset to 0 when switching to variable marks if it was previously auto-calculated
                    //newData.total_marks = 0; 
                }
            }

            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Prepare data for submission
        const submissionData = {
            ...formData,
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
            start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
            result_publish_date: formData.result_publish_date ? new Date(formData.result_publish_date).toISOString() : null
        };

        try {
            if (id) {
                await updateExam(id, submissionData);
                showToast('Exam updated successfully!', 'success');
                router.push('/exams');
            } else {
                const newExam = await addExam(submissionData);
                if (newExam) {
                    if (window.confirm('Exam created successfully! Do you want to add questions now?')) {
                        router.push(`/exams/${newExam.id}/questions`);
                    } else {
                        router.push('/exams');
                    }
                }
            }
        } catch (error) {
            console.error('Error saving exam:', error);
            showToast(`Failed to save exam: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div className="p-10 flex justify-center text-gray-500">Loading exam details...</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 pb-20">
            <div className="mb-6">
                <button
                    onClick={() => router.push('/exams')}
                    className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors bg-transparent border-none cursor-pointer"
                >
                    <ArrowLeft size={20} /> Back to Exams
                </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 m-0">
                    {id ? 'Edit Exam' : 'Create New Exam'}
                </h1>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Exam'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exam Details - Left Column */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            📝 Exam Details
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="e.g. Mathematics Mid-Term 2024"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                                    placeholder="Enter exam instructions or details..."
                                />
                            </div>

                            {/* Tags Selection */}
                            <div>
                                <TagSelector
                                    type="exam"
                                    selectedTags={formData.tags || []}
                                    onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug (SEO-friendly URL)</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    placeholder="e.g., midterm-exam-2024"
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate from title</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date</label>
                                    <input
                                        type="datetime-local"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Variable Marks Toggle */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="variable_marks"
                                        checked={formData.variable_marks}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-semibold text-blue-900">Variable Marks Mode</span>
                                </label>
                                <p className="text-xs text-blue-700 mt-2 pl-8 leading-relaxed">
                                    {formData.variable_marks
                                        ? 'Each question can have different marks. Total marks will be calculated from individual question marks.'
                                        : 'All questions will have the same marks. Total marks = Number of Questions × Marks per Question.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Questions</label>
                                    <input
                                        type="number"
                                        name="number_of_questions"
                                        value={formData.number_of_questions}
                                        onChange={handleChange}
                                        min="0"
                                        onWheel={(e) => e.target.blur()}
                                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                {!formData.variable_marks && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marks per Question</label>
                                        <input
                                            type="number"
                                            name="marks_per_question"
                                            value={formData.marks_per_question}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.5"
                                            onWheel={(e) => e.target.blur()}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration (mins)</label>
                                    <input
                                        type="number"
                                        name="duration_minutes"
                                        value={formData.duration_minutes}
                                        onChange={handleChange}
                                        onWheel={(e) => e.target.blur()}
                                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 text-gray-500">Total Marks (Auto)</label>
                                    <input
                                        type="number"
                                        name="total_marks"
                                        value={formData.total_marks}
                                        readOnly
                                        className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Passing Marks</label>
                                <input
                                    type="number"
                                    name="passing_marks"
                                    value={formData.passing_marks}
                                    onChange={handleChange}
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer py-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-gray-900 font-medium">Exam is Active</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column - Settings */}
                <div className="space-y-6">
                    {/* Result Display Settings */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            📊 Result Display Settings
                        </h2>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 text-sm text-amber-800 leading-relaxed">
                            Control what students can see after completing the exam. These settings directly affect the post-exam review experience.
                        </div>

                        <div className="space-y-3">
                            {[
                                { name: 'show_answers', label: 'Show Answers ⭐', desc: 'Students can review questions with correct answers after exam completion' },
                                { name: 'show_score', label: 'Show Score', desc: 'Display the total score to students after submission' },
                                { name: 'show_pass_or_fail', label: 'Show Pass/Fail Status', desc: 'Show whether the student passed or failed based on passing marks' },
                                { name: 'show_percentile', label: 'Show Percentile Rank', desc: 'Display student\'s performance percentile compared to others' },
                                { name: 'enable_ranks', label: 'Enable Leaderboard', desc: 'Show ranking/leaderboard for this exam' },
                            ].map((item) => (
                                <label key={item.name} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                                    <input
                                        type="checkbox"
                                        name={item.name}
                                        checked={formData[item.name]}
                                        onChange={handleChange}
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm">{item.label}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                                    </div>
                                </label>
                            ))}

                            {/* Public Results Section (New) */}
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100 mb-3">
                                    <input
                                        type="checkbox"
                                        name="is_public_result"
                                        checked={formData.is_public_result}
                                        onChange={handleChange}
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm">Public Result Page 🌍</div>
                                        <div className="text-xs text-gray-500 mt-0.5">Allow non-logged-in users to view a public leaderboard/results page.</div>
                                    </div>
                                </label>

                                {formData.is_public_result && (
                                    <div className="ml-11">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Publish Results At</label>
                                        <input
                                            type="datetime-local"
                                            name="result_publish_date"
                                            value={formData.result_publish_date}
                                            onChange={handleChange}
                                            required={formData.is_public_result}
                                            className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Results will be visible to the public after this date/time.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quiz Mode Settings */}
                    < div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" >
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            ⚡ Quiz Mode Settings
                        </h2>
                        <div className="space-y-4">
                            <label className={`flex items-start gap-3 p-3 rounded-xl border border-transparent transition-colors ${formData.allow_mode_toggle
                                ? 'opacity-50 cursor-not-allowed bg-gray-50'
                                : 'hover:bg-gray-50 cursor-pointer hover:border-gray-100'
                                }`}>
                                <input
                                    type="checkbox"
                                    name="enable_instant_feedback"
                                    checked={formData.enable_instant_feedback}
                                    onChange={handleChange}
                                    disabled={formData.allow_mode_toggle}
                                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                />
                                <div>
                                    <div className="font-semibold text-gray-800 text-sm">Enable Instant Feedback (Quiz Mode)</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {formData.allow_mode_toggle
                                            ? "Controlled by student choice (see below)"
                                            : "Students see correct/incorrect answers immediately after selecting an option."}
                                    </div>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                                <input
                                    type="checkbox"
                                    name="allow_mode_toggle"
                                    checked={formData.allow_mode_toggle}
                                    onChange={handleChange}
                                    className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                />
                                <div>
                                    <div className="font-semibold text-gray-800 text-sm">Allow Students to Choose Mode</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Students can decide between "Exam Mode" (standard) or "Quiz Mode" (instant feedback) before starting.</div>
                                </div>
                            </label>
                        </div>
                    </div >

                    {/* Advanced Options */}
                    < div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm" >
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            ⚙️ Advanced Options
                        </h2>

                        <div className="space-y-6">
                            {/* Randomization */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Randomization</h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="randomize_questions"
                                            checked={formData.randomize_questions}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Randomize Question Order</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="randomize_options"
                                            checked={formData.randomize_options}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Randomize Answer Options</span>
                                    </label>
                                </div>
                            </div>

                            {/* Grading */}
                            <div className="pt-4 border-t border-gray-50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Grading</h3>
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        name="negative_marking_enabled"
                                        checked={formData.negative_marking_enabled}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-semibold text-gray-800">Enable Negative Marking</span>
                                </label>

                                {formData.negative_marking_enabled && (
                                    <div className="ml-7 mb-3">
                                        <label className="block text-xs text-gray-500 mb-1">Marks to Deduct per Wrong Answer</label>
                                        <input
                                            type="number"
                                            name="negative_marks_per_question"
                                            value={formData.negative_marks_per_question}
                                            onChange={handleChange}
                                            step="0.25"
                                            min="0"
                                            className="w-32 p-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                )}

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="round_off_marks"
                                        checked={formData.round_off_marks}
                                        onChange={handleChange}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-700">Round Off Final Marks</span>
                                        <p className="text-xs text-gray-400 mt-0.5">Rounds to nearest whole number (e.g. 38.7 → 39)</p>
                                    </div>
                                </label>
                            </div>

                            {/* Security & Attempts */}
                            <div className="pt-4 border-t border-gray-50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Security & Attempts</h3>
                                <div className="space-y-2 mb-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="detect_tab_switch"
                                            checked={formData.detect_tab_switch}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Detect Tab Switching</span>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="restrict_copy_paste"
                                            checked={formData.restrict_copy_paste}
                                            onChange={handleChange}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">Restrict Copy/Paste</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Max Attempts</label>
                                        <input
                                            type="number"
                                            name="max_attempts"
                                            value={formData.max_attempts}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        <span className="text-[10px] text-gray-400">0 = Unlimited</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Gap (minutes)</label>
                                        <input
                                            type="number"
                                            name="attempt_gap_minutes"
                                            value={formData.attempt_gap_minutes}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div >
                </div >
            </div >
        </div >
    );
};

export default CreateExam;
