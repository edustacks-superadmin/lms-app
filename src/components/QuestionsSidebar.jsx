import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { List, Navigation, AlertCircle, Folder, Tag } from 'lucide-react';

const QuestionsSidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { icon: List, label: 'Questions', path: '/questions' },
        { icon: Navigation, label: 'Directions', path: '/questions/directions', comingSoon: true },
        { icon: AlertCircle, label: 'Reported', path: '/questions/reported' },
        { icon: Folder, label: 'Folders', path: '/questions/folders' },
        { icon: Tag, label: 'Subjects', path: '/questions/subjects' }
    ];

    return (
        <aside style={{ width: '240px', flexShrink: 0, padding: '20px 16px 20px 24px', borderRight: '1px solid #eee' }}>
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isActive ? '#e7f7ff' : 'transparent',
                            color: isActive ? '#0088cc' : '#666',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '14px',
                            fontWeight: isActive ? '500' : '400',
                            transition: 'background 0.2s',
                            marginBottom: '4px'
                        }}
                        onMouseOver={(e) => {
                            if (!isActive) e.currentTarget.style.background = '#f5f5f5';
                        }}
                        onMouseOut={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <Icon size={18} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.comingSoon && (
                            <span style={{
                                fontSize: '9px',
                                backgroundColor: '#ffa726',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontWeight: 'bold'
                            }}>SOON</span>
                        )}
                    </button>
                );
            })}
        </aside>
    );
};

export default QuestionsSidebar;
