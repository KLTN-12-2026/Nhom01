const sepayConfig = {
    bankName: process.env.SEPAY_BANK_NAME || 'MB', // MBBank, VCB, etc.
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
    apiKey: process.env.SEPAY_API_KEY || ''
};

/**
 * Generates the VietQR payment URL for bank transfer
 * @param {number} amount - Transfer amount
 * @param {string} memo - Transfer description containing unique payment code
 * @returns {string} VietQR Image URL
 */
export function generateVietQR(amount, memo) {
    const bank = sepayConfig.bankName || 'MB';
    const account = sepayConfig.accountNumber || '0987654321';
    const name = encodeURIComponent(sepayConfig.accountName || 'NHA HANG RESTOHUB');
    return `https://img.vietqr.io/image/${bank}-${account}-compact2.jpg?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(memo)}&accountName=${name}`;
}

export default sepayConfig;
