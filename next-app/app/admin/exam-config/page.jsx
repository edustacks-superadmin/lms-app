'use client';

import React from 'react';
import AdminExamConfig from '../../../components/AdminExamConfig';
import ProtectedLayout from '../../../components/ProtectedLayout';

const ExamConfigPage = () => {
    return (
        <ProtectedLayout role="admin">
            <AdminExamConfig />
        </ProtectedLayout>
    );
};

export default ExamConfigPage;
