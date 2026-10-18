'use client';

import React from 'react';
import ExamStatistics from '../../../../components/ExamStatistics';

const ExamStatisticsPage = ({ params }) => {
    const resolvedParams = React.use(params);
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            <ExamStatistics examId={resolvedParams.id} />
        </div>
    );
};

export default ExamStatisticsPage;
