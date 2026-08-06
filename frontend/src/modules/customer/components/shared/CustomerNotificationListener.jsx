import React, { useEffect } from 'react';
import { useAuth } from '@core/context/AuthContext';
import { useToast } from '@shared/components/ui/Toast';
import { onNotificationNew } from '@core/services/orderSocket';

const CustomerNotificationListener = () => {
    const { token, role } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (!token || role !== 'customer') return undefined;

        const getToken = () => token;

        const handleNotification = (data) => {
            const payload = data?.payload || data;
            if (payload && (payload.body || payload.title)) {
                showToast(`${payload.title || 'Notification'}: ${payload.body || ''}`, "info");
            }
        };

        const offNotification = onNotificationNew(getToken, handleNotification);

        return () => {
            if (typeof offNotification === 'function') {
                offNotification();
            }
        };
    }, [token, role, showToast]);

    return null;
};

export default CustomerNotificationListener;
