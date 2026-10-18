'use client';

import React from 'react';
import CreateBatch from '../../../components/CreateBatch';

const CreateBatchPage = () => {
    return (
        <div className="bg-slate-50 min-h-screen">
            <React.Suspense fallback={<div>Loading...</div>}>
                <CreateBatch />
            </React.Suspense>
        </div>
    );
};

export default CreateBatchPage;
