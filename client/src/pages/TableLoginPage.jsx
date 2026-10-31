import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '../store/userSlice';

const TableLoginPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loginWithQR = async () => {
            const token = searchParams.get('token');

            if (!token) {
                setError('Không tìm thấy mã QR. Vui lòng quét lại.');
                setLoading(false);
                return;
            }

            try {
                const response = await Axios({
                    ...SummaryApi.tableLogin,
                    data: { token },
                });

                if (response.data.success) {
                    // Save tokens
                    localStorage.setItem(
                        'accessToken',
                        response.data.data.accessToken
                    );
                    localStorage.setItem(
                        'refreshToken',
                        response.data.data.refreshToken
                    );

                    // Save user details to Redux
                    dispatch(setUserDetails(response.data.data.user));

                    toast.success(
                        `Chào mừng đến ${response.data.data.user.name}!`
                    );

                    // Redirect to table menu
                    navigate('/table-menu');
                } else {
                    setError(response.data.message || 'Đăng nhập thất bại');
                }
            } catch (err) {
                console.error('QR Login Error:', err);
                setError(
                    err.response?.data?.message ||
                        'Đăng nhập thất bại. Vui lòng thử lại.'
                );
            } finally {
                setLoading(false);
            }
        };

        loginWithQR();
    }, [searchParams, navigate, dispatch]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Đang đăng nhập...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-10 h-10 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Đăng nhập thất bại
                    </h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        Về trang chủ
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default TableLoginPage;
