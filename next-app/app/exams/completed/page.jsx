'use client';

import React from 'react';
import ExamsPage from '../../../components/ExamsPage';

const CompletedExamsPage = () => {
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '0', display: 'flex' }}>
            <ExamsPage initialTab="completed" />
        </div>
    );
};

export default CompletedExamsPage;
