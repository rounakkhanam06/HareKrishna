import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import {
    HiOutlineClipboardDocumentList,
    HiOutlineMagnifyingGlass,
    HiOutlineClock,
    HiOutlineXMark,
    HiOutlineArrowPath,
    HiOutlineCheck,
    HiOutlineXCircle,
    HiOutlineEye,
    HiOutlineEyeSlash
} from 'react-icons/hi2';
import { toast } from 'sonner';
import { adminApi } from '../services/adminApi';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const SellerProfileRequests = () => {
    const [requests, setRequests] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [viewingRequest, setViewingRequest] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [adminFeedback, setAdminFeedback] = useState('');
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await adminApi.getSellerProfileRequests({
                status: statusFilter !== 'all' ? statusFilter : undefined
            });
            const items = response.data?.result?.items || [];
            setRequests(items);

            // Compute temporary stats based on loaded lists (or fallback)
            const allRes = await adminApi.getSellerProfileRequests({});
            const allItems = allRes.data?.result?.items || [];
            const counts = allItems.reduce(
                (acc, item) => {
                    acc[item.status] = (acc[item.status] || 0) + 1;
                    acc.total += 1;
                    return acc;
                },
                { pending: 0, approved: 0, rejected: 0, total: 0 }
            );
            setStats(counts);
        } catch (error) {
            console.error('Failed to fetch profile requests', error);
            toast.error(error.response?.data?.message || 'Failed to load requests');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleDecision = async (id, decision) => {
        if (decision === 'rejected' && !adminFeedback.trim()) {
            toast.error('Rejection feedback is required to reject a request.');
            return;
        }

        setIsProcessing(true);
        try {
            await adminApi.decideSellerProfileRequest(id, {
                status: decision,
                adminFeedback: adminFeedback.trim()
            });
            toast.success(`Request ${decision} successfully`);
            setIsReviewModalOpen(false);
            setViewingRequest(null);
            setAdminFeedback('');
            fetchRequests();
        } catch (error) {
            console.error(`Failed to ${decision} request`, error);
            toast.error(error.response?.data?.message || `Failed to process decision`);
        } finally {
            setIsProcessing(false);
        }
    };

    const getDiffFields = (request) => {
        if (!request || !request.seller) return [];
        const seller = request.seller;
        const reqData = request.requestedData || {};
        const fields = [
            { label: 'Owner Name', key: 'name' },
            { label: 'Shop Name', key: 'shopName' },
            { label: 'Phone', key: 'phone' },
            { label: 'Email', key: 'email' },
            { label: 'Registration Number', key: 'registrationNumber' },
            { label: 'Address', key: 'address' },
            { label: 'Service Radius (KM)', key: 'serviceRadius' }
        ];

        return fields.map(field => {
            const currentVal = seller[field.key] || 'Not Set';
            const proposedVal = reqData[field.key] !== undefined ? reqData[field.key] : null;
            const isChanged = proposedVal !== null && String(currentVal) !== String(proposedVal);
            return {
                label: field.label,
                current: currentVal,
                proposed: proposedVal === null ? currentVal : proposedVal,
                isChanged
            };
        });
    };

    const filteredRequests = requests.filter(r => {
        const sellerName = String(r.seller?.name || '').toLowerCase();
        const shopName = String(r.seller?.shopName || '').toLowerCase();
        const query = searchTerm.toLowerCase();
        return sellerName.includes(query) || shopName.includes(query);
    });

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16 font-['Outfit']">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="ds-h1 flex items-center gap-2">
                        Seller Profile Requests
                        {stats.pending > 0 && (
                            <Badge variant="warning" className="admin-tiny px-1.5 py-0 font-bold animate-pulse">
                                {stats.pending} Action Required
                            </Badge>
                        )}
                    </h1>
                    <p className="ds-description mt-0.5">Review and approve changes made by sellers to their profile details.</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                {[
                    { label: 'Pending Requests', val: stats.pending, icon: HiOutlineClock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Approved Requests', val: stats.approved, icon: HiOutlineCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Rejected Requests', val: stats.rejected, icon: HiOutlineXCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Total Requests', val: stats.total, icon: HiOutlineClipboardDocumentList, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-sm ring-1 ring-slate-100 p-5 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="ds-label text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                                <h4 className="ds-stat-medium mt-1 text-2xl font-black text-slate-900">{stat.val}</h4>
                            </div>
                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Filter Tabs & Content Card */}
            <Card className="border-none shadow-xl ring-1 ring-slate-100 overflow-hidden rounded-xl mt-8 bg-white">
                {/* Search and Filters */}
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Status filter tabs */}
                    <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize",
                                    statusFilter === tab
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Search box */}
                    <div className="relative flex-1 w-full max-w-md">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by shop or owner name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>
                </div>

                {/* Table View */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <HiOutlineClipboardDocumentList className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p className="font-bold text-sm">No profile requests found</p>
                        <p className="text-xs text-slate-500 mt-1">There are no profile update requests matches your filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Shop & Owner</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Requested On</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Reason</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((req) => (
                                    <tr key={req._id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-900 text-sm">{req.seller?.shopName || 'Unknown Shop'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{req.seller?.name || 'Unknown Owner'}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-700">{new Date(req.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(req.createdAt).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-6 py-5 max-w-[250px] truncate text-xs font-semibold text-slate-600">
                                            {req.reason}
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge
                                                variant={
                                                    req.status === 'pending'
                                                        ? 'warning'
                                                        : req.status === 'approved'
                                                        ? 'success'
                                                        : 'danger'
                                                }
                                                className="capitalize text-[10px] px-2 py-0.5 font-bold tracking-wider rounded-full"
                                            >
                                                {req.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => {
                                                    setViewingRequest(req);
                                                    setAdminFeedback(req.adminFeedback || '');
                                                    setIsReviewModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all hover:scale-102 active:scale-98"
                                            >
                                                <HiOutlineEye className="h-4 w-4" />
                                                <span>Review</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Review Modal */}
            <AnimatePresence>
                {isReviewModalOpen && viewingRequest && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
                        {/* Overlay */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => {
                              if (!isProcessing) {
                                  setIsReviewModalOpen(false);
                                  setViewingRequest(null);
                                  setAdminFeedback('');
                              }
                          }}
                          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        {/* Modal Body */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 15 }}
                          className="w-full max-w-4xl relative z-[10000] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
                          onWheel={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        Review Profile Request: {viewingRequest.seller?.shopName}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Compare old details with requested changes and make a decision.
                                    </p>
                                </div>
                                <button
                                  onClick={() => {
                                      setIsReviewModalOpen(false);
                                      setViewingRequest(null);
                                      setAdminFeedback('');
                                  }}
                                  disabled={isProcessing}
                                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all disabled:opacity-50"
                                >
                                    <HiOutlineXMark className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Form/Scroll Content */}
                            <div className="px-6 py-5 space-y-6 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                                {/* Seller Meta details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shop Name</p>
                                        <p className="text-xs font-bold text-slate-700 mt-0.5">{viewingRequest.seller?.shopName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</p>
                                        <p className="text-xs font-bold text-slate-700 mt-0.5">{viewingRequest.seller?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-bold text-slate-700 mt-0.5">{viewingRequest.seller?.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted At</p>
                                        <p className="text-xs font-bold text-slate-700 mt-0.5">{new Date(viewingRequest.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Reason Block */}
                                <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-100/60">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        Seller's Reason for Request:
                                    </h4>
                                    <p className="text-xs font-bold text-slate-700 mt-2 bg-white/60 p-3 rounded-lg border border-slate-100 leading-relaxed italic">
                                        "{viewingRequest.reason}"
                                    </p>
                                </div>

                                {/* Side by Side Comparison Grid */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                        Proposed Changes
                                    </h4>
                                    <div className="border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Field</th>
                                                    <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Current Value</th>
                                                    <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Proposed Value</th>
                                                    <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getDiffFields(viewingRequest).map((field, idx) => (
                                                    <tr key={idx} className={cn(
                                                        "border-b border-slate-50 hover:bg-slate-50/30 transition-colors",
                                                        field.isChanged ? "bg-amber-50/20" : ""
                                                    )}>
                                                        <td className="px-4 py-3 font-bold text-slate-700">{field.label}</td>
                                                        <td className="px-4 py-3 text-slate-600 font-medium">{field.current}</td>
                                                        <td className={cn(
                                                            "px-4 py-3 font-bold",
                                                            field.isChanged ? "text-indigo-600 bg-amber-50/40" : "text-slate-600 font-medium"
                                                        )}>
                                                            {field.proposed}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {field.isChanged ? (
                                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                    Modified
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                    No Change
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Rejection Feedback Reason Text Box */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                                        Admin Decision Feedback / Comments
                                    </label>
                                    <textarea
                                      value={adminFeedback}
                                      onChange={(e) => setAdminFeedback(e.target.value)}
                                      disabled={viewingRequest.status !== 'pending' || isProcessing}
                                      placeholder="e.g. Please upload document verification or GST number looks invalid. / Changes approved."
                                      rows={3}
                                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:opacity-80 transition-all placeholder:text-slate-300 resize-none font-sans"
                                    />
                                    {viewingRequest.status !== 'pending' && (
                                        <p className="text-[10px] font-bold text-slate-400 italic">
                                            This request is already resolved and feedback cannot be changed.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4">
                                <div>
                                    {viewingRequest.status !== 'pending' && (
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-2">
                                            Resolved by: <span className="text-slate-700">{(viewingRequest.reviewedBy?.name) || 'Admin'}</span> on {new Date(viewingRequest.reviewedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                          setIsReviewModalOpen(false);
                                          setViewingRequest(null);
                                          setAdminFeedback('');
                                      }}
                                      disabled={isProcessing}
                                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    {viewingRequest.status === 'pending' && (
                                        <>
                                            <button
                                              type="button"
                                              onClick={() => handleDecision(viewingRequest._id, 'rejected')}
                                              disabled={isProcessing}
                                              className="px-5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:scale-102 active:scale-98"
                                            >
                                                Reject Update
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDecision(viewingRequest._id, 'approved')}
                                              disabled={isProcessing}
                                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 hover:scale-102 active:scale-98 shadow-md shadow-emerald-200"
                                            >
                                                Approve Update
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SellerProfileRequests;
