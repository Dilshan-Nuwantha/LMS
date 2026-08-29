import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaDownload, FaCheckCircle, FaClock, FaShareAlt } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const InvoicePage = () => {
    const { invoiceNumber } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchInvoice();
    }, [invoiceNumber]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/purchase/invoice/${invoiceNumber}`);
            setInvoice(res.data);
        } catch (error) {
            showError('Invoice not found');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await api.get(`/purchase/invoice/${invoiceNumber}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            showError('Failed to download invoice');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        showSuccess('Invoice link copied to clipboard!');
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const currencySymbol = invoice?.currency === 'USD' ? '$' : '₹';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Invoice Not Found</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">The invoice you're looking for doesn't exist.</p>
                    <Link to="/marketplace" className="text-indigo-500 hover:text-indigo-600 font-medium">
                        Go to Marketplace
                    </Link>
                </div>
            </div>
        );
    }

    const isPaid = invoice.invoiceStatus === 'paid';

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Action Bar */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                        Invoice {invoice.invoiceNumber}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <FaShareAlt className="text-xs" /> Copy Link
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <FaDownload className="text-xs" />
                            {downloading ? 'Downloading...' : 'Download PDF'}
                        </button>
                    </div>
                </div>

                {/* Invoice Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="px-8 pt-8 pb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Skill Path</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Course Marketplace</p>
                            </div>
                            <div className="text-right">
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white">INVOICE</h3>
                                <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isPaid
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    }`}>
                                    {isPaid ? <FaCheckCircle /> : <FaClock />}
                                    {isPaid ? 'Paid' : 'Created'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Invoice Number</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice.invoiceNumber}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Date</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(invoice.date)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Payment ID</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{invoice.paymentId || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bill To / Instructor */}
                    <div className="px-8 py-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Bill To</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice.student?.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.student?.email}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Instructor</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice.instructor?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-8">
                        <table className="w-full">
                            <thead>
                                <tr className="border-y border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <th className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Item</th>
                                    <th className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
                                    <th className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <td className="py-4 px-4">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{invoice.course?.title}</p>
                                        {invoice.course?.level && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{invoice.course.level}</p>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-400">
                                        {invoice.course?.category || '-'}
                                    </td>
                                    <td className="py-4 px-4 text-sm text-slate-900 dark:text-white text-right font-medium">
                                        {currencySymbol}{invoice.originalPrice || invoice.amount}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="px-8 py-6">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                {invoice.discountAmount > 0 && (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                                            <span className="text-slate-900 dark:text-white">{currencySymbol}{invoice.originalPrice}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 dark:text-green-400">Discount</span>
                                            <span className="text-green-600 dark:text-green-400">-{currencySymbol}{invoice.discountAmount}</span>
                                        </div>
                                    </>
                                )}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                                    <span className="text-base font-bold text-slate-900 dark:text-white">Total</span>
                                    <span className="text-base font-bold text-slate-900 dark:text-white">{currencySymbol}{invoice.amount}</span>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-semibold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {isPaid ? 'Payment Received' : 'Payment Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            Thank you for your purchase! This is a computer-generated invoice.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePage;
