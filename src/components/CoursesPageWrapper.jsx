import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import CourseList from './CourseList';

const CoursesPageWrapper = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('status') === 'archived' ? 'archived' : 'published';
    const [selectedTags, setSelectedTags] = useState([]);
    const [sortBy, setSortBy] = useState('');

    const handleTabChange = (tab) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (tab === 'archived') {
                next.set('status', 'archived');
            } else {
                next.delete('status');
            }
            next.set('page', '1');
            return next;
        });
    };

    return (
        <>
            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onApplyFilters={() => {}}
            />
            <div className="content-area">
                <CourseList
                    activeTab={activeTab}
                    selectedTags={selectedTags}
                    sortBy={sortBy}
                />
            </div>
        </>
    );
};

export default CoursesPageWrapper;
