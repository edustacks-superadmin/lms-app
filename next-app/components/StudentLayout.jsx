import React from 'react';
import ProtectedLayout from './ProtectedLayout';
import { ToastProvider } from '../context/ToastContext';
import { SidebarProvider } from '../context/SidebarContext';
import MobileBottomNav from './MobileBottomNav';
import StudentSidebar from './StudentSidebar';
import PageTransition from './PageTransition';

const StudentLayout = ({ children }) => {
    return (
        <SidebarProvider>
            <ProtectedLayout allowedRoles={['student']}>
                <ToastProvider>
                    <StudentSidebar />
                    <PageTransition>
                        {children}
                        <div className="h-24 md:hidden" />
                    </PageTransition>
                    <MobileBottomNav />
                </ToastProvider>
            </ProtectedLayout>
        </SidebarProvider>
    );
};

export default StudentLayout;
