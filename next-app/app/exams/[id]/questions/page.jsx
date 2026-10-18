'use client';

import React from 'react';
import ExamQuestions from '../../../../components/ExamQuestions';

const ExamQuestionsPage = ({ params }) => {
    const resolvedParams = React.use(params);
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            <ExamQuestions examId={resolvedParams.id} />
        </div>
    );
};

export default ExamQuestionsPage;
