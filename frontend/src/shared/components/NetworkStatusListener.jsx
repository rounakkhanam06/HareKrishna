import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Wifi, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useSettings } from '@core/context/SettingsContext';

const NetworkStatusListener = () => {
    const { settings } = useSettings();
    const appName = settings?.appName || 'HareKrishna';

    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const checkRealConnection = useCallback(async () => {
        setIsChecking(true);
        try {
            // Ping server health or lightweight static asset to verify true internet connectivity
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            
            const response = await fetch('/health?t=' + Date.now(), {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (response && (response.ok || response.status === 404)) {
                if (isOffline) {
                    setIsOffline(false);
                    setWasOffline(true);
                    setTimeout(() => setWasOffline(false), 3500);
                }
            } else if (!navigator.onLine) {
                setIsOffline(true);
            }
        } catch {
            if (!navigator.onLine) {
                setIsOffline(true);
            }
        } finally {
            setIsChecking(false);
        }
    }, [isOffline]);

    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
        };

        const handleOnline = () => {
            // On online event, verify with actual request to prevent false positives during network switching
            checkRealConnection();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        if (navigator.connection) {
            navigator.connection.addEventListener('change', checkRealConnection);
        }

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (navigator.connection) {
                navigator.connection.removeEventListener('change', checkRealConnection);
            }
        };
    }, [checkRealConnection]);

    return (
        <>
            {/* Reconnected Toast Notification */}
            <AnimatePresence>
                {!isOffline && wasOffline && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-semibold text-sm border border-emerald-500"
                    >
                        <CheckCircle2 size={18} className="text-white animate-bounce" />
                        <span>Back Online! Reconnected to {appName}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom App-Branded Offline / Network Disrupted Screen */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-outfit"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden"
                        >
                            {/* App Header Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-primary text-xs font-black uppercase tracking-wider mb-6">
                                <ShoppingBag size={14} className="text-primary" />
                                <span>{appName}</span>
                            </div>

                            {/* Disconnected Icon */}
                            <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-red-500 shadow-inner">
                                <WifiOff size={36} strokeWidth={2.2} />
                            </div>

                            {/* Content */}
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                                Connection Disrupted
                            </h2>
                            <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                                Your network switched or disconnected. Please check your WiFi or mobile data to reconnect to {appName}.
                            </p>

                            {/* Retry Action */}
                            <button
                                onClick={checkRealConnection}
                                disabled={isChecking}
                                className="w-full bg-primary hover:opacity-90 active:scale-95 text-white font-black py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider shadow-lg shadow-brand-100 disabled:opacity-50"
                            >
                                <RefreshCw size={16} className={isChecking ? 'animate-spin' : ''} />
                                {isChecking ? 'Checking Connection...' : 'Retry Connection'}
                            </button>

                            {/* Subtle Status */}
                            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-semibold">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span>Waiting for stable network...</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default NetworkStatusListener;
