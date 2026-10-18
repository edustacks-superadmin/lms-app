'use client';

import React from 'react';
import CourseChapters from '../../../../components/CourseChapters';


// Using React.use to unwrap params for Next.js 15+
const CourseChaptersPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <CourseChapters />
    );
};

export default CourseChaptersPage;
