import React, { useState, useEffect } from 'react';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';
import Badge from '@shared/components/ui/Badge';
import { useAuth } from '@core/context/AuthContext';
import { adminUsersApi } from '../services/api/usersApi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { HiOutlineUserAdd } from 'react-icons/hi';
import {
  HiOutlineXMark,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2';

const PERMISSIONS_LIST = [
  { key: "dashboard", label: "Dashboard", desc: "Access the main admin analytics dashboard" },
  { key: "categories", label: "Categories", desc: "Manage catalog category hierarchy and levels" },
  { key: "products", label: "Products", desc: "Moderate product listings and approvals" },
  { key: "marketing", label: "Marketing Tools", desc: "Experience studio, coupons, banners, notifications" },
  { key: "support", label: "Customer Support", desc: "Review comments and reply to help tickets" },
  { key: "sellers", label: "Sellers", desc: "Approve, reject, and manage seller accounts" },
  { key: "delivery", label: "Delivery Fleet", desc: "Track drivers, review applications, and send funds" },
  { key: "wallet", label: "Admin Wallet", desc: "Track and review platform wallet balances" },
  { key: "withdrawals", label: "Withdrawal Requests", desc: "Process payout requests from sellers and riders" },
  { key: "sellerPayments", label: "Seller Payments", desc: "Manage seller payment transactions" },
  { key: "cashCollection", label: "Cash Collection", desc: "Settle collected cash balances from riders" },
  { key: "customers", label: "Customers", desc: "Manage registered customer database and cards" },
  { key: "faqs", label: "FAQs", desc: "Manage platform help documentation and FAQs" },
  { key: "orders", label: "Orders", desc: "Manage preparing list, delivery state, and order returns" },
  { key: "billing", label: "Fees & Charges", desc: "Configure global fees and platform charges" },
  { key: "settings", label: "Settings", desc: "Manage global canteen and platform settings" },
];

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null); // null means adding a new admin

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState(['dashboard']);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validation States
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await adminUsersApi.getInternalAdmins();
      setAdmins(response.data.results || response.data.result || []);
    } catch (error) {
      console.error('Failed to load internal admins', error);
      toast.error(error.response?.data?.message || 'Failed to load internal admins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setShowPassword(false);
  };

  const openAddModal = () => {
    setEditingAdmin(null);
    setName('');
    setEmail('');
    setPassword('');
    setIsSuperAdmin(false);
    setPermissions(['dashboard']);
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setName(admin.name || '');
    setEmail(admin.email || '');
    setPassword(''); // blank by default: don't show hashed password
    setIsSuperAdmin(admin.isSuperAdmin || false);
    setPermissions(admin.permissions || ['dashboard']);
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const togglePermission = (key) => {
    if (permissions.includes(key)) {
      setPermissions(permissions.filter(p => p !== key));
    } else {
      setPermissions([...permissions, key]);
    }
  };

  const selectAllPermissions = () => {
    setPermissions(PERMISSIONS_LIST.map(p => p.key));
  };

  const clearAllPermissions = () => {
    setPermissions(['dashboard']);
  };

  const validatePasswordFormat = (val) => {
    if (!val) {
      if (editingAdmin) return ''; // Optional on edit
      return 'Password is required';
    }
    if (val.length < 10) {
      return 'Password must be at least 10 characters long';
    }
    if (val.length > 128) {
      return 'Password cannot exceed 128 characters';
    }
    if (!/[a-z]/.test(val)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(val)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(val)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Re-run real-time validation checks on submit to prevent bypass
    const nErr = name.trim() ? (/^[a-zA-Z\s]*$/.test(name) ? (name.length <= 50 ? '' : 'Name cannot exceed 50 characters') : 'Name can only contain alphabetic characters and spaces') : 'Name is required';
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    let eErr = '';
    if (!email.trim()) {
      eErr = 'Email is required';
    } else if (/[A-Z]/.test(email)) {
      eErr = 'Uppercase letters are not allowed in email';
    } else if (!emailRegex.test(email)) {
      eErr = 'Invalid email format';
    }
    const pErr = validatePasswordFormat(password);

    if (nErr || eErr || pErr) {
      setNameError(nErr);
      setEmailError(eErr);
      setPasswordError(pErr);
      return toast.error('Please resolve the validation errors first');
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        isSuperAdmin,
        permissions: isSuperAdmin ? PERMISSIONS_LIST.map(p => p.key) : permissions,
      };

      if (password) {
        payload.password = password;
      }

      if (editingAdmin) {
        await adminUsersApi.updateInternalAdmin(editingAdmin._id, payload);
        toast.success('Internal admin updated successfully');
      } else {
        await adminUsersApi.createInternalAdmin(payload);
        toast.success('Internal admin created successfully');
      }
      closeModal();
      fetchAdmins();
    } catch (error) {
      console.error('Failed to save internal admin', error);
      toast.error(error.response?.data?.message || 'Failed to save admin user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await adminUsersApi.deleteInternalAdmin(id);
      toast.success('Internal admin deleted successfully');
      fetchAdmins();
    } catch (error) {
      console.error('Failed to delete internal admin', error);
      toast.error(error.response?.data?.message || 'Failed to delete admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="ds-h1 text-slate-900">Platform Users</h2>
          <p className="text-sm text-slate-500 mt-1">Manage internal admin roles, access sections, and passwords.</p>
        </div>
        <Button onClick={openAddModal}>
          <HiOutlineUserAdd className="mr-2 h-5 w-5" />
          Add Internal User
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Permissions</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.length > 0 ? (
                  admins.map((admin) => (
                    <tr key={admin._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mr-3 font-semibold text-indigo-700">
                            {(admin.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-950 text-sm">{admin.name}</p>
                            <p className="text-xs text-slate-500">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {admin.isSuperAdmin ? (
                          <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                            Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-100">
                            Sub Admin
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {admin.isSuperAdmin ? (
                          <span className="text-xs font-medium text-slate-500">All Sections (Full Access)</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {(admin.permissions || []).map((pKey) => {
                              const details = PERMISSIONS_LIST.find(p => p.key === pKey);
                              return (
                                <span
                                  key={pKey}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200"
                                >
                                  {details?.label || pKey}
                                </span>
                              );
                            })}
                            {(!admin.permissions || admin.permissions.length === 0) && (
                              <span className="text-xs text-slate-400 italic">No permissions set</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Permissions / Details"
                          >
                            <HiOutlinePencilSquare className="h-5 w-5" />
                          </button>
                          {currentUser && currentUser.id !== admin._id && (
                            <button
                              onClick={() => handleDelete(admin._id, admin.name)}
                              className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Delete Admin Account"
                            >
                              <HiOutlineTrash className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-slate-400 font-medium">
                      No admin users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            data-lenis-prevent
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
            style={{overflow: 'hidden'}}
          >
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl relative z-[10000] bg-white rounded-2xl shadow-2xl flex flex-col"
              style={{maxHeight: '90vh'}}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingAdmin ? `Edit User: ${editingAdmin.name}` : 'Add Internal Users'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure access rules and login credentials.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6 overflow-y-scroll" style={{overscrollBehavior: 'contain'}}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith(' ')) {
                          setNameError('Name cannot start with a space');
                          return;
                        }
                        if (/^[a-zA-Z\s]*$/.test(val)) {
                          if (val.length <= 50) {
                            setName(val);
                            setNameError('');
                          } else {
                            setNameError('Name cannot exceed 50 characters');
                          }
                        } else {
                          setNameError('Name can only contain alphabetic characters and spaces');
                        }
                      }}
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                    {nameError && (
                      <p className="text-rose-500 text-xs mt-1.5 font-semibold">{nameError}</p>
                    )}
                  </div>

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/[A-Z]/.test(val)) {
                          setEmailError('Uppercase letters are not allowed in email');
                          return;
                        }
                        setEmail(val);
                        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
                        if (val === '') {
                          setEmailError('Email is required');
                        } else if (!emailRegex.test(val)) {
                          setEmailError('Invalid email format (e.g. user@example.com)');
                        } else {
                          setEmailError('');
                        }
                      }}
                      required
                      placeholder="e.g. rahul@eannadata.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                    {emailError && (
                      <p className="text-rose-500 text-xs mt-1.5 font-semibold">{emailError}</p>
                    )}
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Password
                    </label>
                    {editingAdmin && (
                      <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                        Optional (Leave blank to keep current)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPassword(val);
                        setPasswordError(validatePasswordFormat(val));
                      }}
                      required={!editingAdmin}
                      minLength={10}
                      placeholder={editingAdmin ? "••••••••••••" : "Min 10 chars, uppercase, lowercase, & number"}
                      className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm transition-all"
                    />
                    <HiOutlineKey className="absolute left-4 top-3.5 text-slate-400 h-5 w-5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-[13px] text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? (
                        <HiOutlineEyeSlash className="h-5 w-5" />
                      ) : (
                        <HiOutlineEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-rose-500 text-xs mt-1.5 font-semibold">{passwordError}</p>
                  )}
                </div>

                {/* SuperAdmin Toggle */}
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HiOutlineShieldCheck className="h-6 w-6 text-indigo-600" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Grant Superadmin Status</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Superadmins have complete, unrestricted access to all modules and configurations.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSuperAdmin}
                      onChange={(e) => setIsSuperAdmin(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Permissions Grid Checklist */}
                {!isSuperAdmin && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Section Permissions</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Select modules this sub-admin can view and operate.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllPermissions}
                          className="text-[10px] text-indigo-600 font-bold hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={clearAllPermissions}
                          className="text-[10px] text-slate-500 font-bold hover:underline"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PERMISSIONS_LIST.map((perm) => {
                        const isChecked = permissions.includes(perm.key);
                        return (
                          <div
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={`p-3 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 ${
                              isChecked
                                ? 'border-indigo-600 bg-indigo-50/20'
                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="mt-0.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{perm.label}</p>
                              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{perm.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSaving}
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save User Settings'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
