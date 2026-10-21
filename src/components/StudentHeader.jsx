import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, BookOpen, ShoppingCart, LayoutDashboard, Trophy, Menu, FileText } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { useSidebar } from '../context/SidebarContext';
import { useCart } from '../context/CartContext';

const StudentHeader = () => {
    const { institute } = useInstitute();
    const { signOut, user: authUser } = useAuth();
    const { toggleSidebar } = useSidebar();
    const { cartCount, openCart } = useCart();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);

    const isActive = (path) => {
        if (path === '/student/exams') {
            return location.pathname === '/student/exams' || location.pathname.startsWith('/student/exam/');
        }
        return location.pathname === path;
    };

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                // For mock user
                if (authUser?.email === 'student@demo.com') {
                    setCurrentUser({
                        name: authUser.user_metadata?.full_name || 'Demo Student',
                        email: authUser.email,
                        photo: null
                    });
                    return;
                }

                // For real users
                if (authUser) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('*')
                        .eq('email', authUser.email)
                        .single();

                    if (member) {
                        setCurrentUser({
                            name: member.display_name || 'Student',
                            email: member.email,
                            photo: member.photo_url
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, [authUser]);

    const handleLogout = async () => {
        await signOut();
        navigate('/home');
    };

    return (
        <header className="student-header">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '100%',
                width: '100%',
                padding: '0 40px'
            }}>
                {/* Logo and Institute Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className="mobile-menu-btn"
                        onClick={toggleSidebar}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-color)',
                            display: 'none', // Hidden by default, shown via CSS on mobile
                            marginRight: '8px'
                        }}
                    >
                        <Menu size={24} />
                    </button>
                    <Link to="/student/dashboard" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        color: 'inherit'
                    }}>
                        {institute?.logo_url ? (
                            <img
                                src={institute.logo_url}
                                alt="Logo"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'contain'
                                }}
                            />
                        ) : institute?.name ? (
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '2px solid #333',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '20px'
                            }}>
                                {institute.name.substring(0, 2).toUpperCase()}
                            </div>
                        ) : null}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            lineHeight: '1'
                        }}>
                            <span style={{
                                fontWeight: '900',
                                fontSize: '14px',
                                letterSpacing: '1px'
                            }}>
                                {institute?.name?.toUpperCase() || ''}
                            </span>
                            <span style={{
                                fontSize: '8px',
                                fontWeight: 'bold',
                                letterSpacing: '2px'
                            }}>
                                {institute?.slogan?.toUpperCase() || ''}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="desktop-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                        to="/student/dashboard"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: isActive('/student/dashboard') ? '#2563eb' : '#4b5563',
                            backgroundColor: isActive('/student/dashboard') ? '#eff6ff' : 'transparent',
                            fontWeight: '500',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive('/student/dashboard')) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive('/student/dashboard')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Link>

                    <Link
                        to="/student/courses"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: isActive('/student/courses') ? '#2563eb' : '#4b5563',
                            backgroundColor: isActive('/student/courses') ? '#eff6ff' : 'transparent',
                            fontWeight: '500',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive('/student/courses')) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive('/student/courses')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <BookOpen size={18} />
                        My Courses
                    </Link>

                    <Link
                        to="/student/exams"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: isActive('/student/exams') ? '#2563eb' : '#4b5563',
                            backgroundColor: isActive('/student/exams') ? '#eff6ff' : 'transparent',
                            fontWeight: '500',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive('/student/exams')) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive('/student/exams')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <FileText size={18} />
                        Exams
                    </Link>

                    <Link
                        to="/student/store"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: isActive('/student/store') ? '#2563eb' : '#4b5563',
                            backgroundColor: isActive('/student/store') ? '#eff6ff' : 'transparent',
                            fontWeight: '500',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive('/student/store')) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive('/student/store')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <ShoppingCart size={18} />
                        Store
                    </Link>

                    <Link
                        to="/student/ranking"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: isActive('/student/ranking') ? '#2563eb' : '#4b5563',
                            backgroundColor: isActive('/student/ranking') ? '#eff6ff' : 'transparent',
                            fontWeight: '500',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive('/student/ranking')) {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive('/student/ranking')) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }
                        }}
                    >
                        <Trophy size={18} />
                        Ranking
                    </Link>
                </div>

                {/* User Profile Section */}
                <div className="desktop-profile-section" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Cart Trigger Button */}
                    <button
                        onClick={openCart}
                        style={{
                            position: 'relative',
                            background: 'none',
                            border: '1px solid #e2e8f0',
                            padding: '7px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#334155',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.borderColor = '#93c5fd';
                            e.currentTarget.style.color = '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#334155';
                        }}
                        title="View Cart"
                    >
                        <ShoppingCart size={17} />
                        <span>Cart</span>
                        {cartCount > 0 && (
                            <span style={{
                                backgroundColor: '#2563eb',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                minWidth: '16px',
                                textAlign: 'center',
                                lineHeight: '14px'
                            }}>
                                {cartCount}
                            </span>
                        )}
                    </button>

                    <span style={{
                        fontWeight: '600',
                        fontSize: '14px',
                        color: 'var(--text-color)'
                    }}>
                        {currentUser?.name || 'Student'}
                    </span>

                    {/* Profile Container - Navigates to Profile on click */}
                    <div
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onClick={() => navigate('/student/profile')}
                        title="View Profile"
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                backgroundColor: '#333'
                            }}>
                                {currentUser?.photo ? (
                                    <img
                                        src={currentUser.photo}
                                        alt={currentUser.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}>
                                        {currentUser?.name?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-light)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StudentHeader;
