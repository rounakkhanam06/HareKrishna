import { Suspense } from 'react';
import AppRouter from '@core/routes/AppRouter';
import { AuthProvider } from '@core/context/AuthContext';
import { SettingsProvider } from '@core/context/SettingsContext';
import { SupportUnreadProvider } from '@core/context/SupportUnreadContext';
import SeoHead from '@core/components/SeoHead';
import { ToastProvider } from './shared/components/ui/Toast';
import SkeletonPage from './shared/components/ui/Skeleton';
import ErrorBoundary from './shared/components/ErrorBoundary';
import LenisScroll from './shared/components/LenisScroll';
import NetworkStatusListener from './shared/components/NetworkStatusListener';
import GlobalSplash from './shared/components/ui/GlobalSplash';

import GoogleTranslateLoader from './shared/components/GoogleTranslateLoader';

function App() {
    return (
        <ErrorBoundary>
            <GoogleTranslateLoader />
            <AuthProvider>
                <SettingsProvider>
                    <SeoHead />
                    <ToastProvider>
                        <NetworkStatusListener />
                        <GlobalSplash>
                            <Suspense fallback={<SkeletonPage />}>
                                <SupportUnreadProvider>
                                    <LenisScroll />
                                    <AppRouter />
                                </SupportUnreadProvider>
                            </Suspense>
                        </GlobalSplash>
                    </ToastProvider>
                </SettingsProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;
