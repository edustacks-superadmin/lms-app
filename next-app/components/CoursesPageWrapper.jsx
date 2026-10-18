import React, { useState } from 'react';
import Sidebar from './Sidebar';
import CourseList from './CourseList';

const CoursesPageWrapper = () => {
    const [selectedTags, setSelectedTags] = useState([]);
    const [sortBy, setSortBy] = useState('');

    return (
        <>
            <Sidebar
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onApplyFilters={() => {
                    // Filters are applied automatically via state
                    // This button is here for UX but filters update in real-time
                }}
            />
            <div className="content-area">
                <CourseList
                    selectedTags={selectedTags}
                    sortBy={sortBy}
                />
            </div>
        </>
    );
};

export default CoursesPageWrapper;
