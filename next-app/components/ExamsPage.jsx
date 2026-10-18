'use client';

import React, { useState, useMemo } from 'react';
import { Lock, Clock, CheckCircle, List } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useExams } from '../context/ExamContext';
import ExamList from './ExamList';

const ExamsPage = ({ initialTab = 'running' }) => {
    const router = useRouter();
    const { exams } = useExams();
    const [activeTab] = useState(initialTab);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);

    // Get exam status based on dates
    const getExamStatus = (exam) => {
        const now = new Date();
        const startDate = exam.start_date ? new Date(exam.start_date) : null;
        const endDate = exam.end_date ? new Date(exam.end_date) : null;

        if (!startDate) return 'running';

        if (endDate && now > endDate) {
            return 'completed';
        } else if (now < startDate) {
            return 'upcoming';
        } else {
            return 'running';
        }
    };

    // Get counts for each category
    const examCounts = useMemo(() => {
        const counts = { running: 0, upcoming: 0, completed: 0 };
        exams.forEach(exam => {
            const status = getExamStatus(exam);
            counts[status]++;
        });
        return counts;
    }, [exams]);

    // Get unique courses from all exams
    const allCourses = useMemo(() => {
        const coursesMap = new Map();
        exams.forEach(exam => {
            if (exam.course_exams && exam.course_exams.length > 0) {
                exam.course_exams.forEach(ce => {
                    if (ce.courses) {
                        coursesMap.set(ce.courses.id, ce.courses.title);
                    }
                });
            }
        });
        return Array.from(coursesMap, ([id, title]) => ({ id, title }));
    }, [exams]);

    // Get unique tags from all exams
    const allTags = useMemo(() => {
        const tagsSet = new Set();
        exams.forEach(exam => {
            if (exam.tags && Array.isArray(exam.tags)) {
                exam.tags.forEach(tag => tagsSet.add(tag));
            }
        });
        return Array.from(tagsSet);
    }, [exams]);

    const toggleCourse = (courseId) => {
        setSelectedCourses(prev =>
            prev.includes(courseId)
                ? prev.filter(id => id !== courseId)
                : [...prev, courseId]
        );
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    return (
        <>
            {/* Main Content */}
            <div className="content-area" style={{ flex: 1, padding: '20px' }}>
                <ExamList
                    activeTab={activeTab}
                    selectedCourses={selectedCourses}
                    selectedTags={selectedTags}
                />
            </div>
        </>
    );
};

export default ExamsPage;
