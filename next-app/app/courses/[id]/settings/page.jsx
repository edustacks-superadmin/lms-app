'use client';

import React from 'react';
import CourseSettings from '../../../../components/CourseSettings';


// Using React.use to unwrap params for Next.js 15+
const CourseSettingsPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <CourseSettings courseId={id} />
    );
};

export default CourseSettingsPage;
