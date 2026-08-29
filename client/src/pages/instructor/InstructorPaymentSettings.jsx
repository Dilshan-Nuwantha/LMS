import { useState, useEffect } from 'react';
import { FaBuildingColumns, FaMobileScreen } from 'react-icons/fa6';
import { FaPaypal, FaSave, FaCheckCircle } from 'react-icons/fa';
import api from '../../api/axios';
import { showSuccess, showError } from '../../utils/toast';

const InstructorPaymentSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        paypalEmail: '',
        preferredMethod: 'bank_transfer'
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetchBankDetails();
    }, []);

    const fetchBankDetails = async () => {
        try {
            const res = await api.get('/instructor/bank-details');
            if (res.data) {
                setForm({
                    accountHolderName: res.data.accountHolderName || '',
                    bankName: res.data.bankName || '',
                    accountNumber: res.data.accountNumber || '',
                    ifscCode: res.data.ifscCode || '',
                    upiId: res.data.upiId || '',
                    paypalEmail: res.data.paypalEmail || '',
                    preferredMethod: res.data.preferredMethod || 'bank_transfer'
                });
                setSaved(true);
            }
        } catch (error) {
            console.error('Failed to load bank details', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.accountHolderName.trim()) {
            showError('Account holder name is required');
            return;
        }
        setSaving(true);
        try {
            await api.post('/instructor/bank-details', form);
            showSuccess('Payment details saved');
            setSaved(true);
        } catch (error) {
            showError(error, 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 border-3 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const methods = [
        { id: 'bank_transfer', label: 'Bank Transfer', icon: FaBuildingColumns, desc: 'Direct bank transfer via NEFT/IMPS' },
        { id: 'upi', label: 'UPI', icon: FaMobileScreen, desc: 'Instant transfer via UPI ID' },
        { id: 'paypal', label: 'PayPal', icon: FaPaypal, desc: 'International payments via PayPal' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Settings</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Add your payment details so the admin can pay you for your course sales
                    </p>
                </div>

                {saved && (
                    <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                        <FaCheckCircle />
                        Payment details are saved. Admin can now process your payouts.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Preferred Method */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Preferred Payment Method</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {methods.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleChange('preferredMethod', m.id)}
                                    className={`p-4 rounded-lg border text-left transition-all ${
                                        form.preferredMethod === m.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <m.icon className={`text-lg mb-2 ${
                                        form.preferredMethod === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                                    }`} />
                                    <p className={`text-sm font-medium ${
                                        form.preferredMethod === m.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                                    }`}>{m.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Account Holder */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Account Holder</h2>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                            <input
                                type="text"
                                value={form.accountHolderName}
                                onChange={e => handleChange('accountHolderName', e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Enter your full name as per bank account"
                                required
                            />
                        </div>
                    </div>

                    {/* Bank Details */}
                    {form.preferredMethod === 'bank_transfer' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Bank Account Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                                    <input
                                        type="text"
                                        value={form.bankName}
                                        onChange={e => handleChange('bankName', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. State Bank of India"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={form.accountNumber}
                                        onChange={e => handleChange('accountNumber', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter your bank account number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={form.ifscCode}
                                        onChange={e => handleChange('ifscCode', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. SBIN0001234"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* UPI Details */}
                    {form.preferredMethod === 'upi' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">UPI Details</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">UPI ID</label>
                                <input
                                    type="text"
                                    value={form.upiId}
                                    onChange={e => handleChange('upiId', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. name@upi"
                                />
                            </div>
                        </div>
                    )}

                    {/* PayPal Details */}
                    {form.preferredMethod === 'paypal' && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-4">
                            <h2 className="font-semibold text-slate-900 dark:text-white mb-4">PayPal Details</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PayPal Email</label>
                                <input
                                    type="email"
                                    value={form.paypalEmail}
                                    onChange={e => handleChange('paypalEmail', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="your@email.com"
                                />
                            </div>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        <FaSave />
                        {saving ? 'Saving...' : 'Save Payment Details'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InstructorPaymentSettings;
