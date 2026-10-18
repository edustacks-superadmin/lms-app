'use client';

import React from 'react';
import StudentProgressReport from '../../../../components/StudentProgressReport';

const StudentProgressPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="bg-white min-h-screen">
            <StudentProgressReport studentId={id} />
        </div>
    );
};

export default StudentProgressPage;
