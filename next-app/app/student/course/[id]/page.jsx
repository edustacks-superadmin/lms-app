'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import StudentCourseChapters from '../../../../components/StudentCourseChapters';

const CourseChaptersPage = () => {
    const params = useParams();
    // In Next.js 15, params might be a promise, but for client components usually it's unwrapped hook
    // However, if params is null, we handle it.
    // Wait, in App Router client components, useParams() usually works directly.

    if (!params) return null;

    return <StudentCourseChapters courseId={params.id} />;
};

export default CourseChaptersPage;
