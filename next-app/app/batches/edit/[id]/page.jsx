'use client';

import React from 'react';
import CreateBatch from '../../../../components/CreateBatch';

const EditBatchPage = ({ params }) => {
    // React.use() or direct access depending on Next.js version (15+ usually requires await or React.use, but params prop is often usable directly in 14. In 15 it changed to Promise)
    // To be safe and future proof
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <div className="bg-slate-50 min-h-screen">
            <React.Suspense fallback={<div>Loading...</div>}>
                <CreateBatch batchId={id} />
            </React.Suspense>
        </div>
    );
};

export default EditBatchPage;
