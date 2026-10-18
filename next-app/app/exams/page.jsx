'use client';

import React from 'react';
import ExamsPage from '../../components/ExamsPage';

const ExamsPageWrapper = () => {
    return (
        <div className="bg-white min-h-screen flex p-0">
            <ExamsPage initialTab="running" />
        </div>
    );
};

export default ExamsPageWrapper;
