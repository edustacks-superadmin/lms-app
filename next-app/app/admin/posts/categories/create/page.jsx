'use client';

import React from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import PostsSidebar from '../../../../../components/PostsSidebar';
import CreateCategory from '../../../../../components/CreateCategory';

const CreateCategoryPage = () => {
    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <PostsSidebar
                    onFilterChange={() => { }}
                    activeStatus="published"
                    onStatusChange={() => { }}
                />
                <main className="lg:ml-64 p-8">
                    <CreateCategory />
                </main>
            </div>
        </AdminLayout>
    );
};

export default CreateCategoryPage;
