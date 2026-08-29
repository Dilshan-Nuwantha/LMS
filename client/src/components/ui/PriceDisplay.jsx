const PriceDisplay = ({ price, originalPrice, currency = 'INR', size = 'md' }) => {
    const formatPrice = (amount) => {
        if (currency === 'INR') {
            return `₹${amount.toLocaleString('en-IN')}`;
        }
        return `$${amount.toLocaleString('en-US')}`;
    };

    const sizeClasses = {
        sm: { price: 'text-lg', original: 'text-sm' },
        md: { price: 'text-2xl', original: 'text-base' },
        lg: { price: 'text-3xl', original: 'text-lg' },
        xl: { price: 'text-4xl', original: 'text-xl' }
    };

    const hasDiscount = originalPrice && originalPrice > price;
    const discountPercent = hasDiscount
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    if (price === 0) {
        return (
            <span className={`${sizeClasses[size].price} font-bold text-green-500`}>
                Free
            </span>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className={`${sizeClasses[size].price} font-bold text-slate-900 dark:text-white`}>
                {formatPrice(price)}
            </span>
            {hasDiscount && (
                <>
                    <span className={`${sizeClasses[size].original} text-slate-400 line-through`}>
                        {formatPrice(originalPrice)}
                    </span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium px-2 py-0.5 rounded">
                        {discountPercent}% off
                    </span>
                </>
            )}
        </div>
    );
};

export default PriceDisplay;
