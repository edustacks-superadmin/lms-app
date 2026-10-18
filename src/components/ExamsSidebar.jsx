import React from 'react';
import { Lock, Clock, CheckCircle, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExamsSidebar = () => {
    const navigate = useNavigate();

    return (
        <aside style={{ width: '250px', flexShrink: 0, padding: '20px 16px 20px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                    className="btn btn-success"
                    style={{ justifyContent: 'center', width: '100%', marginBottom: '16px' }}
                    onClick={() => navigate('/exams/create')}
                >
                    <List size={18} /> Create Exam
                </button>

                <button
                    className="btn btn-primary"
                    style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => navigate('/exams')}
                >
                    <Lock size={16} /> Running
                </button>
                <button
                    className="btn"
                    style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--primary-color)', background: 'transparent' }}
                    onClick={() => navigate('/exams/upcoming')}
                >
                    <Clock size={16} /> Upcoming
                </button>
                <button
                    className="btn"
                    style={{ justifyContent: 'flex-start', width: '100%', color: 'var(--primary-color)', background: 'transparent' }}
                    onClick={() => navigate('/exams/completed')}
                >
                    <CheckCircle size={16} /> Completed
                </button>
            </div>
        </aside>
    );
};

export default ExamsSidebar;
