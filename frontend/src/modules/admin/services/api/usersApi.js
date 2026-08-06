import axiosInstance from '@core/api/axios';

/**
 * Admin user, seller, and reports endpoints.
 * Per-domain split (P4.5).
 */
export const adminUsersApi = {
    getStats: () => axiosInstance.get('/admin/stats'),
    getReports: () => axiosInstance.get('/admin/reports'),

    getUsers: (params) => axiosInstance.get('/admin/users', { params }),
    getUserById: (id) => axiosInstance.get(`/admin/users/${id}`),
    createUser: (data) => axiosInstance.post('/admin/users', data),
    updateUser: (id, data) => axiosInstance.put(`/admin/users/${id}`, data),
    updateUserStatus: (id, status) => axiosInstance.patch(`/admin/users/${id}/status`, { status }),
    verifyUserCard: (id, action) => axiosInstance.patch(`/admin/users/${id}/verify-card`, { action }),
    sendUserNotification: (id, payload) => axiosInstance.post(`/admin/users/${id}/notify`, payload),
    bulkUploadUsers: (formData) => axiosInstance.post('/admin/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    getInternalAdmins: () => axiosInstance.get('/admin/internal-users'),
    createInternalAdmin: (data) => axiosInstance.post('/admin/internal-users', data),
    updateInternalAdmin: (id, data) => axiosInstance.put(`/admin/internal-users/${id}`, data),
    deleteInternalAdmin: (id) => axiosInstance.delete(`/admin/internal-users/${id}`),

    getSellers: (params) => axiosInstance.get('/admin/sellers', { params }),
    getActiveSellers: (params) =>
        axiosInstance.get('/admin/sellers/active', { params }),
    getSellerLocations: (params) =>
        axiosInstance.get('/admin/sellers/locations', { params }),
    getPendingSellers: (params) =>
        axiosInstance.get('/admin/sellers/pending', { params }),
    approveSeller: (id) => axiosInstance.patch(`/admin/sellers/approve/${id}`),
    rejectSeller: (id, data) =>
        axiosInstance.delete(`/admin/sellers/reject/${id}`, { data }),
    getSellerProfileRequests: (params) => axiosInstance.get('/admin/sellers/profile-requests', { params }),
    decideSellerProfileRequest: (id, data) => axiosInstance.put(`/admin/sellers/profile-requests/${id}/decide`, data),
    
    getSuspendedSellers: (params) => axiosInstance.get('/admin/sellers/suspended', { params }),
    suspendSeller: (id, data) => axiosInstance.patch(`/admin/sellers/${id}/suspend`, data),
    unsuspendSeller: (id, data) => axiosInstance.patch(`/admin/sellers/${id}/unsuspend`, data),
    getSellerAuditLog: (id, params) => axiosInstance.get(`/admin/sellers/${id}/audit-log`, { params }),
};

export default adminUsersApi;
