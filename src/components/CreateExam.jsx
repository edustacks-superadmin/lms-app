import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useExams } from '../context/ExamContext';
import { ArrowLeft, Save } from 'lucide-react';

const CreateExam = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addExam, updateExam, getExamById } = useExams();

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
        attempt_gap_minutes: 0
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

                    setFormData({
                        title: exam.title || '',
                        description: exam.description || '',
                        slug: exam.slug || '',
                        start_date: formatDateForInput(exam.start_date),
                        end_date: formatDateForInput(exam.end_date),
                        duration_minutes: exam.duration_minutes || 60,
                        total_marks: exam.total_marks || 0,
                        passing_marks: exam.passing_marks || 0,
                        marks_per_question: exam.marks_per_question || 1,
                        number_of_questions: exam.number_of_questions || 0,
                        is_active: exam.is_active !== false,
                        variable_marks: exam.variable_marks || false,
                        // Result Display Settings (NEW)
                        show_answers: exam.show_answers !== false,
                        show_score: exam.show_score !== false,
                        show_percentile: exam.show_percentile || false,
                        show_pass_or_fail: exam.show_pass_or_fail !== false,
                        enable_ranks: exam.enable_ranks || false,
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
                        attempt_gap_minutes: exam.attempt_gap_minutes || 0
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
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            // Auto-calculate total marks if relevant fields change and variable_marks is false
            if (!prev.variable_marks && (name === 'marks_per_question' || name === 'number_of_questions')) {
                const marks = parseFloat(name === 'marks_per_question' ? value : prev.marks_per_question) || 0;
                const count = parseInt(name === 'number_of_questions' ? value : prev.number_of_questions) || 0;
                newData.total_marks = marks * count;
            }

            // If variable_marks is toggled, reset total_marks calculation
            if (name === 'variable_marks') {
                if (!checked) {
                    // Calculate total marks from fixed marks per question
                    const marks = parseFloat(prev.marks_per_question) || 0;
                    const count = parseInt(prev.number_of_questions) || 0;
                    newData.total_marks = marks * count;
                } else {
                    // Set total_marks to 0 when variable marks enabled (will be calculated from questions)
                    newData.total_marks = 0;
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
            end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
        };

        try {
            if (id) {
                await updateExam(id, submissionData);
                alert('Exam updated successfully');
                navigate('/exams');
            } else {
                const newExam = await addExam(submissionData);
                if (newExam) {
                    if (window.confirm('Exam created successfully! Do you want to add questions now?')) {
                        navigate(`/exams/${newExam.id}/questions`);
                    } else {
                        navigate('/exams');
                    }
                }
            }
        } catch (error) {
            console.error('Error saving exam:', error);
            alert(`Failed to save exam: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div>Loading...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/exams')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                >
                    <ArrowLeft size={20} /> Back to Exams
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px' }}>{id ? 'Edit Exam' : 'Create New Exam'}</h1>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                >
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Exam'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Exam Details */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>Exam Details</h2>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Slug (SEO-friendly URL)</label>
                        <input
                            type="text"
                            name="slug"
                            value={formData.slug}
                            onChange={handleChange}
                            placeholder="e.g., midterm-exam-2024"
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            Leave empty to auto-generate from title
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Start Date</label>
                            <input
                                type="datetime-local"
                                name="start_date"
                                value={formData.start_date}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>End Date</label>
                            <input
                                type="datetime-local"
                                name="end_date"
                                value={formData.end_date}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Variable Marks Checkbox */}
                    <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: '500' }}>
                            <input
                                type="checkbox"
                                name="variable_marks"
                                checked={formData.variable_marks}
                                onChange={handleChange}
                                style={{ marginRight: '10px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            Variable Marks
                        </label>
                        <p style={{ margin: '8px 0 0 28px', fontSize: '13px', color: '#6c757d', lineHeight: '1.4' }}>
                            {formData.variable_marks
                                ? 'Each question can have different marks. Total marks will be calculated from individual question marks.'
                                : 'All questions will have the same marks. Total marks = Number of Questions × Marks per Question.'}
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Number of Questions</label>
                            <input
                                type="number"
                                name="number_of_questions"
                                value={formData.number_of_questions}
                                onChange={handleChange}
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                        {!formData.variable_marks && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Marks per Question</label>
                                <input
                                    type="number"
                                    name="marks_per_question"
                                    value={formData.marks_per_question}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.5"
                                    onWheel={(e) => e.target.blur()}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Duration (minutes)</label>
                            <input
                                type="number"
                                name="duration_minutes"
                                value={formData.duration_minutes}
                                onChange={handleChange}
                                onWheel={(e) => e.target.blur()}
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Total Marks (Auto-calculated)</label>
                            <input
                                type="number"
                                name="total_marks"
                                value={formData.total_marks}
                                readOnly
                                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Passing Marks</label>
                        <input
                            type="number"
                            name="passing_marks"
                            value={formData.passing_marks}
                            onChange={handleChange}
                            onWheel={(e) => e.target.blur()}
                            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formData.is_active}
                                onChange={handleChange}
                            />
                            <span>Active</span>
                        </label>
                    </div>
                </div>

                {/* Advanced Options */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', marginTop: '24px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>⚙️ Advanced Options</h2>

                    {/* Randomization */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>Randomization</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="randomize_questions"
                                    checked={formData.randomize_questions}
                                    onChange={handleChange}
                                />
                                <span>Randomize Question Order</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="randomize_options"
                                    checked={formData.randomize_options}
                                    onChange={handleChange}
                                />
                                <span>Randomize Answer Options</span>
                            </label>
                        </div>
                    </div>

                    {/* Grading */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>Grading</h3>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
                            <input
                                type="checkbox"
                                name="negative_marking_enabled"
                                checked={formData.negative_marking_enabled}
                                onChange={handleChange}
                            />
                            <span>Enable Negative Marking</span>
                        </label>
                        {formData.negative_marking_enabled && (
                            <div style={{ marginLeft: '28px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Marks to Deduct per Wrong Answer
                                </label>
                                <input
                                    type="number"
                                    name="negative_marks_per_question"
                                    value={formData.negative_marks_per_question}
                                    onChange={handleChange}
                                    step="0.25"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    style={{ width: '200px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>
                        )}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '12px' }}>
                            <input
                                type="checkbox"
                                name="round_off_marks"
                                checked={formData.round_off_marks}
                                onChange={handleChange}
                            />
                            <span>Round Off Final Marks</span>
                        </label>
                        <div style={{ fontSize: '12px', color: '#666', marginLeft: '28px', marginTop: '4px' }}>
                            When enabled, final marks will be rounded to the nearest whole number (e.g., 38.7 → 39)
                        </div>
                    </div>

                    {/* Security & Monitoring */}
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>Security & Monitoring</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="detect_tab_switch"
                                    checked={formData.detect_tab_switch}
                                    onChange={handleChange}
                                />
                                <span>Detect Tab Switching</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="restrict_copy_paste"
                                    checked={formData.restrict_copy_paste}
                                    onChange={handleChange}
                                />
                                <span>Restrict Copy/Paste</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    name="auto_submit_on_timeout"
                                    checked={formData.auto_submit_on_timeout}
                                    onChange={handleChange}
                                />
                                <span>Auto-Submit When Time Expires</span>
                            </label>
                        </div>
                    </div>

                    {/* Attempt Settings */}
                    <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#555' }}>Attempt Settings</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Maximum Attempts
                                </label>
                                <input
                                    type="number"
                                    name="max_attempts"
                                    value={formData.max_attempts}
                                    onChange={handleChange}
                                    min="1"
                                    onWheel={(e) => e.target.blur()}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    Set to 0 for unlimited attempts
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                                    Gap Between Attempts (minutes)
                                </label>
                                <input
                                    type="number"
                                    name="attempt_gap_minutes"
                                    value={formData.attempt_gap_minutes}
                                    onChange={handleChange}
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                    Minimum time between attempts
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Result Display Settings (NEW) */}
                <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', marginTop: '24px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>📊 Result Display Settings</h2>

                    <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                            Control what students can see after completing the exam. These settings affect the exam review experience.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <input
                                type="checkbox"
                                name="show_answers"
                                checked={formData.show_answers}
                                onChange={handleChange}
                                style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Show Answers ⭐</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    Students can review questions with correct answers after exam completion
                                </div>
                            </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <input
                                type="checkbox"
                                name="show_score"
                                checked={formData.show_score}
                                onChange={handleChange}
                                style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Show Score</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    Display the total score to students after submission
                                </div>
                            </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <input
                                type="checkbox"
                                name="show_pass_or_fail"
                                checked={formData.show_pass_or_fail}
                                onChange={handleChange}
                                style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Show Pass/Fail Status</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    Show whether the student passed or failed based on passing marks
                                </div>
                            </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <input
                                type="checkbox"
                                name="show_percentile"
                                checked={formData.show_percentile}
                                onChange={handleChange}
                                style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Show Percentile Rank</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    Display student's performance percentile compared to others
                                </div>
                            </div>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '12px', background: '#f8f9fa', borderRadius: '6px' }}>
                            <input
                                type="checkbox"
                                name="enable_ranks"
                                checked={formData.enable_ranks}
                                onChange={handleChange}
                                style={{ marginTop: '3px', width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Enable Leaderboard</div>
                                <div style={{ fontSize: '13px', color: '#666' }}>
                                    Show ranking/leaderboard for this exam
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateExam;
