'use client';

import React from 'react';
import PublicProductList from '../../components/PublicProductList';

const StorePage = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <main className="p-8">
                <React.Suspense fallback={
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                }>
                    <PublicProductList />
                </React.Suspense>
            </main>
        </div>
    );
};

export default StorePage;
