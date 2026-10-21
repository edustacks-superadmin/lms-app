import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, ShoppingCart, Trophy } from 'lucide-react';

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/student/exams') {
            return location.pathname === '/student/exams' || location.pathname.startsWith('/student/exam/');
        }
        return location.pathname === path;
    };

    const navItems = [
        { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/student/courses', icon: BookOpen, label: 'My Courses' },
        { path: '/student/exams', icon: FileText, label: 'Exams' },
        { path: '/student/store', icon: ShoppingCart, label: 'Store' },
        { path: '/student/ranking', icon: Trophy, label: 'Ranking' }
    ];

    return (
        <div className="mobile-bottom-nav">
            {navItems.map((item, index) => {
                const active = item.path ? isActive(item.path) : false;
                return (
                    <button
                        key={index}
                        onClick={() => item.action ? item.action() : navigate(item.path)}
                        className={`nav-item ${active ? 'active' : ''}`}
                    >
                        <item.icon size={24} strokeWidth={active ? 2.5 : 2} />
                        <span className="nav-label">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MobileBottomNav;
