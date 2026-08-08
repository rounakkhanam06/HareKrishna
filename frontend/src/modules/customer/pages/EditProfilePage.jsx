import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, MapPin, Camera, Save, Home, Briefcase, Loader2 } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { toast } from 'sonner';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [cardStatus, setCardStatus] = useState('no');

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                setLoading(true);
                const res = await customerApi.getProfile();
                if (res.data?.success) {
                    const data = res.data.result;
                    setName(data.name || data['Farmer Name'] || '');
                    setEmail(data.email || '');
                    setPhone(data.phone || data['Mobile No'] || '');
                    setCardStatus(data['eAnnadata Card Status'] || data.eannadata_card_status || 'no');
                }
            } catch (err) {
                console.error('Error fetching profile details:', err);
                toast.error('Failed to sync profile data.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName) {
            toast.error('Name is required');
            return;
        }

        if (trimmedName.length < 2 || trimmedName.length > 80) {
            toast.error('Name must be between 2 and 80 characters');
            return;
        }

        if (trimmedEmail) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                toast.error('Please enter a valid email address');
                return;
            }
        }

        setSaving(true);
        try {
            const updateData = { name: trimmedName };
            if (trimmedEmail) {
                updateData.email = trimmedEmail;
            } else {
                updateData.email = '';
            }
            
            const res = await customerApi.updateProfile(updateData);
            if (res.data?.success) {
                toast.success('Profile updated successfully');
                navigate('/profile');
            } else {
                toast.error(res.data?.message || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-center items-center">
                <Loader2 size={40} className="animate-spin text-slate-600" />
                <p className="text-sm text-slate-500 mt-2 font-medium">Loading profile details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10 flex flex-col">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors outline-none"
                >
                    <ArrowLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Edit Profile</h1>
            </div>

            <div className="flex-1 w-full max-w-md mx-auto p-6">
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
                    {/* Editable Fields */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <User size={18} className="text-slate-400" />
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter full name"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail size={18} className="text-slate-400" />
                            </span>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email address"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                        <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Admin Managed Details</span>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Mobile Number</label>
                                <div className="relative opacity-60">
                                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Phone size={18} className="text-slate-400" />
                                    </span>
                                    <input
                                        type="text"
                                        value={phone}
                                        disabled
                                        className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-normal pl-1">
                                    Mobile number and verified addresses are managed by administrative staff.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-350 text-white font-bold rounded-2xl shadow-lg transition-all"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Saving Changes...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditProfilePage;
