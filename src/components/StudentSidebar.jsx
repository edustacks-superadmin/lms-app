import React from 'react';
import { User, LogOut, Bookmark, BarChart2, MessageSquare, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';

const StudentSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = useAuth();
    const { isSidebarOpen, closeSidebar } = useSidebar();

    const isActive = (path) => location.pathname === path;

    const getButtonStyle = (path) => {
        return isActive(path)
            ? { justifyContent: 'flex-start', width: '100%' }
            : { justifyContent: 'flex-start', width: '100%', color: 'var(--text-secondary)', background: 'transparent' };
    };

    const getButtonClass = (path) => {
        return isActive(path) ? 'btn btn-primary' : 'btn';
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/home');
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={closeSidebar}
            />

            <aside className={`student-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="mobile-close-btn">
                    <button onClick={closeSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingTop: '20px' }}>
                    <button
                        className={getButtonClass('/student/bookmarks')}
                        style={getButtonStyle('/student/bookmarks')}
                        onClick={() => { navigate('/student/bookmarks'); closeSidebar(); }}
                    >
                        <Bookmark size={18} /> Bookmarks
                    </button>

                    <button
                        className={getButtonClass('/student/analytics')}
                        style={getButtonStyle('/student/analytics')}
                        onClick={() => { navigate('/student/analytics'); closeSidebar(); }}
                    >
                        <BarChart2 size={18} /> Analytics
                    </button>

                    <button
                        className={getButtonClass('/student/profile')}
                        style={getButtonStyle('/student/profile')}
                        onClick={() => { navigate('/student/profile'); closeSidebar(); }}
                    >
                        <User size={18} /> Profile
                    </button>

                    <button
                        className={getButtonClass('/student/posts')}
                        style={getButtonStyle('/student/posts')}
                        onClick={() => { navigate('/student/posts'); closeSidebar(); }}
                    >
                        <MessageSquare size={18} /> Posts
                    </button>

                    <button
                        className="btn"
                        style={{ justifyContent: 'flex-start', width: '100%', color: '#ef4444', background: 'transparent' }}
                        onClick={handleLogout}
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default StudentSidebar;
