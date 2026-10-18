'use client';

import React from 'react';
import AdminLayout from '../../../../../../components/AdminLayout';
import PostsSidebar from '../../../../../../components/PostsSidebar';
import EditCategory from '../../../../../../components/EditCategory';

const EditCategoryPage = ({ params }) => {
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <PostsSidebar
                    onFilterChange={() => { }}
                    activeStatus="published"
                    onStatusChange={() => { }}
                />
                <main className="lg:ml-64 p-8">
                    <EditCategory categoryId={id} />
                </main>
            </div>
        </AdminLayout>
    );
};

export default EditCategoryPage;
