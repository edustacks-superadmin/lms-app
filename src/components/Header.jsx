import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, FileText, Users, PenTool, BarChart2, Bell, User, MessageSquare, Wrench, LogOut } from 'lucide-react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useInstitute } from '../context/InstituteContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const Header = () => {
    const { institute } = useInstitute();
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMembershipsOpen, setIsMembershipsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: member } = await supabase
                        .from('members')
                        .select('*')
                        .eq('email', user.email)
                        .single();

                    if (member) {
                        setCurrentUser({
                            name: member.display_name || 'User',
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
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/home');
    };

    const getLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        color: isActive ? 'var(--white)' : 'var(--text-light)',
        fontWeight: isActive ? '500' : '400',
        background: isActive ? 'var(--primary-color)' : 'transparent',
        padding: '8px 12px',
        borderRadius: '4px'
    });

    return (
        <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', width: '100%', padding: '0 40px' }}>

                {/* Logo Area */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
                        {institute?.logo_url ? (
                            <img src={institute.logo_url} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        ) : institute?.name ? (
                            <div style={{ width: '40px', height: '40px', border: '2px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px' }}>
                                {institute.name.substring(0, 2).toUpperCase()}
                            </div>
                        ) : null}
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1' }}>
                            <span style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '1px' }}>
                                {institute?.name?.toUpperCase() || ''}
                            </span>
                            <span style={{ fontSize: '8px', fontWeight: 'bold', letterSpacing: '2px' }}>
                                {institute?.slogan?.toUpperCase() || ''}
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <NavLink to="/courses" style={getLinkStyle}>
                        <FileText size={18} /> Courses
                    </NavLink>
                    <NavLink to="/exams" style={getLinkStyle}>
                        <PenTool size={18} /> Exams
                    </NavLink>
                    <NavLink to="/questions" style={getLinkStyle}>
                        <FileText size={18} /> Questions
                    </NavLink>
                    <NavLink to="/store" style={getLinkStyle}>
                        <ShoppingCart size={18} /> Store
                    </NavLink>
                    <div
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setIsMembershipsOpen(true)}
                        onMouseLeave={() => setIsMembershipsOpen(false)}
                    >
                        <a
                            href="#"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--text-light)',
                                padding: '8px 12px',
                                borderRadius: '4px'
                            }}
                        >
                            <Users size={18} /> Memberships <span style={{ fontSize: '10px' }}>▼</span>
                        </a>

                        {isMembershipsOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                minWidth: '200px',
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                padding: '8px 0',
                                marginTop: '4px'
                            }}>
                                <Link to="/members" style={{
                                    display: 'block',
                                    padding: '8px 16px',
                                    color: 'var(--primary-color)',
                                    textDecoration: 'none',
                                    fontSize: '14px'
                                }} className="dropdown-item">
                                    Members Management
                                </Link>
                                <Link to="/batches" style={{
                                    display: 'block',
                                    padding: '8px 16px',
                                    color: 'var(--primary-color)',
                                    textDecoration: 'none',
                                    fontSize: '14px'
                                }} className="dropdown-item">
                                    Batch Management
                                </Link>
                                <a href="#" style={{
                                    display: 'block',
                                    padding: '8px 16px',
                                    color: 'var(--primary-color)',
                                    textDecoration: 'none',
                                    fontSize: '14px'
                                }} className="dropdown-item">
                                    Roles Management
                                </a>
                            </div>
                        )}
                    </div>
                    <NavLink to="/posts" style={getLinkStyle}>
                        <PenTool size={18} /> Posts
                    </NavLink>

                </nav>

                {/* User Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e0e0e0' }}></div>
                    <Search size={20} color="var(--primary-color)" />

                    {/* Profile Dropdown Container */}
                    <div
                        style={{ position: 'relative' }}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#333' }}>
                                {currentUser?.photo ? (
                                    <img src={currentUser.photo} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                        {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                )}
                            </div>
                            <span style={{ fontWeight: '500', fontSize: '14px', color: 'var(--primary-color)' }}>{currentUser?.name || 'User'}</span>
                            <span style={{ fontSize: '10px' }}>▼</span>
                        </div>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '120%',
                                right: 0,
                                width: '200px',
                                backgroundColor: 'white',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid #e0e0e0' }}>
                                    <div style={{ fontSize: '12px', color: '#666' }}>Signed in as</div>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>{currentUser?.name || 'User'}</div>
                                </div>

                                <div style={{ padding: '8px 0' }}>
                                    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', color: '#333', textDecoration: 'none', fontSize: '14px' }} className="dropdown-item">
                                        <MessageSquare size={16} /> Comments
                                    </a>
                                    <Link to="/settings/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', color: '#333', textDecoration: 'none', fontSize: '14px' }} className="dropdown-item">
                                        <Wrench size={16} /> Settings
                                    </Link>
                                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', color: '#333', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: '14px' }} className="dropdown-item">
                                        <LogOut size={16} /> Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </header>
    );
};

export default Header;
