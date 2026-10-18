import React from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import MobileBottomNav from './MobileBottomNav';

const PublicLayout = ({ children }) => {
    return (
        <div className="flex flex-col min-h-screen">
            <PublicHeader />
            <main className="flex-1">
                {children}
            </main>
            <MobileBottomNav />
            <PublicFooter />
        </div>
    );
};

export default PublicLayout;
