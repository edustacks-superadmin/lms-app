'use client';

import React from 'react';
import CourseManageSidebar from '../../../components/CourseManageSidebar';

export default function CourseLayout({ children, params }) {
    // In Next.js 15+, params is a Promise.
    // However, layouts in the app directory that are Server Components receive params.
    // If this is a Client Component (which it is, due to 'use client'), 
    // valid patterns include using React.use(params) or just receiving it if passed down.
    // Next.js passes promised params to layouts too.
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-white">
            <CourseManageSidebar courseId={id} />
            <main className="lg:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}
