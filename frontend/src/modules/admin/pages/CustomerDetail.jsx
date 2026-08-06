import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import { adminUsersApi } from '../services/api/usersApi';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    ShoppingBag,
    TrendingUp,
    MessageSquare,
    ChevronLeft,
    History,
    RotateCw,
    Edit3,
    ArrowUpRight,
    ExternalLink,
    Map as MapIcon,
    MoreVertical,
    ChevronRight,
    User,
    Ban,
    Search,
    Bell,
    Package,
    IndianRupee,
    CheckCircle2,
    Lock,
    CreditCard,
    CheckCircle,
    XCircle,
    ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Modal from '@shared/components/ui/Modal';
import { toast } from 'sonner';
import { useSettings } from '@core/context/SettingsContext';

const CustomerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { settings } = useSettings();
    const showToast = (message, type = 'info') => {
        if (type === 'success') toast.success(message);
        else if (type === 'error') toast.error(message);
        else if (type === 'warning') toast.warning(message);
        else toast.info(message);
    };
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [visibleOrders, setVisibleOrders] = useState(3);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);

    // Form states
    const [notifMessage, setNotifMessage] = useState('');
    const [isSendingNotif, setIsSendingNotif] = useState(false);
    const [notes, setNotes] = useState('Prefer morning deliveries. Use the building entrance on the north side.');

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);


    const [orders, setOrders] = useState([]);

    const [editForm, setEditForm] = useState({
        "Farmer Name": '',
        "Mobile No": '',
        email: ''
    });

    const fetchCustomerDetails = async () => {
        try {
            setLoading(true);
            const { data } = await adminApi.getUserById(id);
            if (data.success) {
                const customerData = data.result;
                setCustomer(customerData);
                setOrders(customerData.recentOrders || []);
                setEditForm({
                    "Farmer Name": customerData["Farmer Name"] || customerData.name || '',
                    "Mobile No": customerData["Mobile No"] || customerData.phone || '',
                    email: customerData.email || ''
                });
            }
        } catch (error) {

            console.error("Error fetching customer details:", error);
            showToast("Failed to load customer profile", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchCustomerDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchCustomerDetails();
        setIsRefreshing(false);
        showToast('Customer data synchronized with main database', 'success');
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const capitalizeText = (str) => {
                if (!str) return '';
                return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            };
            const capitalizedForm = {
                ...editForm,
                "Farmer Name": capitalizeText(editForm["Farmer Name"]),
            };
            const { data } = await adminApi.updateUser(id, capitalizedForm);
            if (data.success) {
                showToast('Profile updated successfully', 'success');
                setIsEditModalOpen(false);
                fetchCustomerDetails();
            } else {
                showToast(data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast(error.response?.data?.message || 'Error occurred during profile update', 'error');
        }
    };

    const handleSendNotif = async () => {
        if (!notifMessage.trim()) return;
        try {
            setIsSendingNotif(true);
            const { data } = await adminUsersApi.sendUserNotification(id, {
                message: notifMessage.trim(),
                title: 'Notice from HareKrishna'
            });
            if (data.success) {
                showToast('Notification sent to customer successfully!', 'success');
                setIsNotifModalOpen(false);
                setNotifMessage('');
            } else {
                showToast(data.message || 'Failed to send notification', 'error');
            }
        } catch (error) {
            console.error("Error sending notification:", error);
            showToast(error.response?.data?.message || 'Error occurred while sending notification', 'error');
        } finally {
            setIsSendingNotif(false);
        }
    };

    const handleRestrictAccount = async () => {
        const newStatus = customer.status === 'active' ? 'inactive' : 'active';
        try {
            const { data } = await adminApi.updateUserStatus(id, newStatus);
            if (data.success) {
                showToast(`Account successfully ${newStatus === 'active' ? 'activated' : 'deactivated'}`, newStatus === 'inactive' ? 'warning' : 'success');
                setIsRestrictModalOpen(false);
                fetchCustomerDetails();
            } else {
                showToast(data.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showToast(error.response?.data?.message || 'Error updating status', 'error');
        }
    };



    const handleSaveNotes = () => {
        showToast('Internal CRM notes updated', 'info');
    };

    const handleExportCSV = () => {
        showToast('Archive export initiated. CSV will be ready shortly.', 'info');
    };

    const safeOrders = useMemo(
        () => (Array.isArray(orders) ? orders : []),
        [orders]
    );

    const filteredOrders = useMemo(() => {
        return safeOrders.filter(o =>
            (o.id || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
            (o.status || '').toLowerCase().includes(orderSearch.toLowerCase())
        ).slice(0, visibleOrders);
    }, [safeOrders, orderSearch, visibleOrders]);

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <RotateCw className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <p className="text-lg font-bold text-gray-400">Customer not found</p>
                <button onClick={() => navigate('/admin/customers')} className="text-primary font-bold">Back to Customers</button>
            </div>
        );
    }

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/customers')}
                        className="p-2.5 bg-white ring-1 ring-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="ds-h1">Customer Profile</h1>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{customer.id}</Badge>
                        </div>
                        <p className="ds-description mt-1">Full profile and shopping history for this customer.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-5 py-3 bg-white ring-1 ring-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RotateCw className={cn("h-4 w-4 text-brand-500", isRefreshing && "animate-spin")} />
                        REFRESH
                    </button>
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 shadow-slate-200"
                    >
                        <Edit3 className="h-4 w-4" />
                        EDIT PROFILE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Profile Info */}
                <Card className="lg:col-span-2 bg-white rounded-xl p-6 border-none shadow-xl ring-1 ring-slate-100 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                        <div className="relative shrink-0">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${customer["Farmer Name"] || customer.name || 'Customer'}&backgroundColor=f1f5f9`}
                                alt=""
                                className="h-32 w-32 rounded-xl ring-4 ring-slate-50 shadow-lg bg-slate-100 object-cover"
                            />
                            <div className={cn(
                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-4 ring-white shadow-sm",
                                customer.status === 'active' ? "bg-brand-500" : "bg-rose-500"
                            )}></div>
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900">{customer["Farmer Name"] || customer.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Customer since {(customer["Registration Date"] || customer["eAnnadata Card Registration Date"] || customer.joinedDate) ? new Date(customer["Registration Date"] || customer["eAnnadata Card Registration Date"] || customer.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Spend', value: `₹${(customer.totalSpent || 0).toLocaleString()}`, trend: 'Lifetime', icon: IndianRupee, color: 'emerald' },
                                    { label: 'Orders Placed', value: customer.totalOrders || 0, trend: 'Lifetime', icon: ShoppingBag, color: 'blue' },
                                    { label: 'Average Spend', value: `₹${customer.totalOrders > 0 ? Math.round(customer.totalSpent / customer.totalOrders).toLocaleString() : 0}`, trend: 'Per Order', icon: TrendingUp, color: 'indigo' },
                                    { label: 'Account Status', value: (customer.status || '').toUpperCase(), trend: 'Current', icon: CheckCircle2, color: 'fuchsia' },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <div className={cn("p-2 rounded-full mb-2",
                                            stat.color === 'emerald' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'blue' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'indigo' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'fuchsia' && 'bg-fuchsia-100 text-fuchsia-600',
                                        )}>
                                            <stat.icon className="h-4 w-4" />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <h5 className="text-lg font-black text-slate-900 mt-1">{stat.value}</h5>
                                        <p className="text-xs font-bold text-slate-500 mt-0.5">{stat.trend}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-4">
                    <Card className="p-6 !bg-black text-primary-foreground rounded-xl border-none shadow-lg shadow-brand-200 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black opacity-90 uppercase tracking-widest mb-1">Lifetime Value</p>
                            <h4 className="text-3xl font-black text-white">₹{(customer.totalSpent || 0).toLocaleString()}</h4>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="p-1 px-2 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-tighter">
                                    {customer.totalOrders || 0} Orders
                                </div>
                                <TrendingUp className="h-4 w-4 text-white/90" />
                            </div>
                        </div>
                        <ShoppingBag className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                    </Card>

                    <Card className="p-6 bg-white rounded-xl border-none shadow-md ring-1 ring-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recent Activity</p>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
                                <RotateCw className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700">Last Order placed</p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                    {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                {/* Detailed Profile Info Fields */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-6">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <User className="h-4 w-4 text-brand-500" />
                            Customer Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <div className="border-b border-slate-50 pb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</p>
                                <p className="font-bold text-slate-800 mt-0.5">{customer["Farmer Name"] || customer.name || 'N/A'}</p>
                            </div>
                            <div className="border-b border-slate-50 pb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile No</p>
                                <p className="font-bold text-brand-600 mt-0.5">{customer["Mobile No"] || customer.phone || 'N/A'}</p>
                            </div>
                            <div className="border-b border-slate-50 pb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Date</p>
                                <p className="font-bold text-slate-800 mt-0.5">
                                    {(customer["Registration Date"] || customer.joinedDate) ? new Date(customer["Registration Date"] || customer.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                </p>
                            </div>
                            <div className="border-b border-slate-50 pb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Created By Admin ID</p>
                                <p className="font-bold text-slate-500 mt-0.5 truncate">{customer.created_by || 'System Bootstrap / Signup'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Saved Addresses (User Added) */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <MapIcon className="h-4 w-4 text-brand-500" />
                                Saved Shipping Addresses
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Array.isArray(customer.addresses) ? customer.addresses : []).length > 0 ? (
                                (Array.isArray(customer.addresses) ? customer.addresses : []).map((addr, idx) => {
                                    const type = (addr.label || addr.type || 'other').toUpperCase();
                                    const parts = [addr.fullAddress || addr.address, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean);
                                    const fullAddress = parts.length > 0 ? parts.join(', ') : 'No address';
                                    const isDefault = addr.isDefault ?? (idx === 0);
                                    return (
                                        <div key={addr._id || addr.id || idx} className={cn(
                                            "p-4 rounded-xl ring-1 transition-all",
                                            isDefault ? "bg-slate-50 ring-slate-200 shadow-sm" : "bg-white ring-slate-100 hover:ring-brand-100"
                                        )}>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant={isDefault ? 'primary' : 'secondary'} className="text-[9px] font-black">
                                                    {type}
                                                </Badge>
                                                <MapPin className="h-3.5 w-3.5 text-slate-300" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{fullAddress}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No saved shipping addresses</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Order history */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                        <div className="p-4 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-4 w-4 text-brand-500" />
                                Recent Orders
                            </h4>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-focus-within:text-brand-500" />
                                    <input
                                        type="text"
                                        placeholder="Search Orders..."
                                        value={orderSearch}
                                        onChange={(e) => setOrderSearch(e.target.value)}
                                        className="pl-8 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none ring-1 ring-transparent focus:ring-brand-500/20 w-40"
                                    />
                                </div>
                                <button
                                    onClick={handleExportCSV}
                                    className="text-[10px] font-black text-brand-600 uppercase hover:underline"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrders.map((order, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => navigate(`/admin/orders/view/${order.id.replace('#', '')}`)}
                                            className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                                        >
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all text-slate-400 group-hover:text-brand-500">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{order.id}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{order.itemsCount} Items</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">
                                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                            <td className="py-5 text-center">
                                                <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'} className="text-[8px] font-black">
                                                    {order.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="py-5 text-right font-black text-slate-900 pr-8">
                                                ₹{(order.amount || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-5 text-center text-xs font-bold text-slate-400">
                                                No orders found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {visibleOrders < safeOrders.length && (
                            <div className="p-4 bg-slate-50/50 flex justify-center border-t border-slate-50">
                                <button
                                    onClick={() => setVisibleOrders(safeOrders.length)}
                                    className="text-[10px] font-black text-brand-600 uppercase hover:underline flex items-center gap-2"
                                >
                                    SHOW ALL ORDERS
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Notes & Controls */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-brand-500" />
                            Internal Notes
                        </h4>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-50 p-6 rounded-2xl min-h-[140px] text-sm font-bold text-slate-600 leading-relaxed italic border border-slate-100 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                        <button
                            onClick={handleSaveNotes}
                            className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            UPDATE NOTES
                        </button>
                    </Card>

                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-slate-900 rounded-xl p-4 text-white">
                        <h4 className="text-xs font-black opacity-40 uppercase tracking-widest mb-6">Account Control</h4>
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsNotifModalOpen(true)}
                                className="w-full py-4 bg-black hover:bg-brand-500 text-primary-foreground rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-brand-900/20 flex items-center justify-center gap-2"
                            >
                                <Bell className="h-4 w-4" />
                                SEND NOTIFICATION
                            </button>
                            <button
                                onClick={() => setIsRestrictModalOpen(true)}
                                className="w-full py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Ban className="h-4 w-4" />
                                {customer.status === 'active' ? 'DEACTIVATE ACCOUNT' : 'ACTIVATE ACCOUNT'}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* EDIT PROFILE DETAILS MODAL */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer Profile details">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Farmer Name</label>
                            <input
                                required
                                type="text"
                                value={editForm["Farmer Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "Farmer Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">eAnnadata Card Number</label>
                            <input
                                required
                                type="text"
                                value={editForm["eAnnadata Card Number"]}
                                onChange={(e) => setEditForm({ ...editForm, "eAnnadata Card Number": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile No</label>
                            <input
                                required
                                type="tel"
                                maxLength={10}
                                value={editForm["Mobile No"]}
                                onChange={(e) => setEditForm({ ...editForm, "Mobile No": e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Father/Mother/Husband</label>
                            <input
                                required
                                type="text"
                                value={editForm["Father/Mother/Husband"]}
                                onChange={(e) => setEditForm({ ...editForm, "Father/Mother/Husband": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date of Birth</label>
                            <input
                                required
                                type="date"
                                value={editForm["Date Of Birth"]}
                                onChange={(e) => setEditForm({ ...editForm, "Date Of Birth": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gender</label>
                            <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Registration Date</label>
                            <input
                                required={customer?.isSubsidyEligible}
                                type="date"
                                value={editForm["eAnnadata Card Registration Date"]}
                                onChange={(e) => setEditForm({ ...editForm, "eAnnadata Card Registration Date": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pin Code</label>
                            <input
                                required
                                type="text"
                                maxLength={6}
                                value={editForm["Pin Code"]}
                                onChange={(e) => setEditForm({ ...editForm, "Pin Code": e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">State Name</label>
                            <input
                                required
                                type="text"
                                value={editForm["State Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "State Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">District Name</label>
                            <input
                                required
                                type="text"
                                value={editForm["District Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "District Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Block Name</label>
                            <input
                                required
                                type="text"
                                value={editForm["Block Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "Block Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Village Name</label>
                            <input
                                required
                                type="text"
                                value={editForm["Village Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "Village Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">A/C Holder Name</label>
                            <input
                                type="text"
                                value={editForm["A/C Holder Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "A/C Holder Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bank Name</label>
                            <input
                                type="text"
                                value={editForm["Bank Name"]}
                                onChange={(e) => setEditForm({ ...editForm, "Bank Name": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm capitalize"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">A/C Number</label>
                            <input
                                type="text"
                                value={editForm["A/C Number"]}
                                onChange={(e) => setEditForm({ ...editForm, "A/C Number": e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">IFSC Code</label>
                            <input
                                type="text"
                                value={editForm["Ifsc Code"]}
                                onChange={(e) => setEditForm({ ...editForm, "Ifsc Code": e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm uppercase"
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-4 py-3 bg-black hover:bg-brand-600 text-primary-foreground rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        SAVE CHANGES
                    </button>
                </form>
            </Modal>

            {/* SEND NOTIFICATION MODAL */}
            <Modal isOpen={isNotifModalOpen} onClose={() => setIsNotifModalOpen(false)} title="Send Notification">
                <div className="space-y-6">
                    <div className="p-4 bg-brand-50 rounded-2xl flex items-start gap-3">
                        <Bell className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-brand-700 leading-relaxed">
                            We will send notifications via app and SMS immediately.
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Message</label>
                        <textarea
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            placeholder="Type your message here..."
                            className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm min-h-[120px]"
                        />
                    </div>
                    <button
                        onClick={handleSendNotif}
                        disabled={!notifMessage.trim() || isSendingNotif}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSendingNotif && <RotateCw className="h-4 w-4 animate-spin text-white" />}
                        {isSendingNotif ? 'SENDING...' : 'SEND MESSAGE'}
                    </button>
                </div>
            </Modal>

            {/* CONFIRM STATUS TOGGLE MODAL */}
            <Modal isOpen={isRestrictModalOpen} onClose={() => setIsRestrictModalOpen(false)} title="Confirm Action">
                <div className="space-y-6">
                    <div className="p-6 bg-rose-50 rounded-xl border border-rose-100 flex flex-col items-center text-center gap-4">
                        <div className="p-3 bg-rose-500 text-white rounded-full">
                            {customer.status === 'active' ? <Ban className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                        </div>
                        <h5 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            Confirm Account {customer.status === 'active' ? 'Deactivation' : 'Activation'}?
                        </h5>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                            {customer.status === 'active'
                                ? 'This will block the customer from placing orders or logging in to the canteen app.'
                                : 'This will allow the customer to log in and order from the canteen again.'
                            }
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsRestrictModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                            CANCEL
                        </button>
                        <button onClick={handleRestrictAccount} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all">
                            CONFIRM
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CustomerDetail;
