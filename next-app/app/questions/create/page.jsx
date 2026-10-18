'use client';

import React, { Suspense } from 'react';
import CreateQuestion from '../../../components/CreateQuestion';

const CreateQuestionPage = () => {
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '20px' }}>
            <Suspense fallback={<div>Loading...</div>}>
                <CreateQuestion />
            </Suspense>
        </div>
    );
};

export default CreateQuestionPage;
