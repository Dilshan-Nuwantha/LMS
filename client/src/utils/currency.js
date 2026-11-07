export const formatMoney = (amount, currency = 'LKR') => currency === 'USD'
    ? `$${(amount || 0).toLocaleString('en-US')}`
    : `Rs. ${(amount || 0).toLocaleString('en-LK')}`;
