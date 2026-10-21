import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ForbiddenView = ({ message, onClose }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const displayMessage = message || searchParams.get('message') || 'This course is only available on mobile app.';

    const handleBack = () => {
        if (onClose) {
            onClose();
        } else if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/student/dashboard');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#ffffff',
            padding: '48px 60px',
            boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            color: '#212529',
            position: onClose ? 'fixed' : 'relative',
            inset: onClose ? 0 : 'auto',
            zIndex: onClose ? 999999 : 'auto',
            overflowY: 'auto'
        }}>
            <h1 style={{
                fontSize: '38px',
                fontWeight: '700',
                margin: '0 0 24px 0',
                lineHeight: 1.2,
                color: '#212529',
                letterSpacing: '-0.5px'
            }}>
                403 Forbidden :(
            </h1>

            <div style={{
                borderLeft: '2px solid #212529',
                paddingLeft: '14px',
                margin: 0
            }}>
                <p style={{
                    fontSize: '14px',
                    margin: '0 0 6px 0',
                    color: '#212529',
                    lineHeight: '1.5'
                }}>
                    Sorry, but your request was forbidden by the server.
                </p>
                <p style={{
                    fontSize: '14px',
                    margin: 0,
                    color: '#212529',
                    lineHeight: '1.5'
                }}>
                    {displayMessage}
                </p>
            </div>
        </div>
    );
};

export default ForbiddenView;
