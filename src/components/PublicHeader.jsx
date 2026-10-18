import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { Menu, X } from 'lucide-react';

const PublicHeader = () => {
    const navigate = useNavigate();
    const { settings } = useHomeSettings(); // For signup_link_text
    const { institute } = useInstitute(); // For name, logo, slogan
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    return (
        <header style={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {/* Logo + Institute Name */}
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    onClick={() => navigate('/home')}
                >
                    {institute?.logo_url ? (
                        <img
                            src={institute.logo_url}
                            alt="Logo"
                            style={{ height: '40px', width: 'auto' }}
                        />
                    ) : (
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '20px'
                        }}>
                            {(institute?.name || 'Edustacks').charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            margin: 0,
                            color: '#1a1a1a'
                        }}>
                            {institute?.name || 'Edustacks'}
                        </h1>
                        {institute?.slogan && (
                            <p style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: 0
                            }}>
                                {institute.slogan}
                            </p>
                        )}
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }} className="desktop-nav">
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>
                        Don't have an account?
                    </span>
                    <button
                        onClick={() => navigate('/student/signup')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            color: 'var(--primary-color)',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        {settings?.signup_link_text || 'Sign Up'}
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Login
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    style={{
                        display: 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px'
                    }}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu" style={{
                    display: 'none',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px 20px',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: 'white'
                }}>
                    <button
                        onClick={() => {
                            navigate('/student/signup');
                            setMobileMenuOpen(false);
                        }}
                        style={{
                            padding: '10px',
                            backgroundColor: 'transparent',
                            color: 'var(--primary-color)',
                            border: '1px solid var(--primary-color)',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        {settings?.signup_link_text || 'Sign Up'}
                    </button>
                    <button
                        onClick={() => {
                            navigate('/login');
                            setMobileMenuOpen(false);
                        }}
                        style={{
                            padding: '10px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        Login
                    </button>
                </div>
            )}

            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav {
                        display: none !important;
                    }
                    .mobile-menu-btn {
                        display: block !important;
                    }
                    .mobile-menu {
                        display: flex !important;
                    }
                }
            `}</style>
        </header>
    );
};

export default PublicHeader;
