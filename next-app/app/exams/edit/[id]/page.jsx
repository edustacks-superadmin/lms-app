'use client';

import React from 'react';
import CreateExam from '../../../../components/CreateExam';

const EditExamPage = ({ params }) => {
    const resolvedParams = React.use(params);
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            <CreateExam examId={resolvedParams.id} />
        </div>
    );
};

export default EditExamPage;
