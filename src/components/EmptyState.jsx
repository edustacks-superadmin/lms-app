import React from 'react';
import { BookOpen, GraduationCap, Bookmark, BarChart3 } from 'lucide-react';

const EmptyState = ({ icon: Icon, title, description, actionButton }) => {
    const getDefaultIcon = () => {
        if (Icon) return Icon;
        return BookOpen;
    };

    const DisplayIcon = getDefaultIcon();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            textAlign: 'center',
            minHeight: '400px'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <DisplayIcon size={36} color="#9ca3af" />
            </div>

            <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: '0 0 8px 0'
            }}>
                {title}
            </h3>

            <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 24px 0',
                maxWidth: '400px',
                lineHeight: '1.6'
            }}>
                {description}
            </p>

            {actionButton && (
                <div>{actionButton}</div>
            )}
        </div>
    );
};

export default EmptyState;
