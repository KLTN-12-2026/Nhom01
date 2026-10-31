import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiArrowLeft, FiLogOut } from 'react-icons/fi';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const TablePaymentSuccessPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (sessionId && !isLoaded) {
            setIsLoaded(true);
            toast.success(
                'Thanh toán thành công! Đơn hàng của bạn đã được xác nhận.',
                {
                    duration: 4000,
                    style: {
                        background: '#4CAF50',
                        color: '#fff',
                    },
                }
            );
        } else if (!sessionId) {
            // If no session_id, redirect to home
            navigate('/');
        }
    }, [navigate, sessionId, isLoaded]);

    const handleLogout = async () => {
        try {
            await Axios({
                ...SummaryApi.logoutTable,
            });
            toast.success('Đã đăng xuất');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                when: 'beforeChildren',
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5 },
        },
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <motion.div
                className="max-w-2xl mx-auto rounded-xl shadow-lg overflow-hidden bg-white"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 py-8 px-6 text-center">
                    <motion.div
                        className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4"
                        variants={itemVariants}
                    >
                        <FiCheckCircle className="text-green-600 text-5xl" />
                    </motion.div>
                    <motion.h1
                        className="text-3xl font-bold text-white mb-2"
                        variants={itemVariants}
                    >
                        Thanh Toán Thành Công!
                    </motion.h1>
                    <motion.p
                        className="text-green-100 text-lg"
                        variants={itemVariants}
                    >
                        Cảm ơn bạn đã thanh toán
                    </motion.p>
                </div>

                {/* Content */}
                <motion.div
                    className="p-6 md:p-8 space-y-6"
                    variants={itemVariants}
                >
                    <div className="bg-green-50 rounded-lg border-l-4 border-green-500 p-4">
                        <p className="text-gray-700">
                            Đơn hàng của bạn đã được thanh toán thành công và
                            đang được xử lý. Món ăn sẽ được phục vụ trong thời
                            gian sớm nhất.
                        </p>
                    </div>

                    {sessionId && (
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">
                                Mã giao dịch:
                            </p>
                            <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                                {sessionId}
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4 rounded">
                        <p className="text-sm text-yellow-800">
                            <strong>Lưu ý:</strong> Phiên đăng nhập của bạn đã
                            hết hạn sau khi thanh toán. Vui lòng quét lại mã QR
                            tại bàn nếu muốn tiếp tục đặt món.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 p-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                            onClick={() => navigate('/table-login')}
                        >
                            <FiArrowLeft className="text-xl" />
                            <span>Quét QR để đặt món tiếp</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 p-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                            onClick={() => navigate('/')}
                        >
                            <FiLogOut className="text-xl" />
                            <span>Về trang chủ</span>
                        </motion.button>
                    </div>

                    {/* Support Info */}
                    <div className="pt-6 border-t border-gray-200 mt-8">
                        <h3 className="text-lg font-medium mb-2 text-orange-600">
                            Cần hỗ trợ?
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                            <p>
                                Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ
                                với nhân viên phục vụ hoặc quầy lễ tân.
                            </p>
                            <p>Hotline: 1900 12345</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default TablePaymentSuccessPage;
