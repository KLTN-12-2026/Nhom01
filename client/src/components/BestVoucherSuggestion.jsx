import React from 'react';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import toast from 'react-hot-toast';

const BestVoucherSuggestion = ({
    bestVoucher,
    selectedVouchers,
    setSelectedVouchers,
    onDismiss,
}) => {
    if (
        !bestVoucher?.bestCombination ||
        bestVoucher.bestCombination.totalSavings <= 0
    ) {
        return null;
    }

    const { bestCombination } = bestVoucher;

    const handleApply = () => {
        const newVouchers = { ...selectedVouchers };

        if (bestCombination.regular) {
            const voucher = bestCombination.regular;
            const formattedVoucher = {
                ...voucher,
                discount: Number(
                    voucher.discount !== undefined && voucher.discount !== null
                        ? voucher.discount
                        : (voucher.discountValue || 0)
                ),
                discountValue: Number(
                    voucher.discountValue !== undefined && voucher.discountValue !== null
                        ? voucher.discountValue
                        : (voucher.discount || 0)
                ),
            };
            newVouchers.regular = formattedVoucher;
        }

        setSelectedVouchers(newVouchers);
        onDismiss();
        toast.success('Đã áp dụng mã giảm giá tốt nhất!');
    };

    return (
        <div className="bg-card border border-primary/30 rounded-2xl p-4 mb-4 relative overflow-hidden shadow-xs">
            {/* Subtle brand tint */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>

            <div className="relative flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center text-primary">
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-foreground font-semibold text-sm mb-1 flex items-center gap-2">
                        💡 Tiết kiệm tối đa!
                        <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                            Gợi ý
                        </span>
                    </h3>

                    <p className="text-xs text-muted-foreground mb-3">
                        Dùng mã{' '}
                        <span className="font-bold text-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
                            {bestCombination.regular.code}
                        </span>{' '}
                        để tiết kiệm{' '}
                        <span className="font-bold text-primary text-sm">
                            {DisplayPriceInVND(bestCombination.totalSavings)}
                        </span>
                    </p>

                    {/* Savings info */}
                    <div className="text-xs text-muted-foreground mb-3">
                        <div className="flex justify-between">
                            <span>• Giảm giá đơn hàng:</span>
                            <span className="text-primary font-semibold">
                                -
                                {DisplayPriceInVND(
                                    bestCombination.regular.calculatedDiscount
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleApply}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 shadow-xs"
                        >
                            ⚡ Áp dụng ngay
                        </button>
                        <button
                            onClick={onDismiss}
                            className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-medium transition-colors border border-border/60"
                        >
                            Bỏ qua
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BestVoucherSuggestion;
