import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';

const GlobalSplash = ({ children }) => {
    const { isLoading: authLoading } = useAuth();
    const { loading: settingsLoading, settings } = useSettings();
    const [showSplash, setShowSplash] = useState(true);

    const isAppLoading = authLoading || settingsLoading;

    useEffect(() => {
        if (!isAppLoading) {
            // Add a small delay to ensure smooth transition
            const timer = setTimeout(() => setShowSplash(false), 600);
            return () => clearTimeout(timer);
        } else {
            setShowSplash(true);
        }
    }, [isAppLoading]);

    return (
        <>
            <AnimatePresence>
                {showSplash && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
                    >
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="flex flex-col items-center"
                        >
                            {/* Logo */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 mb-6 rounded-3xl overflow-hidden shadow-2xl shadow-brand-200/50 relative bg-brand-50 p-2">
                                <img 
                                    src={settings?.logo || "/logo.jpeg"} 
                                    alt={settings?.appName || "App"} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                {/* Pulsing background if image fails or is loading */}
                                <div className="absolute inset-0 bg-brand-100/50 animate-pulse -z-10 rounded-3xl" />
                            </div>

                            {/* App Name */}
                            <h1 className="text-2xl sm:text-3xl font-[1000] text-slate-800 tracking-tight mb-2">
                                {settings?.appName || "Loading..."}
                            </h1>
                            
                            {/* Loading Indicator */}
                            <div className="flex items-center gap-2 mt-4">
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* App Content */}
            {!isAppLoading && children}
        </>
    );
};

export default GlobalSplash;
