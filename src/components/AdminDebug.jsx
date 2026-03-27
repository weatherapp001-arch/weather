// Line 1: Admin Debug Panel for System Health and Data Validation
import React, { useState, useEffect } from 'react';

/**
 * @function AdminDebug
 * @param {boolean} isAdmin - Authorization flag
 * @param {object} weatherData - Raw JSON from useWeatherData hook
 */
const AdminDebug = ({ isAdmin, weatherData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState({
        notificationsSupported: false,
        fcmTokenExists: false
    });

    // Line 14: Check system status on mount
    useEffect(() => {
        if (isAdmin) {
            const hasSupport = 'Notification' in window;
            const hasToken = !!localStorage.getItem('fcm_token');
            setStatus({
                notificationsSupported: hasSupport,
                fcmTokenExists: hasToken
            });
        }
    }, [isAdmin]);

    // Line 25: Conditional Rendering - Hidden if not admin
    if (!isAdmin) return null;

    const triggerMockAlert = async () => {
        // Line 29: Trigger local browser notification via Service Worker
        if (status.notificationsSupported && Notification.permission === 'granted') {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification('Mock Weather Alert', {
                body: 'This is a test broadcast generated locally by the Admin Panel.',
                icon: '/weather-icon.png', // Ensure this path is correct in your public folder
                badge: '/badge-icon.png',
                tag: 'mock-debug'
            });
        } else {
            alert('Notifications not supported or permission denied.');
        }
    };

    const clearCache = () => {
        // Line 44: Wipe localStorage
        localStorage.clear();
        window.location.reload(); // Reload to reset app state
    };

    return (
        <>
            {/* Line 50: Floating Action Button (FAB) */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000,
                    backgroundColor: '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '56px',
                    height: '56px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <span className="material-icons">
                    {isOpen ? 'close' : 'terminal'}
                </span>
            </button>

            {/* Line 75: Debug Overlay Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '90px',
                    right: '20px',
                    width: '350px',
                    maxHeight: '70vh',
                    backgroundColor: '#1e1e1e',
                    color: '#00ff00', // Terminal Green
                    padding: '20px',
                    borderRadius: '12px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid #333' }}>
                        System Debugger
                    </h3>

                    {/* Line 96: System Status Checklist */}
                    <div style={{ marginBottom: '15px' }}>
                        <p><strong>System Status:</strong></p>
                        <ul style={{ listStyle: 'none', paddingLeft: '5px' }}>
                            <li>
                                <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                                    {status.fcmTokenExists ? 'check_circle' : 'error'}
                                </span> 
                                FCM Token: {status.fcmTokenExists ? 'Generated' : 'Missing'}
                            </li>
                            <li>
                                <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                                    {status.notificationsSupported ? 'check_circle' : 'error'}
                                </span> 
                                Browser Support: {status.notificationsSupported ? 'Yes' : 'No'}
                            </li>
                        </ul>
                    </div>

                    {/* Line 114: Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button onClick={triggerMockAlert} style={btnStyle}>
                            Mock Alert
                        </button>
                        <button onClick={clearCache} style={{ ...btnStyle, backgroundColor: '#d32f2f' }}>
                            Clear Cache
                        </button>
                    </div>

                    {/* Line 123: Raw Weather Data Output */}
                    <p><strong>Raw Data Preview (useWeatherData):</strong></p>
                    <pre style={{ 
                        backgroundColor: '#000', 
                        padding: '10px', 
                        borderRadius: '4px',
                        overflowX: 'auto'
                    }}>
                        {JSON.stringify(weatherData, null, 2) || 'No data available'}
                    </pre>
                </div>
            )}
        </>
    );
};

// Line 139: Minimal Button Styling
const btnStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#0288d1',
    color: 'white',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold'
};

export default AdminDebug;