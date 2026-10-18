'use client';

import React, { Suspense } from 'react';
import CreateQuestion from '../../../../components/CreateQuestion';

const EditQuestionPage = ({ params }) => {
    const resolvedParams = React.use(params);
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            <Suspense fallback={<div>Loading...</div>}>
                <CreateQuestion questionId={resolvedParams.id} />
            </Suspense>
        </div>
    );
};

export default EditQuestionPage;
