'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import CourseList from '../../components/CourseList';
import { useCourses } from '../../context/CourseContext';

const CoursesPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [sortBy, setSortBy] = useState('');
    const { filterByTags } = useCourses();

    const paramsTags = searchParams.get('tags');
    const selectedTags = useMemo(() => {
        return paramsTags ? paramsTags.split(',').map(Number).filter(Boolean) : [];
    }, [paramsTags]);

    // Track initial mount to prevent double fetching (CourseList handles init)
    const isFirstRun = React.useRef(true);

    // Trigger server-side filter when tags change (via URL)
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        filterByTags(selectedTags);
    }, [selectedTags]);

    const handleTagsChange = (newTags) => {
        const params = new URLSearchParams(searchParams);
        if (newTags.length === 0) {
            params.delete('tags');
        } else {
            params.set('tags', newTags.join(','));
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar
                selectedTags={selectedTags}
                onTagsChange={handleTagsChange}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onApplyFilters={() => {
                    // Filters apply automatically when tags change
                }}
            />
            <main className="lg:ml-64 p-8">
                <CourseList
                    sortBy={sortBy}
                />
            </main>
        </div>
    );
};

export default CoursesPage;
