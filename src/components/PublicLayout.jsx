import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';

const PublicLayout = ({ children }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <PublicHeader />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <PublicFooter />
        </div>
    );
};

export default PublicLayout;
