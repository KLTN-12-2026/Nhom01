import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaCopy, FaTimesCircle, FaCheckCircle, FaSpinner, FaQrcode } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';

const SepayPaymentPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [paymentId, setPaymentId] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    const pollingIntervalRef = useRef(null);
    const timerIntervalRef = useRef(null);

    // Get paymentId from URL query string
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('paymentId');
        if (id) {
            setPaymentId(id);
        } else {
            toast.error('Thiếu mã thanh toán!');
            navigate('/');
        }
    }, [location, navigate]);

    // Fetch payment details
    useEffect(() => {
        if (!paymentId) return;

        const fetchPaymentDetails = async () => {
            try {
                const response = await Axios({
                    url: `${SummaryApi.get_payment_details.url.replace(':paymentId', paymentId)}`,
                    method: SummaryApi.get_payment_details.method
                });

                if (response.data.success) {
                    setPaymentDetails(response.data.data);
                } else {
                    toast.error(response.data.message || 'Không tải được thông tin thanh toán');
                    navigate('/');
                }
            } catch (error) {
                console.error('Error fetching payment details:', error);
                toast.error('Có lỗi xảy ra khi tải thông tin thanh toán');
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchPaymentDetails();
    }, [paymentId, navigate]);

    // Polling function for status check
    const checkPaymentStatus = async (silent = true) => {
        if (!paymentId || paymentSuccess) return;

        try {
            if (!silent) setChecking(true);
            const response = await Axios({
                url: `${SummaryApi.get_payment_status.url.replace(':paymentId', paymentId)}`,
                method: SummaryApi.get_payment_status.method
            });

            if (response.data.success && response.data.isPaid) {
                // Clear intervals
                clearInterval(pollingIntervalRef.current);
                clearInterval(timerIntervalRef.current);
                
                setPaymentSuccess(true);
                
                toast.success('Thanh toán thành công!');
                
                // Redirect after 2.5 seconds to show the animation
                setTimeout(() => {
                    if (paymentDetails?.isBooking) {
                        navigate(`/booking/success?session_id=${paymentId}&booking_id=${paymentDetails.bookingId}${paymentDetails.orderId ? `&order_id=${paymentDetails.orderId}` : ''}`);
                    } else {
                        navigate(`/success?session_id=${paymentId}`);
                    }
                }, 2500);
            } else {
                if (!silent) {
                    toast.error('Hệ thống chưa nhận được khoản thanh toán của bạn. Vui lòng thử lại sau vài giây.');
                }
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            if (!silent) {
                toast.error('Không kiểm tra được trạng thái thanh toán. Vui lòng thử lại.');
            }
        } finally {
            if (!silent) setChecking(false);
        }
    };

    // Setup timer and polling intervals
    useEffect(() => {
        if (!paymentId || loading || paymentSuccess) return;

        // Poll status every 3 seconds
        pollingIntervalRef.current = setInterval(() => {
            checkPaymentStatus(true);
        }, 3000);

        // Countdown timer
        timerIntervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(pollingIntervalRef.current);
                    clearInterval(timerIntervalRef.current);
                    handleCancelPayment(true); // Auto cancel when time runs out
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(pollingIntervalRef.current);
            clearInterval(timerIntervalRef.current);
        };
    }, [paymentId, loading, paymentSuccess, paymentDetails]);

    // Handle Copy Click
    const handleCopy = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`Đã sao chép ${label}!`);
    };

    // Handle Cancel Click
    const handleCancelPayment = async (autoCancelled = false) => {
        if (!autoCancelled && !window.confirm('Bạn có chắc muốn hủy thanh toán và đơn hàng này?')) {
            return;
        }

        try {
            setLoading(true);
            
            // Clean up by calling cleanup_cancelled_payment
            await Axios({
                ...SummaryApi.cleanup_cancelled_payment,
                data: { sessionId: paymentId }
            });

            toast.error(autoCancelled ? 'Thời gian thanh toán đã hết hạn. Đơn hàng đã bị hủy.' : 'Đã hủy thanh toán & hủy đơn hàng');
            
            navigate(paymentDetails?.isBooking ? '/booking' : '/cart');
        } catch (error) {
            console.error('Error cancelling payment:', error);
            toast.error('Có lỗi xảy ra khi hủy thanh toán');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // Format remaining time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-5xl text-primary mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">Đang tải thông tin thanh toán...</p>
                </div>
            </div>
        );
    }

    if (!paymentDetails) return null;

    return (
        <div className="min-h-screen bg-background text-foreground py-10 px-4 flex items-center justify-center font-sans">
            <AnimatePresence mode="wait">
                {paymentSuccess ? (
                    <motion.div
                        key="success"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-lg"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="w-24 h-24 bg-green-500/10 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400 text-5xl shadow-sm"
                        >
                            <FaCheckCircle />
                        </motion.div>
                        <h2 className="text-3xl font-bold mb-3 text-green-600 dark:text-green-400">Thanh toán thành công!</h2>
                        <p className="text-muted-foreground mb-6">Hệ thống đã nhận được tiền và xác nhận đơn đặt hàng của bạn.</p>
                        <div className="text-sm bg-muted/50 rounded-xl p-4 border border-border text-muted-foreground">
                            Đang điều hướng về trang kết quả...
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="payment-card"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="max-w-4xl w-full bg-card/90 backdrop-blur-md border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                    >
                        {/* Left Side: QR and status */}
                        <div className="flex-1 p-8 bg-muted/30 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative bg-white p-4 rounded-2xl shadow-xl border border-border">
                                    <img
                                        src={paymentDetails.qrCode}
                                        alt="VietQR Payment Code"
                                        className="w-64 h-64 mx-auto object-contain rounded-lg"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-2xl pointer-events-none">
                                        <div className="text-center text-white p-4">
                                            <FaQrcode className="text-4xl mx-auto mb-2 text-primary" />
                                            <p className="text-xs">Quét mã bằng ứng dụng ngân hàng để tự động điền thông tin</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                <div className="inline-flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 mb-4 animate-pulse">
                                    <FaSpinner className="animate-spin text-sm" />
                                    <span>Đang chờ chuyển khoản...</span>
                                </div>
                                <div className="text-muted-foreground text-sm">
                                    Thời gian thanh toán còn lại:
                                    <span className="ml-1.5 font-mono text-amber-600 dark:text-amber-400 font-bold text-lg bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Bank details & Actions */}
                        <div className="flex-1 p-8 flex flex-col justify-between">
                            <div>
                                <h2 className="text-2xl font-bold mb-1 text-foreground">Thông tin chuyển khoản</h2>
                                <p className="text-xs text-muted-foreground mb-6">Vui lòng chuyển đúng số tiền và nội dung chuyển khoản dưới đây.</p>

                                <div className="space-y-4">
                                    <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Ngân hàng</div>
                                            <div className="font-bold text-foreground">{paymentDetails.bankName}</div>
                                        </div>
                                    </div>

                                    <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Số tài khoản</div>
                                            <div className="font-mono font-bold text-foreground text-lg">{paymentDetails.accountNumber}</div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(paymentDetails.accountNumber, 'số tài khoản')}
                                            className="text-muted-foreground hover:text-primary p-2 hover:bg-muted rounded-lg transition"
                                            title="Sao chép"
                                        >
                                            <FaCopy />
                                        </button>
                                    </div>

                                    <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Chủ tài khoản</div>
                                            <div className="font-bold text-foreground uppercase">{paymentDetails.accountName}</div>
                                        </div>
                                    </div>

                                    {paymentDetails.originalAmount && paymentDetails.originalAmount !== paymentDetails.amount && (
                                        <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                                            <div>
                                                <div className="text-xs text-muted-foreground">Tổng tiền hóa đơn (Giá gốc thực đơn)</div>
                                                <div className="font-bold text-muted-foreground text-lg font-mono">
                                                    {DisplayPriceInVND(paymentDetails.originalAmount)}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="bg-muted/40 border border-border/80 rounded-xl p-4 flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Số tiền chuyển khoản (Môi trường Test)</div>
                                            <div className="font-bold text-primary text-2xl font-mono">
                                                {DisplayPriceInVND(paymentDetails.amount)}
                                            </div>
                                            {paymentDetails.originalAmount && paymentDetails.originalAmount !== paymentDetails.amount && (
                                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                                    * Số tiền thực tế được chia nhỏ để tiện thử nghiệm thanh toán
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(paymentDetails.amount.toString(), 'số tiền')}
                                            className="text-muted-foreground hover:text-primary p-2 hover:bg-muted rounded-lg transition"
                                            title="Sao chép"
                                        >
                                            <FaCopy />
                                        </button>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex justify-between items-center relative overflow-hidden group">
                                        <div className="absolute inset-y-0 left-0 w-1 bg-amber-500"></div>
                                        <div>
                                            <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center">
                                                <span>Nội dung chuyển khoản (Bắt buộc ghi chính xác)</span>
                                            </div>
                                            <div className="font-mono font-black text-amber-700 dark:text-amber-400 text-xl tracking-wider select-all mt-1">
                                                {paymentDetails.memo}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy(paymentDetails.memo, 'nội dung chuyển khoản')}
                                            className="text-amber-700 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 p-2 hover:bg-amber-500/20 rounded-lg transition"
                                            title="Sao chép"
                                        >
                                            <FaCopy />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <button
                                    onClick={() => checkPaymentStatus(false)}
                                    disabled={checking}
                                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition duration-200 cursor-pointer"
                                >
                                    {checking ? (
                                        <FaSpinner className="animate-spin" />
                                    ) : (
                                        <span>Đã chuyển khoản - Kiểm tra trạng thái</span>
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => handleCancelPayment(false)}
                                    className="w-full bg-transparent hover:bg-destructive/10 text-destructive border border-destructive/30 font-medium py-3 rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] transition duration-200 cursor-pointer"
                                >
                                    <FaTimesCircle />
                                    <span>Hủy giao dịch & Hủy đơn hàng</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SepayPaymentPage;
