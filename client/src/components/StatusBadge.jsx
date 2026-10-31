import React from 'react';
import PropTypes from 'prop-types';

const StatusBadge = ({ status, className = '' }) => {
    const statusConfig = {
        'Đang chờ thanh toán': {
            text: 'Đang chờ thanh toán',
            bgColor: 'bg-amber-500/10',
            textColor: 'text-amber-600 dark:text-amber-400',
            borderColor: 'border-amber-500/30',
            icon: '⏳',
        },
        'Đã thanh toán': {
            text: 'Đã thanh toán',
            bgColor: 'bg-emerald-500/10',
            textColor: 'text-emerald-600 dark:text-emerald-400',
            borderColor: 'border-emerald-500/30',
            icon: '✓',
        },
        'Thanh toán khi giao hàng': {
            text: 'Thanh toán khi giao hàng',
            bgColor: 'bg-sky-500/10',
            textColor: 'text-sky-600 dark:text-sky-400',
            borderColor: 'border-sky-500/30',
            icon: '🚚',
        },
        // Fallback for any unexpected status
        default: {
            text: status || 'Không xác định',
            bgColor: 'bg-muted',
            textColor: 'text-muted-foreground',
            borderColor: 'border-border/80',
            icon: '❓',
        },
    };

    const config = statusConfig[status] || statusConfig.default;

    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor} shadow-2xs ${className}`}
        >
            <span className="mr-1.5">{config.icon}</span>
            {config.text}
        </span>
    );
};

StatusBadge.propTypes = {
    status: PropTypes.oneOf([
        'Thanh toán khi giao hàng',
        'Đang chờ thanh toán',
        'Đã thanh toán',
    ]),
    className: PropTypes.string,
};

export default StatusBadge;
