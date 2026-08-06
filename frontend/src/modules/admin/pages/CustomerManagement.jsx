import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import PageHeader from '@shared/components/ui/PageHeader';
import StatCard from '@shared/components/ui/StatCard';
import Modal from '@shared/components/ui/Modal';
import {
    Users,
    Search,
    Download,
    Eye,
    Phone,
    ShoppingBag,
    MoreVertical,
    UserPlus,
    RotateCw,
    Activity,
    Loader2,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    XCircle,
    Plus
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Pagination from '@shared/components/ui/Pagination';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';

const CustomerManagement = ({ mode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef(null);

    const currentMode = useMemo(() => {
        if (mode) return mode;
        if (location.pathname.includes('/customers/dbt')) return 'dbt';
        if (location.pathname.includes('/customers/app')) return 'app';
        return 'all';
    }, [mode, location.pathname]);

    const headerDetails = useMemo(() => {
        if (currentMode === 'dbt') {
            return {
                title: "DBT Subsidy Farmers",
                description: "Manage farmers added by Admin or Bulk Excel Upload who receive DBT subsidies",
                labelTotal: "Total DBT Farmers"
            };
        } else if (currentMode === 'app') {
            return {
                title: "App Registered Customers",
                description: "View and manage regular app & web self-registered user accounts",
                labelTotal: "Total App Customers"
            };
        }
        return {
            title: "All Customer Accounts",
            description: "Manage, create, and bulk-import all customer accounts",
            labelTotal: "Total Customers"
        };
    }, [currentMode]);

    // List & filter states
    const [searchTerm, setSearchTerm] = useState(() => {
        return new URLSearchParams(window.location.search).get('q') || '';
    });
    const [filterStatus, setFilterStatus] = useState('all');
    const [customers, setCustomers] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeDropdownId, setActiveDropdownId] = useState(null);

    // Modal & Loading States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Manual Creation Form State
    const initialCreateForm = {
        "Farmer Name": '',
        "Mobile No": '',
        status: 'active'
    };

    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [createError, setCreateError] = useState('');
    const [ifscError, setIfscError] = useState('');

    useEffect(() => {
        if (!isCreateModalOpen) {
            setCreateError('');
            setIfscError('');
        }
    }, [isCreateModalOpen]);

    // Bulk Upload File & Report State
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadReport, setUploadReport] = useState(null);

    // Drag and drop states
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const query = new URLSearchParams(location.search).get('q') || '';
        setSearchTerm(query);
    }, [location.search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(1);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize, searchTerm, filterStatus, currentMode]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeDropdownId && !event.target.closest('.dropdown-container')) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdownId]);

    const handleToggleStatus = async (id, currentStatus) => {
        setActiveDropdownId(null);
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            const { data } = await adminApi.updateUserStatus(id, newStatus);
            if (data.success) {
                toast.success(`Customer account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
                setCustomers(prev => prev.map(c => (c.id === id || c._id === id) ? { ...c, status: newStatus } : c));
            } else {
                toast.error(data.message || 'Failed to update status');
            }
        } catch (error) {
            console.error("Error updating user status:", error);
            toast.error(error.response?.data?.message || 'Error occurred while updating status.');
        }
    };


    const fetchCustomers = async (requestedPage = 1) => {
        try {
            setLoading(true);
            const params = { page: requestedPage, limit: pageSize };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (filterStatus !== 'all') params.status = filterStatus;
            if (currentMode && currentMode !== 'all') params.customerType = currentMode;
            const { data } = await adminApi.getUsers(params);
            if (data.success) {
                const payload = data.result || {};
                const list = Array.isArray(payload.items) ? payload.items : (data.results || []);
                setCustomers(list);
                if (typeof payload.total === 'number') {
                    setTotal(payload.total);
                } else {
                    setTotal(list.length);
                }
                if (typeof payload.page === 'number') {
                    setPage(payload.page);
                } else {
                    setPage(requestedPage);
                }
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
            toast.error("Failed to load customers");
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const safeCustomers = Array.isArray(customers) ? customers : [];
        return {
            total: total,
            active: safeCustomers.filter(c => c.status === 'active').length,
            newToday: safeCustomers.filter(c => {
                const dateVal = c.joinedDate || c.createdAt;
                if (!dateVal) return false;
                const d = new Date(dateVal);
                if (isNaN(d.getTime())) return false;
                const today = new Date().toISOString().split('T')[0];
                const joined = d.toISOString().split('T')[0];
                return joined === today;
            }).length
        };
    }, [customers, total]);

    const filteredCustomers = useMemo(() => {
        const safeCustomers = Array.isArray(customers) ? customers : [];
        return safeCustomers.filter(c => {
            const nameSearch = (c["Farmer Name"] || c.name || '').toLowerCase().includes(searchTerm.toLowerCase());
            const phoneSearch = (c["Mobile No"] || c.phone || '').includes(searchTerm);
            const matchesSearch = nameSearch || phoneSearch;
            const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [customers, searchTerm, filterStatus]);

    const getTimeAgo = (date) => {
        if (!date) return 'Never';
        const now = new Date();
        const past = new Date(date);
        if (isNaN(past.getTime())) return 'Never';
        const diffInMs = now - past;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Recently';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d ago`;
    };
    // Manual creation handler
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreateError('');

        if (createForm["Ifsc Code"]) {
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!ifscRegex.test(createForm["Ifsc Code"].toUpperCase())) {
                setCreateError('Invalid IFSC format (e.g. SBIN0012345)');
                return;
            }
        }

        setIsCreating(true);

        try {
            const capitalizeText = (str) => {
                if (!str) return '';
                return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            };
            const capitalizedForm = {
                ...createForm,
                "Farmer Name": capitalizeText(createForm["Farmer Name"]),
            };
            const { data } = await adminApi.createUser(capitalizedForm);
            if (data.success) {
                toast.success('Customer created successfully!');
                setIsCreateModalOpen(false);
                setCreateForm(initialCreateForm);
                fetchCustomers(1);
            } else {
                setCreateError(data.message || 'Failed to create customer');
            }
        } catch (error) {
            console.error("Error creating customer:", error);
            setCreateError(error.response?.data?.message || 'Error occurred during customer creation.');
        } finally {
            setIsCreating(false);
        }
    };

    // Drag and drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            const fileType = file.name.split('.').pop().toLowerCase();
            if (['csv', 'xlsx', 'xls'].includes(fileType)) {
                setSelectedFile(file);
            } else {
                toast.error('Invalid file format. Please upload CSV or Excel.');
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadReport(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const { data } = await adminApi.bulkUploadUsers(formData);
            if (data.success) {
                const report = data.result || {};
                setUploadReport(report);
                if (report.failureCount === 0) {
                    toast.success('All users uploaded successfully!');
                } else if (report.successCount > 0) {
                    toast.warning(`Uploaded ${report.successCount} users. ${report.failureCount} rows failed.`);
                } else {
                    toast.error('Bulk upload validation failed completely.');
                }
            } else {
                toast.error(data.message || 'Failed to process bulk upload.');
            }
        } catch (error) {
            console.error("Error in bulk upload:", error);
            toast.error(error.response?.data?.message || 'Error uploading file.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleCloseUploadModal = () => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadReport(null);
        fetchCustomers(1);
    };

    return (
        <div className="ds-section-spacing pb-10">
            <PageHeader
                title={headerDetails.title}
                description={headerDetails.description}
                badge={
                    <div className="ds-stat-card-icon bg-brand-50">
                        <Users className="ds-icon-lg text-brand-600" />
                    </div>
                }
                actions={
                    <>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="ds-btn ds-btn-md bg-white ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <Download className="ds-icon-sm rotate-180" />
                            BULK UPLOAD
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="ds-btn ds-btn-md bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            <Plus className="ds-icon-sm" />
                            NEW CUSTOMER
                        </button>
                    </>
                }
            />

            {/* Quick Stats Grid */}
            <div className="ds-grid-cards-3">
                <StatCard
                    label={headerDetails.labelTotal}
                    value={stats.total}
                    icon={Users}
                    color="text-brand-600"
                    bg="bg-brand-50"
                />
                <StatCard
                    label="Active Users"
                    value={stats.active}
                    icon={Activity}
                    color="text-brand-600"
                    bg="bg-brand-50"
                />
                <StatCard
                    label="New Today"
                    value={stats.newToday}
                    icon={UserPlus}
                    color="text-brand-600"
                    bg="bg-brand-50"
                />
            </div>

            {/* Filter & Search Bar */}
            <Card className="ds-card-compact">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 ds-icon-sm text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none z-10" />
                        <input
                            type="text"
                            placeholder="Search by name, card number or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ds-input w-full !pl-10"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>


                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-100 p-0.5 rounded-lg">
                            {['all', 'active', 'inactive'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md ds-caption transition-all uppercase font-bold",
                                        filterStatus === status ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Customer List Table */}
            <Card className="overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="ds-caption text-gray-500 font-medium">Loading Customers...</p>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="ds-table">
                        <thead className="ds-table-header">
                            <tr>
                                <th className="ds-table-header-cell">Customer</th>
                                <th className="ds-table-header-cell">Address Details</th>
                                <th className="ds-table-header-cell">Activity</th>
                                <th className="ds-table-header-cell">Total Spend</th>
                                <th className="ds-table-header-cell">Status</th>
                                <th className="ds-table-header-cell text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Users className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="ds-h4 text-gray-400">No customers found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((cust) => (
                                    <tr key={cust.id} className="ds-table-row">
                                        <td className="ds-table-cell">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${cust.name || 'Customer'}&backgroundColor=f1f5f9`}
                                                    alt=""
                                                    className="h-10 w-10 rounded-lg bg-gray-100 ring-2 ring-white shadow-sm object-cover"
                                                />
                                                <div>
                                                    <p
                                                        onClick={() => navigate(`/admin/customers/${cust.id}`)}
                                                        className="ds-h4 hover:text-primary cursor-pointer transition-colors"
                                                    >
                                                        {cust["Farmer Name"] || cust.name}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">

                                                    </div>
                                                    <p className="ds-body-sm text-gray-500">{cust.email || 'No email'}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Phone className="ds-icon-sm text-gray-300" />
                                                        <span className="text-[9px] text-gray-400 font-semibold">{cust["Mobile No"] || cust.phone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="ds-table-cell">
                                            {cust["Village Name"] ? (
                                                <div className="text-xs text-gray-600 max-w-[200px] truncate">
                                                    <p className="font-bold">{cust["Village Name"]}</p>
                                                    <p className="text-[10px] text-gray-400">{cust["Block Name"]}, {cust["District Name"]}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No detailed address</span>
                                            )}
                                        </td>
                                        <td className="ds-table-cell">
                                            <div>
                                                <div className="flex items-center gap-1.5 ds-body font-semibold">
                                                    <ShoppingBag className="ds-icon-sm text-primary" />
                                                    {cust.totalOrders || 0} Orders
                                                </div>
                                                <p className="ds-body-sm text-gray-400 mt-0.5">Last: {getTimeAgo(cust.lastOrderDate)}</p>
                                            </div>
                                        </td>
                                        <td className="ds-table-cell ds-h4">
                                            ₹{(cust.totalSpent || 0).toLocaleString()}
                                        </td>
                                        <td className="ds-table-cell">
                                            <Badge
                                                variant={cust.status === 'active' ? 'success' : 'error'}
                                                className="ds-badge"
                                            >
                                                {cust.status}
                                            </Badge>
                                        </td>
                                        <td className="ds-table-cell text-right">
                                            <div className="flex items-center justify-end gap-2 relative dropdown-container">
                                                <button
                                                    onClick={() => navigate(`/admin/customers/${cust.id || cust._id}`)}
                                                    className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                                                    title="View Profile"
                                                >
                                                    <Eye className="ds-icon-sm" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const id = cust.id || cust._id;
                                                        setActiveDropdownId(activeDropdownId === id ? null : id);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all",
                                                        activeDropdownId === (cust.id || cust._id)
                                                            ? "bg-slate-900 text-white"
                                                            : "bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white"
                                                    )}
                                                    title="More Actions"
                                                >
                                                    <MoreVertical className="ds-icon-sm" />
                                                </button>

                                                {activeDropdownId === (cust.id || cust._id) && (
                                                    <div className="absolute right-0 top-10 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[50] py-1.5 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                                                        <button
                                                            onClick={() => {
                                                                setActiveDropdownId(null);
                                                                navigate(`/admin/customers/${cust.id || cust._id}`);
                                                            }}
                                                            className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Eye size={14} className="text-slate-400" />
                                                            View Full Profile
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(cust.id || cust._id, cust.status)}
                                                            className={cn(
                                                                "w-full px-4 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50",
                                                                cust.status === 'active' ? "text-rose-600" : "text-emerald-600"
                                                            )}
                                                        >
                                                            {cust.status === 'active' ? (
                                                                <>
                                                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                                                                    Deactivate Account
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                                                                    Activate Account
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-gray-100">
                    <Pagination
                        page={page}
                        totalPages={Math.ceil(total / pageSize) || 1}
                        total={total}
                        pageSize={pageSize}
                        onPageChange={(p) => fetchCustomers(p)}
                        onPageSizeChange={(newSize) => {
                            setPageSize(newSize);
                            setPage(1);
                        }}
                        loading={loading}
                    />
                </div>
            </Card>

            {/* MANUAL CREATE MODAL */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => !isCreating && setIsCreateModalOpen(false)}
                title="Create Single Customer Manually"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {createError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl flex items-start gap-2 text-xs font-bold border border-red-100">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{createError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer Name *</label>
                            <input
                                required
                                type="text"
                                value={createForm["Farmer Name"]}
                                onChange={(e) => setCreateForm({ ...createForm, "Farmer Name": e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile No *</label>
                            <input
                                required
                                type="tel"
                                maxLength={10}
                                value={createForm["Mobile No"]}
                                onChange={(e) => setCreateForm({ ...createForm, "Mobile No": e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>
                    </div>


                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="flex-1 py-3 bg-primary text-white hover:bg-brand-600 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            {isCreating ? 'CREATING...' : 'CREATE USER'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* BULK UPLOAD MODAL */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => !isUploading && handleCloseUploadModal()}
                title="Bulk Upload Customers (CSV/Excel)"
            >
                <div className="space-y-6">
                    {!uploadReport ? (
                        <form onSubmit={handleUploadSubmit} className="space-y-6">
                            {/* Drag and Drop Container */}
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                                    dragActive ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <div className="p-4 bg-brand-50 text-brand-600 rounded-2xl">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {selectedFile ? selectedFile.name : 'Select or drag spreadsheet here'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Supports .CSV, .XLSX, or .XLS files
                                    </p>
                                </div>
                                {selectedFile && (
                                    <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded">
                                        {(selectedFile.size / 1024).toFixed(1)} KB
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseUploadModal}
                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedFile || isUploading}
                                    className="flex-1 py-3 bg-primary text-white hover:bg-brand-600 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 rotate-180" />}
                                    {isUploading ? 'IMPORTING...' : 'START IMPORT'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Bulk Upload Report View */
                        <div className="space-y-5">
                            {/* Summary Card */}
                            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-4">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    {uploadReport.failureCount === 0 ? (
                                        <CheckCircle className="text-brand-500 h-5 w-5" />
                                    ) : uploadReport.successCount > 0 ? (
                                        <AlertCircle className="text-amber-500 h-5 w-5" />
                                    ) : (
                                        <XCircle className="text-rose-500 h-5 w-5" />
                                    )}
                                    Import Summary
                                </h4>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Rows</p>
                                        <h5 className="text-lg font-black text-slate-900 mt-1">{uploadReport.totalRows}</h5>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 border-l-brand-500 border-l-4">
                                        <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Success</p>
                                        <h5 className="text-lg font-black text-brand-600 mt-1">{uploadReport.successCount}</h5>
                                    </div>
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 border-l-rose-500 border-l-4">
                                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Failed</p>
                                        <h5 className="text-lg font-black text-rose-500 mt-1">{uploadReport.failureCount}</h5>
                                    </div>
                                </div>
                            </div>

                            {/* Failure Details Table */}
                            {uploadReport.failureCount > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">Failed Rows Report</p>
                                    <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Row</th>
                                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Name/Phone</th>
                                                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {uploadReport.failedRows.map((fail, index) => (
                                                    <tr key={index} className="text-xs">
                                                        <td className="p-3 font-bold text-slate-900">#{fail.row}</td>
                                                        <td className="p-3 text-slate-600">
                                                            <p className="font-bold">{fail.name}</p>
                                                            <p className="text-[10px] text-gray-400">{fail.phone}</p>
                                                        </td>
                                                        <td className="p-3 text-rose-500 font-semibold">{fail.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCloseUploadModal}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                CLOSE & REFRESH
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CustomerManagement;
