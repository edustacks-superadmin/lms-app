'use client';

import React from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import PostsSidebar from '../../../../../components/PostsSidebar';
import CreatePost from '../../../../../components/CreatePost';

const EditPostPage = ({ params }) => {
    const resolvedParams = React.use(params);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-slate-50">
                <PostsSidebar
                    onFilterChange={() => { }}
                    activeStatus="published"
                    onStatusChange={() => { }}
                />
                <main className="lg:ml-64 p-8">
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    }>
                        <CreatePost id={resolvedParams.id} />
                    </React.Suspense>
                </main>
            </div>
        </AdminLayout>
    );
};

export default EditPostPage;
