'use client';

import React from 'react';
import BatchManagement from '../../components/BatchManagement';

const BatchManagementPage = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* You might want to wrap this in an AdminLayout if you have one, 
                or ensure the Sidebar is present in the root layout or here.
                For now, mapping directly to component. */}
            <BatchManagement />
        </div>
    );
};

export default BatchManagementPage;
