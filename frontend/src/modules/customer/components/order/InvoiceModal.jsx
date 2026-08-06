import React, { useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@core/context/SettingsContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const InvoiceModal = ({ isOpen, onClose, order }) => {
    const { settings } = useSettings();
    const invoiceRef = useRef(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    if (!order) return null;

    const appName = settings?.appName || 'eAnnadata canteen';
    const primaryColor = settings?.primaryColor || '#16a34a';

    // Lock body scroll while modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const orderId = order.orderId || order._id || '';
    const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }) : '—';

    const address = order.address || {};
    const customerName = address.name || order.customerName || order.customer?.name || 'Valued Customer';
    const customerPhone = address.phone || order.customerPhone || order.customer?.phone || '—';
    const fullAddress = [
        address.address || address.completeAddress,
        address.landmark ? `Landmark: ${address.landmark}` : null,
        address.city
    ].filter(Boolean).join(', ') || 'Address not specified';

    const seller = order.seller || {};
    const shopName = seller.shopName || seller.name || seller.storeName || `${appName} Partner Merchant`;

    const items = Array.isArray(order.items) ? order.items : [];
    const pricing = order.pricing || {};

    const subtotal = pricing.subtotal ?? items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const deliveryFee = pricing.deliveryFee ?? 0;
    const platformFee = pricing.platformFee ?? 0;
    const gst = pricing.gst ?? pricing.taxTotal ?? 0;
    const tip = pricing.tip ?? pricing.tipAmount ?? 0;
    const discount = pricing.discount ?? pricing.discountTotal ?? 0;
    const walletAmount = pricing.walletAmount ?? pricing.walletUsed ?? 0;
    const grandTotal = pricing.total ?? pricing.grandTotal ?? Math.max(0, subtotal + deliveryFee + platformFee + gst + tip - discount - walletAmount);

    const paymentMode = order.paymentMode || order.paymentMethod || order.payment?.method || 'COD';
    const paymentStatus = order.paymentStatus || order.payment?.status || (paymentMode === 'ONLINE' ? 'PAID' : 'PENDING');

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        const element = invoiceRef.current;
        if (!element) {
            toast.error("Invoice element not found");
            return;
        }

        setIsGeneratingPdf(true);
        toast.info("Generating PDF Invoice...");

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                backgroundColor: "#ffffff",
                onclone: (clonedDoc) => {
                    const styleSheets = clonedDoc.styleSheets;
                    for (let i = 0; i < styleSheets.length; i++) {
                        try {
                            const rules = styleSheets[i].cssRules || styleSheets[i].rules;
                            for (let j = rules.length - 1; j >= 0; j--) {
                                if (rules[j].cssText && rules[j].cssText.includes('oklch')) {
                                    styleSheets[i].deleteRule(j);
                                }
                            }
                        } catch (e) {
                            // ignore cross-origin rules
                        }
                    }

                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        :root {
                            --primary: ${primaryColor} !important;
                            --secondary: #64748b !important;
                            --background: #ffffff !important;
                            --foreground: #0f172a !important;
                        }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Invoice_${orderId}.pdf`);
            toast.success("Invoice downloaded successfully!");
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF invoice.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Tax Invoice</h2>
                                    <p className="text-xs text-slate-500 font-medium">#{orderId}</p>
                                </div>
                                <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-200 transition-colors shadow-sm border border-slate-100">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Printable Modal Content Preview */}
                            <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-white" id="printable-invoice">
                                {/* Header Info */}
                                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-100 pb-6">
                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight" style={{ color: primaryColor }}>{appName}</h1>
                                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Official Tax Invoice</p>
                                        <p className="text-xs text-slate-500 mt-2">
                                            {settings?.companyName || appName}<br />
                                            {settings?.address || 'Verified Business Location'}
                                            {settings?.taxId && <><br /><span className="font-semibold text-slate-700">GSTIN: {settings.taxId}</span></>}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl inline-block text-left min-w-[180px]">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice Reference</p>
                                            <p className="text-sm font-black text-slate-800 mb-2">#{orderId}</p>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issued Date</p>
                                            <p className="text-xs font-semibold text-slate-700">{createdDate}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Billing & Shipping Address Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed & Delivered To</p>
                                        <p className="text-sm font-black text-slate-800">{customerName}</p>
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{fullAddress}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-2">Phone: <span className="text-slate-800">{customerPhone}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fulfilled & Shipped From</p>
                                        <p className="text-sm font-black text-slate-800">{shopName}</p>
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                            {settings?.address || 'Inventory Fulfillment Center'}
                                        </p>
                                        <div className="flex gap-4 mt-2 text-xs font-bold text-slate-600">
                                            <span>Payment: <b className="text-slate-900 uppercase">{paymentMode}</b></span>
                                            <span>Status: <b className="text-emerald-700 uppercase">{paymentStatus}</b></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Items Manifest Table */}
                                <div className="border rounded-2xl overflow-hidden border-slate-100 shadow-sm">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-center">Unit Price</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {items.map((item, idx) => {
                                                const unitPrice = Number(item.price || 0);
                                                const qty = Number(item.quantity || 1);
                                                const itemTotal = Math.round(unitPrice * qty);
                                                const variantLabel = item.variantName || item.variantSku || item.weight;
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <p className="font-bold text-slate-800">{item.name}</p>
                                                            {variantLabel && (
                                                                <p className="text-[10px] text-slate-400 font-medium">Variant: {variantLabel}</p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-center font-semibold">₹{unitPrice}</td>
                                                        <td className="px-4 py-3 text-slate-700 text-center font-bold">{qty}</td>
                                                        <td className="px-4 py-3 text-slate-900 font-black text-right">₹{itemTotal}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary & Total Breakdown */}
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-2">
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs space-y-1 w-full md:w-1/2">
                                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Payment Summary</p>
                                        <p className="text-slate-600">Payment Mode: <b className="text-slate-800">{paymentMode}</b></p>
                                        <p className="text-slate-600">Payment Status: <b className="text-slate-800">{paymentStatus}</b></p>
                                        <p className="text-slate-400 text-[10px] pt-1">Computer generated invoice. No physical signature required.</p>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-slate-600 w-full md:w-5/12 ml-auto">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span className="font-bold text-slate-800">₹{subtotal}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Delivery Charge</span>
                                            <span className="font-bold text-slate-800">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                                        </div>
                                        {platformFee > 0 && (
                                            <div className="flex justify-between">
                                                <span>Platform Fee</span>
                                                <span className="font-bold text-slate-800">₹{platformFee}</span>
                                            </div>
                                        )}
                                        {gst > 0 && (
                                            <div className="flex justify-between">
                                                <span>GST / Taxes</span>
                                                <span className="font-bold text-slate-800">₹{gst}</span>
                                            </div>
                                        )}
                                        {tip > 0 && (
                                            <div className="flex justify-between">
                                                <span>Rider Tip</span>
                                                <span className="font-bold text-slate-800">₹{tip}</span>
                                            </div>
                                        )}
                                        {discount > 0 && (
                                            <div className="flex justify-between text-emerald-600 font-medium">
                                                <span>Discount</span>
                                                <span>-₹{discount}</span>
                                            </div>
                                        )}
                                        {walletAmount > 0 && (
                                            <div className="flex justify-between text-brand-600 font-medium">
                                                <span>Wallet Credit Applied</span>
                                                <span>-₹{walletAmount}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                                            <span>Grand Total Paid</span>
                                            <span style={{ color: primaryColor }}>₹{grandTotal}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                                <button
                                    onClick={handlePrint}
                                    className="flex-1 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Printer size={18} /> Print
                                </button>
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={isGeneratingPdf}
                                    className="flex-1 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-transform active:scale-95 shadow-sm disabled:opacity-50"
                                >
                                    {isGeneratingPdf ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin text-slate-500" /> Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} /> Save PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Off-screen high-res printable template for html2canvas PDF export */}
                    <div className="fixed -left-[9999px] top-0 pointer-events-none">
                        <div
                            ref={invoiceRef}
                            className="w-[800px] bg-slate-50 p-2"
                            style={{ backgroundColor: "#f8fafc" }}
                        >
                            <div style={{
                                backgroundColor: "#ffffff",
                                margin: "30px",
                                padding: "45px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "4px",
                                fontFamily: "'Inter', system-ui, sans-serif",
                                color: "#1e293b",
                                minHeight: "1000px"
                            }}>
                                {/* Header */}
                                <div style={{ textAlign: "center", marginBottom: "40px" }}>
                                    <div style={{ fontSize: "28px", fontWeight: "900", color: primaryColor, marginBottom: "4px" }}>{appName}</div>
                                    <div style={{ fontSize: "10px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "3px" }}>Official Commercial Tax Invoice</div>
                                </div>

                                {/* Reference & Date */}
                                <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "40px", borderBottom: "1px solid #f1f5f9", paddingBottom: "20px" }}>
                                    <tr>
                                        <td width="50%" style={{ verticalAlign: "bottom" }}>
                                            <div style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a" }}>INVOICE</div>
                                        </td>
                                        <td width="50%" align="right" style={{ verticalAlign: "bottom" }}>
                                            <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "4px" }}>Reference: <span style={{ color: "#2563eb" }}>#{orderId}</span></div>
                                            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Issued: {createdDate}</div>
                                        </td>
                                    </tr>
                                </table>

                                {/* Billed to & Shipped from */}
                                <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "45px" }}>
                                    <tr>
                                        <td width="48%" style={{ verticalAlign: "top", paddingRight: "20px" }}>
                                            <div style={{ fontSize: "9px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Billed & Delivered To</div>
                                            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>{customerName}</div>
                                            <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>{fullAddress}</div>
                                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", marginTop: "12px" }}>Contact: {customerPhone}</div>
                                        </td>
                                        <td width="4%" style={{ borderLeft: "1px solid #f1f5f9" }}></td>
                                        <td width="48%" style={{ verticalAlign: "top", paddingLeft: "20px" }}>
                                            <div style={{ fontSize: "9px", fontWeight: "900", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "10px" }}>Fulfilled & Shipped From</div>
                                            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a", marginBottom: "6px" }}>{shopName}</div>
                                            <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>{settings?.address || 'Verified Business Center'}</div>
                                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb", marginTop: "12px" }}>{settings?.taxId ? `GSTIN: ${settings.taxId}` : 'Tax Verified Merchant'}</div>
                                        </td>
                                    </tr>
                                </table>

                                {/* Table */}
                                <div style={{ marginBottom: "40px" }}>
                                    <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                                                <th align="left" style={{ padding: "14px 16px", fontSize: "11px", fontWeight: "900", color: "#475569", textTransform: "uppercase" }}>Description</th>
                                                <th align="center" style={{ padding: "14px 16px", fontSize: "11px", fontWeight: "900", color: "#475569", textTransform: "uppercase" }}>Unit Rate</th>
                                                <th align="center" style={{ padding: "14px 16px", fontSize: "11px", fontWeight: "900", color: "#475569", textTransform: "uppercase" }}>Qty</th>
                                                <th align="right" style={{ padding: "14px 16px", fontSize: "11px", fontWeight: "900", color: "#475569", textTransform: "uppercase" }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => {
                                                const unitPrice = Number(item.price || 0);
                                                const qty = Number(item.quantity || 1);
                                                const itemTotal = Math.round(unitPrice * qty);
                                                const variantLabel = item.variantName || item.variantSku || item.weight;
                                                return (
                                                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                        <td style={{ padding: "14px 16px" }}>
                                                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>{item.name}</div>
                                                            {variantLabel && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "3px" }}>Variant: {variantLabel}</div>}
                                                        </td>
                                                        <td align="center" style={{ padding: "14px 16px", fontSize: "13px", color: "#475569", fontWeight: "600" }}>₹{unitPrice}</td>
                                                        <td align="center" style={{ padding: "14px 16px", fontSize: "13px", color: "#475569", fontWeight: "800" }}>{qty}</td>
                                                        <td align="right" style={{ padding: "14px 16px", fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>₹{itemTotal}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Financial Summary */}
                                <table width="100%" cellPadding="0" cellSpacing="0" style={{ marginBottom: "50px" }}>
                                    <tr>
                                        <td width="50%" style={{ verticalAlign: "top" }}>
                                            <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                                                <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "900", textTransform: "uppercase", marginBottom: "10px", letterSpacing: "1.5px" }}>Transaction Detail</div>
                                                <div style={{ fontSize: "12px", color: "#475569", marginBottom: "6px" }}>Payment Method: <b style={{ color: "#0f172a", textTransform: "uppercase" }}>{paymentMode}</b></div>
                                                <div style={{ fontSize: "12px", color: "#475569" }}>Payment Status: <b style={{ color: "#0f172a", textTransform: "uppercase" }}>{paymentStatus}</b></div>
                                            </div>
                                        </td>
                                        <td width="10%"></td>
                                        <td width="40%" style={{ verticalAlign: "top" }}>
                                            <table width="100%" cellPadding="6" cellSpacing="0">
                                                <tr>
                                                    <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Subtotal</td>
                                                    <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>₹{subtotal}</td>
                                                </tr>
                                                <tr>
                                                    <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Delivery Charge</td>
                                                    <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#2563eb" }}>{deliveryFee === 0 ? 'FREE' : `+ ₹${deliveryFee}`}</td>
                                                </tr>
                                                {platformFee > 0 && (
                                                    <tr>
                                                        <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Platform Fee</td>
                                                        <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>+ ₹{platformFee}</td>
                                                    </tr>
                                                )}
                                                {gst > 0 && (
                                                    <tr>
                                                        <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>GST / Taxes</td>
                                                        <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>+ ₹{gst}</td>
                                                    </tr>
                                                )}
                                                {tip > 0 && (
                                                    <tr>
                                                        <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Rider Tip</td>
                                                        <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>+ ₹{tip}</td>
                                                    </tr>
                                                )}
                                                {discount > 0 && (
                                                    <tr>
                                                        <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Discount</td>
                                                        <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>- ₹{discount}</td>
                                                    </tr>
                                                )}
                                                {walletAmount > 0 && (
                                                    <tr>
                                                        <td align="left" style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Wallet Credit</td>
                                                        <td align="right" style={{ fontSize: "13px", fontWeight: "800", color: "#16a34a" }}>- ₹{walletAmount}</td>
                                                    </tr>
                                                )}
                                                <tr>
                                                    <td colSpan="2" style={{ padding: "8px 0" }}><div style={{ height: "1px", backgroundColor: "#e2e8f0" }}></div></td>
                                                </tr>
                                                <tr>
                                                    <td align="left" style={{ fontSize: "14px", fontWeight: "900", color: "#0f172a" }}>Grand Total</td>
                                                    <td align="right" style={{ fontSize: "22px", fontWeight: "900", color: primaryColor }}>₹{grandTotal}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                {/* Footer */}
                                <div style={{ marginTop: "auto", paddingTop: "30px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", letterSpacing: "2px" }}>
                                        Thank you for ordering with {appName}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "8px", fontWeight: "500" }}>
                                        This is an official system-generated commercial tax invoice. No physical signature required.
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                                        {appName} • Support: {settings?.supportEmail || 'support@eannadata.com'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <style>
                        {`
                            @media print {
                                body * { visibility: hidden !important; }
                                #printable-invoice, #printable-invoice * { visibility: visible !important; }
                                #printable-invoice {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    max-height: none !important;
                                    overflow: visible !important;
                                    background: #ffffff !important;
                                    padding: 20px !important;
                                    margin: 0 !important;
                                    box-shadow: none !important;
                                }
                            }
                        `}
                    </style>
                </>
            )}
        </AnimatePresence>
    );
};

export default InvoiceModal;
