import React from 'react';
import ProtectedLayout from './ProtectedLayout';

const AdminLayout = ({ children }) => {
    return (
        <ProtectedLayout allowedRoles={['admin', 'staff', 'mentor']}>
            {children}
        </ProtectedLayout>
    );
};

export default AdminLayout;
