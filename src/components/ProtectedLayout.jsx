import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from './Header';
import StudentHeader from './StudentHeader';

const ProtectedLayout = ({ children, allowedRoles = [] }) => {
    const { user, role, loading } = useAuth();

    console.log('ProtectedLayout render:', { user: !!user, role, loading });

    if (loading) {
        console.log(' ProtectedLayout: Still loading...');
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontSize: '18px',
                color: '#666'
            }}>
                Loading...
            </div>
        );
    }

    // Only redirect to login if we're absolutely sure there's no user
    if (!user) {
        console.log('❌ ProtectedLayout: No user found, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    console.log('✅ ProtectedLayout: User authenticated, rendering content');

    // Role-based access control
    if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
        // Redirect based on role
        if (role === 'student') {
            return <Navigate to="/student/dashboard" replace />;
        } else {
            // Default fallback for other unauthorized roles
            return <Navigate to="/login" replace />;
        }
    }

    return (
        <div className="app-container">
            {/* Show StudentHeader for students, Header for admin/staff/mentor */}
            {role === 'student' ? <StudentHeader /> : <Header />}
            <div className="main-content">
                {children}
            </div>
        </div>
    );
};

export default ProtectedLayout;
