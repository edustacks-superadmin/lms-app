import React from 'react';
import ProtectedLayout from './ProtectedLayout';
import { ToastProvider } from '../context/ToastContext';
import MobileBottomNav from './MobileBottomNav';

const StudentLayout = ({ children }) => {
    return (
        <ProtectedLayout allowedRoles={['student']}>
            <ToastProvider>
                {children}
                <MobileBottomNav />
            </ToastProvider>
        </ProtectedLayout>
    );
};

export default StudentLayout;
