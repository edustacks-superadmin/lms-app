import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { institute } = useInstitute();

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      return;
    }

    // Check if user dismissed it recently (e.g., within 24 hours)
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent automatic mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  const appName = institute?.name || 'Mahesh IES Academy';
  const logoUrl = institute?.logo_url || '/pwa-192x192.png';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '460px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 99999,
        border: '1px solid #e5e7eb',
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        <img
          src={logoUrl}
          alt={appName}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            objectFit: 'contain',
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            flexShrink: 0
          }}
          onError={(e) => {
            e.currentTarget.src = '/pwa-192x192.png';
          }}
        />
        <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '14px',
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Install {appName}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            Add to home screen for faster access & tests
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          style={{
            backgroundColor: 'var(--primary-color, #0088cc)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(0, 136, 204, 0.25)'
          }}
        >
          <Download size={15} />
          Install
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px'
          }}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
