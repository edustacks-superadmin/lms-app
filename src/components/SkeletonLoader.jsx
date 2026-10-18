import React from 'react';

export const SkeletonCard = () => (
    <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e5e7eb',
        animation: 'pulse 1.5s ease-in-out infinite'
    }}>
        <div style={{
            height: '20px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '12px',
            width: '60%'
        }} />
        <div style={{
            height: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px'
        }} />
        <div style={{
            height: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            width: '80%'
        }} />
    </div>
);

export const SkeletonStats = () => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
    }}>
        {[1, 2, 3].map(i => (
            <div key={i} style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '8px',
                    marginBottom: '12px'
                }} />
                <div style={{
                    height: '32px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '50%'
                }} />
                <div style={{
                    height: '14px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    width: '70%'
                }} />
            </div>
        ))}
    </div>
);

export const SkeletonList = ({ count = 3 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                gap: '16px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '8px',
                    flexShrink: 0
                }} />
                <div style={{ flex: 1 }}>
                    <div style={{
                        height: '18px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        width: '70%'
                    }} />
                    <div style={{
                        height: '14px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        marginBottom: '6px'
                    }} />
                    <div style={{
                        height: '14px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        width: '50%'
                    }} />
                </div>
            </div>
        ))}
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
    }}>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{
                padding: '16px',
                borderBottom: i < rows - 1 ? '1px solid #e5e7eb' : 'none',
                display: 'flex',
                gap: '16px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '50%',
                    flexShrink: 0
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                        height: '16px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '4px',
                        width: '40%'
                    }} />
                    <div style={{
                        height: '14px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        width: '60%'
                    }} />
                </div>
            </div>
        ))}
    </div>
);
