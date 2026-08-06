import React, { useState, useEffect, useMemo, useRef } from "react";
import Card from "@shared/components/ui/Card";
import Badge from "@shared/components/ui/Badge";
import Modal from "@shared/components/ui/Modal";
import Pagination from "@shared/components/ui/Pagination";
import {
  Search,
  Filter,
  Shield,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCw,
  FileText,
  CreditCard,
  Landmark,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminApi } from "../services/adminApi";
import { toast } from "sonner";

const RefundPayoutManagement = () => {
  const [refunds, setRefunds] = useState([]);
  const [totalRefunds, setTotalRefunds] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [loading, setLoading] = useState(true);

  // Detail Modal States
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [decryptedData, setDecryptedData] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptCountdown, setDecryptCountdown] = useState(0);
  
  // Status Update States
  const [statusRemarks, setStatusRemarks] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [selectedStatusAction, setSelectedStatusAction] = useState(""); // "APPROVED", "COMPLETED", etc.
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const countdownIntervalRef = useRef(null);

  const fetchRefunds = async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: pageSize,
      };
      if (filterStatus !== "all") {
        params.status = filterStatus;
      }
      if (filterMethod !== "all") {
        params.method = filterMethod;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const res = await adminApi.listRefundPayouts(params);
      if (res.data?.success && res.data?.result) {
        setRefunds(res.data.result.results || []);
        setTotalRefunds(res.data.result.total || 0);
        setPage(res.data.result.page || pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch refund payouts:", error);
      toast.error("Failed to retrieve refund payouts list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRefunds(1);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, filterStatus, filterMethod, pageSize]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Handle Reveal/Decrypt Action
  const handleRevealSecureData = async () => {
    if (!selectedRefund) return;
    try {
      setIsDecrypting(true);
      const res = await adminApi.decryptRefundPayout(selectedRefund._id);
      if (res.data?.success && res.data?.result) {
        setDecryptedData(res.data.result);
        toast.warning("🔴 Accessing secure financial data — this action is audited!");
        
        // Start 30 seconds countdown for automatic masking
        setDecryptCountdown(30);
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        
        countdownIntervalRef.current = setInterval(() => {
          setDecryptCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              setDecryptedData(null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to decrypt:", err);
      toast.error(err.response?.data?.message || "Failed to decrypt secure refund data");
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleMaskSecureData = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setDecryptedData(null);
    setDecryptCountdown(0);
  };

  // Status Change Actions
  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRefund || !selectedStatusAction) return;

    try {
      setIsUpdatingStatus(true);
      const payload = {
        status: selectedStatusAction,
        remarks: statusRemarks.trim(),
      };
      if (selectedStatusAction === "FAILED") {
        payload.failureReason = failureReason.trim() || statusRemarks.trim() || "Transfer failed";
      }

      const res = await adminApi.updateRefundPayoutStatus(selectedRefund._id, payload);
      if (res.data?.success && res.data?.result) {
        toast.success(`Refund status updated to ${selectedStatusAction}`);
        
        // Update local items
        const updatedRecord = res.data.result;
        setSelectedRefund(updatedRecord);
        setRefunds((prev) =>
          prev.map((item) => (item._id === updatedRecord._id ? updatedRecord : item))
        );

        // Reset inputs
        setSelectedStatusAction("");
        setStatusRemarks("");
        setFailureReason("");
        
        // Refresh detail info
        fetchRefunds(page);
      }
    } catch (err) {
      console.error("Status update failed:", err);
      toast.error(err.response?.data?.message || "Failed to update refund payout status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "APPROVED":
        return "primary";
      case "PROCESSING":
        return "info";
      case "COMPLETED":
        return "success";
      case "FAILED":
      case "REJECTED":
        return "danger";
      case "CANCELLED":
      default:
        return "secondary";
    }
  };

  const renderTimelineStatus = (status) => {
    return (
      <Badge variant={getStatusBadgeVariant(status)} className="font-extrabold text-[10px] tracking-wider px-2 py-0.5 uppercase">
        {status}
      </Badge>
    );
  };

  // Status transition validator for UI rendering
  const getAvailableTransitions = (status) => {
    switch (status) {
      case "PENDING":
        return ["APPROVED", "REJECTED", "CANCELLED"];
      case "APPROVED":
        return ["PROCESSING", "CANCELLED"];
      case "PROCESSING":
        return ["COMPLETED", "FAILED"];
      case "FAILED":
        return ["PROCESSING"];
      default:
        return [];
    }
  };

  const activeTransitions = selectedRefund ? getAvailableTransitions(selectedRefund.refundStatus) : [];

  return (
    <div className="ds-section-spacing space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            Refund Payouts Management
            <Badge variant="primary" className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider">
              Secure
            </Badge>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Validate return payout requests, securely decrypt bank details, and execute refunds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRefunds(page)}
            className="p-2.5 bg-white ring-1 ring-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Order ID or Customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-500 transition-all text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Method filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Method:</span>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="BANK_ACCOUNT">Bank Account</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-lg ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">Order / Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 pl-8">
                    <div>
                      <p className="text-sm font-bold text-slate-900 font-mono">{refund.orderPublicId}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{refund.customerName}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                      {refund.refundMethod === "UPI" ? (
                        <>
                          <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                          UPI
                        </>
                      ) : (
                        <>
                          <Landmark className="w-3.5 h-3.5 text-brand-500" />
                          Bank Account
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-900">₹{(refund.refundAmount || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {renderTimelineStatus(refund.refundStatus)}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    {new Date(refund.submittedAt || refund.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right pr-8">
                    <button
                      onClick={() => {
                        setSelectedRefund(refund);
                        handleMaskSecureData(); // Clear decrypted view if opening a new one
                      }}
                      className="inline-flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {refunds.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-slate-200 mb-2" />
                      <p className="font-bold">No refund payouts found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        {totalRefunds > 0 && (
          <div className="px-6 py-4 border-t border-slate-100">
            <Pagination
              page={page}
              totalPages={Math.ceil(totalRefunds / pageSize) || 1}
              total={totalRefunds}
              pageSize={pageSize}
              onPageChange={(p) => {
                setPage(p);
                fetchRefunds(p);
              }}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              loading={loading}
            />
          </div>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedRefund}
        onClose={() => {
          setSelectedRefund(null);
          handleMaskSecureData();
        }}
        title="Refund Request Details"
        size="md"
      >
        {selectedRefund && (
          <div className="space-y-6">
            
            {/* Upper Details Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Reference</h4>
                  <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{selectedRefund.orderPublicId}</p>
                </div>
                <div className="text-right">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Refund Status</h4>
                  <div className="mt-1">{renderTimelineStatus(selectedRefund.refundStatus)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-tight block">Customer Name</span>
                  <span className="text-slate-900 font-bold mt-0.5 block">{selectedRefund.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-tight block">Refund Amount</span>
                  <span className="text-brand-600 font-black text-sm mt-0.5 block">₹{(selectedRefund.refundAmount || 0).toFixed(2)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-tight block">Return Reason</span>
                  <span className="text-slate-800 font-medium mt-0.5 block bg-white border border-slate-100 rounded-lg p-2 italic">
                    "{selectedRefund.returnReason || "No reason specified"}"
                  </span>
                </div>
              </div>
            </div>

            {/* Payout Credentials Display Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-brand-600" />
                  Secure Payout Information
                </h3>

                {decryptedData ? (
                  <button
                    onClick={handleMaskSecureData}
                    className="inline-flex items-center text-xs font-bold text-slate-600 bg-white ring-1 ring-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1" />
                    Mask Details
                  </button>
                ) : (
                  <button
                    onClick={handleRevealSecureData}
                    disabled={isDecrypting}
                    className="inline-flex items-center text-xs font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    {isDecrypting ? "Decrypting..." : "Reveal Details"}
                  </button>
                )}
              </div>

              {/* Countdown Warning Banner */}
              {decryptCountdown > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 animate-pulse">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    Accessing sensitive data. Action logged.
                  </span>
                  <span className="font-mono bg-amber-100 px-2 py-0.5 rounded text-amber-950 font-extrabold">
                    Auto-hides in {decryptCountdown}s
                  </span>
                </div>
              )}

              {/* Credentials Fields */}
              <div className="grid grid-cols-3 gap-y-3 text-xs border-t border-slate-200 pt-3">
                <div className="text-slate-400 font-bold uppercase tracking-tight">Method</div>
                <div className="col-span-2 text-slate-800 font-bold">
                  {selectedRefund.refundMethod === "UPI" ? "📱 UPI Transfer" : "🏦 Bank Account Transfer"}
                </div>

                <div className="text-slate-400 font-bold uppercase tracking-tight">Account Holder</div>
                <div className="col-span-2 text-slate-900 font-semibold font-mono">
                  {decryptedData ? decryptedData.accountHolderName : selectedRefund.accountHolderNameMasked}
                </div>

                {selectedRefund.refundMethod === "UPI" ? (
                  <>
                    <div className="text-slate-400 font-bold uppercase tracking-tight">UPI ID</div>
                    <div className="col-span-2 text-slate-900 font-bold font-mono">
                      {decryptedData ? decryptedData.upiId : selectedRefund.upiIdMasked}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-slate-400 font-bold uppercase tracking-tight">Account No.</div>
                    <div className="col-span-2 text-slate-900 font-bold font-mono">
                      {decryptedData ? decryptedData.accountNumber : selectedRefund.accountNumberMasked}
                    </div>

                    <div className="text-slate-400 font-bold uppercase tracking-tight">IFSC Code</div>
                    <div className="col-span-2 text-slate-900 font-bold font-mono">
                      {selectedRefund.ifscCode}
                    </div>

                    {selectedRefund.bankName && (
                      <>
                        <div className="text-slate-400 font-bold uppercase tracking-tight">Bank Name</div>
                        <div className="col-span-2 text-slate-800">
                          {selectedRefund.bankName}
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Masked/Decrypted contact alerts */}
                {(decryptedData?.mobile || selectedRefund.mobileMasked) && (
                  <>
                    <div className="text-slate-400 font-bold uppercase tracking-tight">Mobile Alert</div>
                    <div className="col-span-2 text-slate-700 font-mono">
                      {decryptedData ? decryptedData.mobile : selectedRefund.mobileMasked}
                    </div>
                  </>
                )}
                {(decryptedData?.email || selectedRefund.emailMasked) && (
                  <>
                    <div className="text-slate-400 font-bold uppercase tracking-tight">Email Alert</div>
                    <div className="col-span-2 text-slate-700 font-mono">
                      {decryptedData ? decryptedData.email : selectedRefund.emailMasked}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lifecycle Status Change Form */}
            {activeTransitions.length > 0 ? (
              <form onSubmit={handleStatusUpdateSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-black text-slate-800">Update Refund Payout Status</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Target Status</label>
                    <select
                      required
                      value={selectedStatusAction}
                      onChange={(e) => setSelectedStatusAction(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="">Choose Status...</option>
                      {activeTransitions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStatusAction === "FAILED" && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Failure Reason *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Invalid Account Number"
                        value={failureReason}
                        onChange={(e) => setFailureReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Remarks / Audit Note</label>
                  <textarea
                    rows="2"
                    placeholder="Enter details for why you are executing this transition..."
                    value={statusRemarks}
                    onChange={(e) => setStatusRemarks(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-medium text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-100 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isUpdatingStatus ? "Processing Transition..." : "Apply Transition"}
                </button>
              </form>
            ) : (
              <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-500 font-bold">
                ℹ️ This record is in terminal state ({selectedRefund.refundStatus}) and cannot be transitioned further.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RefundPayoutManagement;
