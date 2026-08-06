import axiosInstance from '@core/api/axios';

/**
 * Admin delivery-partner endpoints (lifecycle, active fleet).
 * Per-domain split (P4.5).
 */
export const adminDeliveryApi = {
    getDeliveryPartners: (params) =>
        axiosInstance.get('/admin/delivery-partners', { params }),
    approveDeliveryPartner: (id) =>
        axiosInstance.patch(`/admin/delivery-partners/approve/${id}`),
    rejectDeliveryPartner: (id) =>
        axiosInstance.delete(`/admin/delivery-partners/reject/${id}`),
    getActiveFleet: (params) =>
        axiosInstance.get('/admin/active-fleet', { params }),
    getDeliveryRatings: (params) =>
        axiosInstance.get('/admin/delivery-ratings', { params }),
    getDeliveryRatingById: (id) =>
        axiosInstance.get(`/admin/delivery-ratings/${id}`),
    moderateDeliveryRating: (id, status) =>
        axiosInstance.patch(`/admin/delivery-ratings/${id}`, { status }),
    verifyDocument: (riderId, docKey) =>
        axiosInstance.patch(`/delivery/documents/admin/${riderId}/verify/${docKey}`),
    rejectDocument: (riderId, docKey, reason) =>
        axiosInstance.patch(`/delivery/documents/admin/${riderId}/reject/${docKey}`, { reason }),
};

export default adminDeliveryApi;
