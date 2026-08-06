import React, { useState, useMemo } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import {
    Search,
    Filter,
    CheckCircle,
    XCircle,
    FileSearch,
    Phone,
    Mail,
    Truck,
    MapPin,
    Calendar,
    IdCard,
    RotateCw,
    Check,
    X,
    FileCheck,
    Clock,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { adminApi } from '../services/adminApi';
import { adminDeliveryApi } from '../services/api/deliveryApi';

const ALL_DOC_CONFIG = [
    { key: 'aadhar',              label: 'Aadhar Card' },
    { key: 'pan',                 label: 'PAN Card' },
    { key: 'drivingLicense',      label: 'Driving License' },
    { key: 'vehicleRegistration', label: 'Vehicle RC' },
    { key: 'policeClearance',     label: 'Police Clearance' },
    { key: 'bankPassbook',        label: 'Bank Passbook' },
];

const PendingDeliveryBoys = () => {
    const [pendingRiders, setPendingRiders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewingRider, setViewingRider] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [docActionKey, setDocActionKey] = useState(null); // key of doc currently being moderated
    const [rejectPrompt, setRejectPrompt] = useState({ open: false, docKey: null, reason: '' });

    // Fetch Pending Riders
    const fetchPendingRiders = async () => {
        setIsLoading(true);
        try {
            // verified=false fetches riders waiting for review
            const params = { verified: 'false' };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            const response = await adminApi.getDeliveryPartners(params);
            const payload = response.data.result || {};
            const list = Array.isArray(payload.items) ? payload.items : (response.data.results || []);

            // Map backend data to frontend format
            const docLabels = {
                aadhar: "Aadhar Card",
                pan: "PAN Card",
                drivingLicense: "Driving License",
                vehicleRegistration: "Vehicle RC Document"
            };

            const mappedRiders = list.map(r => ({
                id: r._id,
                name: r.name,
                phone: r.phone,
                email: r.email || 'N/A',
                avatar: r.profileImage,
                appliedDate: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                location: r.address || 'N/A',
                vehicle: r.vehicleType,
                vehicleNumber: r.vehicleNumber,
                drivingLicenseNumber: r.drivingLicenseNumber,
                vehicleRegistrationNumber: r.vehicleRegistrationNumber,
                accountHolder: r.accountHolder,
                accountNumber: r.accountNumber,
                ifsc: r.ifsc,
                emergencyContact: r.emergencyContact || null,
                documents: ALL_DOC_CONFIG.map(cfg => ({
                    key: cfg.key,
                    name: cfg.label,
                    url: r.documents?.[cfg.key] || null,
                    status: r.documentStatuses?.[cfg.key]?.status || (r.documents?.[cfg.key] ? 'Pending' : null),
                    reason: r.documentStatuses?.[cfg.key]?.reason || null,
                })),
                status: r.isVerified ? 'approved' : 'pending_review',
                experience: 'Verified Applicant',
                preferredArea: r.currentArea || r.address || 'Not Specified'
            }));

            setPendingRiders(mappedRiders);
        } catch (error) {
            console.error('Fetch Pending Riders Error:', error);
            toast.error('Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };


React.useEffect(() => {
    const timer = setTimeout(() => {
        fetchPendingRiders();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchTerm, filterStatus]);

React.useEffect(() => {
    if (!viewingRider) return;

    const preventScroll = (e) => e.preventDefault();

    // Lock scrollbars on body & html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Must use { passive: false } so preventDefault() actually works on wheel/touch
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
    };
}, [viewingRider]);

const filteredRiders = useMemo(() => {
    return pendingRiders.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.phone.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
}, [pendingRiders, searchTerm, filterStatus]);

const handleApprove = async (id) => {
    setIsProcessing(true);
    try {
        await adminApi.approveDeliveryPartner(id);
        toast.success('Rider Approved & Activated!');
        setPendingRiders(pendingRiders.filter(r => r.id !== id));
        setViewingRider(null);
    } catch (error) {
        console.error('Approval Error:', error);
        toast.error('Failed to approve rider');
    } finally {
        setIsProcessing(false);
    }
};

const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject this application?')) {
        setIsProcessing(true);
        try {
            await adminApi.rejectDeliveryPartner(id);
            toast.success('Application Rejected');
            setPendingRiders(pendingRiders.filter(r => r.id !== id));
            setViewingRider(null);
        } catch (error) {
            console.error('Rejection Error:', error);
            toast.error('Failed to reject rider');
        } finally {
            setIsProcessing(false);
        }
    }
};

const handleVerifyDoc = async (docKey) => {
    setDocActionKey(docKey);
    try {
        await adminDeliveryApi.verifyDocument(viewingRider.id, docKey);
        toast.success('Document verified successfully');
        // Update local state
        setViewingRider(prev => ({
            ...prev,
            documents: prev.documents.map(d =>
                d.key === docKey ? { ...d, status: 'Verified', reason: null } : d
            )
        }));
    } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to verify document');
    } finally {
        setDocActionKey(null);
    }
};

const handleRejectDocSubmit = async () => {
    const { docKey, reason } = rejectPrompt;
    if (!reason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setDocActionKey(docKey);
    try {
        await adminDeliveryApi.rejectDocument(viewingRider.id, docKey, reason.trim());
        toast.success('Document rejected');
        setViewingRider(prev => ({
            ...prev,
            documents: prev.documents.map(d =>
                d.key === docKey ? { ...d, status: 'Rejected', reason: reason.trim() } : d
            )
        }));
    } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to reject document');
    } finally {
        setDocActionKey(null);
        setRejectPrompt({ open: false, docKey: null, reason: '' });
    }
};

return (
    <div className="ds-section-spacing animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
                <h1 className="ds-h1 flex items-center gap-3">
                    Rider Applications
                    <Badge variant="primary" className="text-[10px] px-2 py-0.5 uppercase">Pending Review</Badge>
                </h1>
                <p className="ds-description mt-1">Review documents for new delivery partners.</p>
            </div>
            <div className="flex items-center gap-3">
                <button className="p-3 bg-white ring-1 ring-slate-200 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm active:rotate-180 duration-500">
                    <RotateCw className="h-5 w-5" />
                </button>
                <div className="h-10 w-[1px] bg-slate-200 mx-2" />
                <div className="flex flex-col items-end">
                    <p className="ds-label">Total Pending</p>
                    <h4 className="ds-h2">{pendingRiders.length}</h4>
                </div>
            </div>
        </div>

        {/* Utility Bar */}
        <Card className="p-4 border-none shadow-sm ring-1 ring-slate-100 bg-white/50 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-100/50 border-none rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                </div>

            </div>
        </Card>

        {/* Applications Table View */}
        <Card className="border-none shadow-2xl ring-1 ring-slate-100 overflow-hidden bg-white rounded-xl relative min-h-[400px]">
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Applications...</p>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="ds-table-header-cell" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>Applicant Details</th>
                            <th className="ds-table-header-cell" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>Operational Intel</th>
                            <th className="ds-table-header-cell" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>Submission Status</th>
                            <th className="ds-table-header-cell" style={{ paddingLeft: '2rem', paddingRight: '2rem', textAlign: 'left' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {!isLoading && filteredRiders.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-20 text-center">
                                    <FileSearch className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                                    <p className="text-sm font-bold text-slate-500">No pending applications found.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredRiders.map((rider) => (
                                <tr key={rider.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <img 
                                               src={rider.avatar && !rider.avatar.includes('emoji') && !rider.avatar.includes('avatar') ? rider.avatar : "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                                               alt="" 
                                               className="h-12 w-12 rounded-lg bg-gray-100 ring-2 ring-white shadow-sm object-cover group-hover:scale-110 transition-all" 
                                            />
                                            <div>
                                                <p className="text-sm font-black text-slate-900">{rider.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Phone className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-500">{rider.phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Truck className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold">{rider.vehicle}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <MapPin className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold">{rider.location}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-2">
                                            <Badge variant={rider.status === 'pending_review' ? 'primary' : 'warning'} className="w-fit text-[8px] font-black uppercase">
                                                {rider.status.replace('_', ' ')}
                                            </Badge>
                                            <div className="flex gap-1">
                                                {rider.documents.slice(0, 2).map((doc, i) => (
                                                    <div key={i} className="h-5 px-2 bg-slate-100 rounded-md text-[8px] font-bold text-slate-500 flex items-center">
                                                        {doc.name}
                                                    </div>
                                                ))}
                                                {rider.documents.length > 2 && (
                                                    <div className="h-5 px-2 bg-slate-100 rounded-md text-[8px] font-bold text-slate-400 flex items-center">
                                                        +{rider.documents.length - 2} More
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-left">
                                        <button
                                            onClick={() => setViewingRider(rider)}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                                        >
                                            VIEW APPLICATION
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>

        {/* Application Review Modal */}
        <AnimatePresence>
            {viewingRider && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-hidden"
                    data-lenis-prevent
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        onClick={() => setViewingRider(null)}
                        onWheel={(e) => e.preventDefault()}
                        onTouchMove={(e) => e.preventDefault()}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-5xl my-auto relative z-10 bg-white rounded-[32px] sm:rounded-[40px] shadow-3xl overflow-hidden flex flex-col lg:flex-row max-h-[90vh]"
                    >
                        <div className="lg:w-80 bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto overscroll-contain">
                            <div className="flex flex-col items-center text-center mb-8">
                                <img 
                                   src={viewingRider.avatar && !viewingRider.avatar.includes('emoji') && !viewingRider.avatar.includes('avatar') ? viewingRider.avatar : "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                                   alt="" 
                                   className="h-24 w-24 mx-auto mb-3 rounded-2xl bg-white shadow-xl object-cover ring-4 ring-white" 
                                />
                                <h3 className="ds-h2">{viewingRider.name}</h3>
                                <p className="ds-label text-primary mt-1">Applicant Node</p>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied On</p>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold">{viewingRider.appliedDate}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Area / Location</p>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <MapPin className="h-4 w-4 text-slate-400" />
                                        <span className="text-xs font-bold">{viewingRider.location}</span>
                                    </div>
                                </div>

                                {viewingRider.address && viewingRider.address !== 'N/A' && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed">{viewingRider.address}</p>
                                    </div>
                                )}

                                {viewingRider.emergencyContact?.name && (
                                    <div className="space-y-2 pt-4 border-t border-slate-200">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Contact</p>
                                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm space-y-1.5">
                                            <p className="text-xs font-black text-slate-900">{viewingRider.emergencyContact.name}</p>
                                            {viewingRider.emergencyContact.relation && (
                                                <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wide">{viewingRider.emergencyContact.relation}</p>
                                            )}
                                            {viewingRider.emergencyContact.phone && (
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Phone className="h-3 w-3" />
                                                    <span className="text-[11px] font-bold">{viewingRider.emergencyContact.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Document & Action Section */}
                        <div className="flex-1 p-5 lg:p-8 bg-white flex flex-col min-h-0 overflow-hidden">
                            <div className="flex justify-between items-start mb-4 shrink-0">
                                <div>
                                    <h2 className="ds-h1">Vetting Protocol</h2>
                                    <p className="ds-description mt-1">Check submitted legal documents for platform entry.</p>
                                </div>
                                <button onClick={() => setViewingRider(null)} className="p-2.5 hover:bg-slate-50 rounded-2xl transition-all">
                                    <X className="h-6 w-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Records</h4>
                                        <div className="p-6 bg-slate-50 rounded-xl space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">{viewingRider.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                                                    <Mail className="h-5 w-5" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">{viewingRider.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vehicle & License Details</h4>
                                        <div className="p-6 bg-slate-50 rounded-xl border-2 border-brand-500/10 space-y-2">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-600">
                                                    <Truck className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 capitalize">{viewingRider.vehicle}</p>
                                                    <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mt-0.5">Active Fleet Candidate</p>
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-700 space-y-1.5 pt-3 border-t border-slate-200">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Plate Number:</span>
                                                    <span>{viewingRider.vehicleNumber || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">DL Number:</span>
                                                    <span>{viewingRider.drivingLicenseNumber || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Registration (RC):</span>
                                                    <span>{viewingRider.vehicleRegistrationNumber || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial / Bank Account Details */}
                                {(viewingRider.accountNumber || viewingRider.ifsc) && (
                                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Bank Settlement Details</h4>
                                        <div className="grid grid-cols-3 gap-4 text-xs font-bold">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-normal uppercase">Account Holder</p>
                                                <p className="text-slate-900 mt-0.5">{viewingRider.accountHolder || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-normal uppercase">Account Number</p>
                                                <p className="text-slate-900 mt-0.5">{viewingRider.accountNumber || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-normal uppercase">IFSC Code</p>
                                                <p className="text-slate-900 mt-0.5">{viewingRider.ifsc || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Documents & Verification</h4>
                                    {viewingRider.documents.map((doc) => (
                                        <div key={doc.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                {/* Status icon */}
                                                {doc.status === 'Verified' && <FileCheck className="h-4 w-4 text-brand-600 shrink-0" />}
                                                {doc.status === 'Pending' && <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                                                {doc.status === 'Rejected' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                                                {!doc.status && <FileSearch className="h-4 w-4 text-slate-300 shrink-0" />}
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{doc.name}</p>
                                                    {doc.status === 'Rejected' && doc.reason && (
                                                        <p className="text-[10px] text-red-500 mt-0.5">Reason: {doc.reason}</p>
                                                    )}
                                                    {!doc.url && (
                                                        <p className="text-[10px] text-slate-400 mt-0.5">Not uploaded yet</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.url && (
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                                       className="p-1.5 bg-white rounded-lg border border-slate-200 hover:border-primary transition-colors">
                                                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                                    </a>
                                                )}
                                                {doc.url && doc.status !== 'Verified' && (
                                                    <button
                                                        disabled={docActionKey === doc.key}
                                                        onClick={() => handleVerifyDoc(doc.key)}
                                                        className="px-2 py-1 bg-brand-600 text-white rounded-lg text-[10px] font-bold hover:bg-brand-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {docActionKey === doc.key ? '…' : 'Verify'}
                                                    </button>
                                                )}
                                                {doc.url && doc.status !== 'Rejected' && (
                                                    <button
                                                        disabled={docActionKey === doc.key}
                                                        onClick={() => setRejectPrompt({ open: true, docKey: doc.key, reason: '' })}
                                                        className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 shrink-0 bg-white sticky bottom-0">
                                <button
                                    disabled={isProcessing}
                                    onClick={() => handleApprove(viewingRider.id)}
                                    className="flex-1 py-1.5 h-9 bg-slate-900 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Processing Vetting...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            APPROVE & ACTIVATE RIDER
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleReject(viewingRider.id)}
                                    className="py-1.5 h-9 px-4 bg-rose-50 text-rose-600 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                                >
                                    REJECT APPLICATION
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Rejection reason dialog */}
        <AnimatePresence>
            {rejectPrompt.open && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
                        onClick={() => setRejectPrompt({ open: false, docKey: null, reason: '' })}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative z-10 bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-black text-slate-900 mb-1">Rejection Reason</h3>
                        <p className="text-xs text-slate-400 mb-4">This reason will be visible to the rider on their Documents page.</p>
                        <textarea
                            autoFocus
                            rows={3}
                            value={rejectPrompt.reason}
                            onChange={(e) => setRejectPrompt(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="e.g. Image is blurry, please re-upload a clear photo."
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-red-300 mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRejectPrompt({ open: false, docKey: null, reason: '' })}
                                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                            >Cancel</button>
                            <button
                                onClick={handleRejectDocSubmit}
                                disabled={!rejectPrompt.reason.trim() || !!docActionKey}
                                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >{docActionKey ? 'Rejecting…' : 'Confirm Reject'}</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
);
};

export default PendingDeliveryBoys;
