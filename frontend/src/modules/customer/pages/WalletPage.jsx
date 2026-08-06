import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, Wallet } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { toast } from 'sonner';

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WalletPage = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [lockedBalance, setLockedBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

    const fetchWalletData = async () => {
        setLoading(true);
        try {
            const [profileRes, txRes] = await Promise.all([
                customerApi.getProfile(),
                customerApi.getWalletTransactions(),
            ]);
            const profile = profileRes.data?.result ?? profileRes.data?.data ?? profileRes.data;
            const txData = txRes.data?.result?.items ?? txRes.data?.items ?? [];
            setBalance(profile?.walletBalance ?? 0);
            setLockedBalance(profile?.pendingSubsidy ?? profile?.lockedSubsidyBalance ?? 0);
            setTransactions(Array.isArray(txData) ? txData : []);
        } catch (err) {
            console.error('Wallet fetch error:', err);
            setBalance(0);
            setLockedBalance(0);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, []);

    const handleWithdrawSubmit = async () => {
        const amt = Number(withdrawAmount);
        if (!amt || amt <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (amt > balance) {
            toast.error(`Insufficient balance. Max available: ₹${balance}`);
            return;
        }

        setIsSubmittingWithdrawal(true);
        try {
            const res = await customerApi.requestWithdrawal({ amount: amt });
            if (res.data?.success) {
                toast.success('Withdrawal request submitted successfully');
                setIsWithdrawModalOpen(false);
                setWithdrawAmount('');
                await fetchWalletData(); // Refresh balances and transactions list
            } else {
                toast.error(res.data?.message || 'Failed to submit withdrawal request');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit withdrawal request');
        } finally {
            setIsSubmittingWithdrawal(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans">
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Wallet</h1>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Available Balance</p>
                            <h2 className="text-3xl font-semibold text-slate-900 mt-1">
                                {loading ? '...' : `₹${(balance || 0).toLocaleString('en-IN')}`}
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Return refunds are credited here</p>
                        </div>
                        <div className="border-l border-slate-200 pl-6 text-right">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-amber-600">Pending Subsidy</p>
                            <h2 className="text-2xl font-semibold text-amber-600 mt-1">
                                {loading ? '...' : `₹${(lockedBalance || 0).toLocaleString('en-IN')}`}
                            </h2>
                            <p className="text-[10px] text-slate-400 mt-1">Locked during return days</p>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-end">
                        <button
                            onClick={() => {
                                setWithdrawAmount('');
                                setIsWithdrawModalOpen(true);
                            }}
                            disabled={balance <= 0}
                            className="px-4 py-2 bg-[#1a8a3c] hover:bg-[#155228] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            WITHDRAW TO BANK
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-800">Transaction History</h3>
                        <Wallet size={18} className="text-slate-400" />
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center text-slate-400 text-sm font-semibold">
                            Loading...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-semibold text-slate-500 mb-1">No wallet payments yet</p>
                            <p className="text-xs text-slate-400">
                                Wallet deposits and payouts will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {transactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-700'}`}>
                                            {tx.type === 'credit' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm capitalize">{tx.title}</h4>
                                            {tx.description && (
                                                <p className="text-[11px] text-slate-500">{tx.description}</p>
                                            )}
                                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-brand-600' : 'text-slate-900'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                                        </div>
                                        {tx.status && tx.status !== 'completed' && (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mt-1 inline-block">
                                                {tx.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Withdraw Modal */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setIsWithdrawModalOpen(false)}
                    />
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-5 relative z-10 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Withdraw to Bank</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Transfer your available wallet balance directly to your bank account.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Amount to Withdraw (₹)
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Available for withdrawal: ₹{balance}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={handleWithdrawSubmit}
                                    disabled={isSubmittingWithdrawal}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-[#1a8a3c] hover:bg-[#155228] disabled:opacity-50 rounded-xl transition-all"
                                >
                                    {isSubmittingWithdrawal ? 'SUBMITTING...' : 'WITHDRAW'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
