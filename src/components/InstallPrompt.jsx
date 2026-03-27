import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
    const [installEvent, setInstallEvent] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallEvent(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsVisible(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!installEvent) return;
        
        installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        
        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setInstallEvent(null);
    };

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '400px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            color: '#fff'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#38bdf8' }}>
                    cloud_download
                </span>
                <div>
                    <strong style={{ display: 'block', fontSize: '14px' }}>Install Weather App</strong>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>Get real-time alerts on your home screen.</span>
                </div>
            </div>
            <button 
                onClick={handleInstallClick}
                style={{
                    backgroundColor: '#38bdf8',
                    color: '#0f172a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px'
                }}
            >
                Install
            </button>
        </div>
    );
};

export default InstallPrompt;