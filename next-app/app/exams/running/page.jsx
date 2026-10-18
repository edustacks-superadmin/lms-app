'use client';

import React from 'react';
import ExamsPage from '../../../components/ExamsPage';

const RunningExamsPage = () => {
    return (
        <div style={{ backgroundColor: 'white', minHeight: '100vh', padding: '0', display: 'flex' }}>
            <ExamsPage initialTab="running" />
        </div>
    );
};

export default RunningExamsPage;
