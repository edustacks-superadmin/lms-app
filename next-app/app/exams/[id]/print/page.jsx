import React from 'react';
import PrintExam from '../../../../components/PrintExam';

const PrintExamPage = ({ params }) => {
    const resolvedParams = React.use(params);

    return (
        <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '0' }}>
            <PrintExam examId={resolvedParams.id} />
        </div>
    );
};

export default PrintExamPage;
