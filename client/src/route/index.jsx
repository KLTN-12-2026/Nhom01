import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Home from '../pages/Home';
import SearchPage from '../pages/SearchPage';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RegistrationSuccess from '../pages/RegistrationSuccess';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import OtpVerification from '../pages/OtpVerification';
import ResetPassword from '../pages/ResetPassword';
import UserMenuMobile from '../pages/UserMenuMobile';
import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import CategoryPage from './../pages/CategoryPage';
import AdminPermission from '../layouts/AdminPermission';
import ManagerPermission from '../layouts/ManagerPermission';
import TableOrdersPermission from '../layouts/TableOrdersPermission';
import ProductListPage from '../pages/ProductListPage';
import ProductDisplayPage from '../pages/ProductDisplayPage';
import CheckoutPage from './../pages/CheckoutPage';
import Success from './../pages/Success';
import Cancel from './../pages/Cancel';
import SepayPaymentPage from './../pages/SepayPaymentPage';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import CartPage from '../pages/CartPage';
import BillPage from './../pages/BillPage';
import ReportPage from './../pages/ReportPage';
import VoucherPage from '../pages/VoucherPage';
import AdminDashboard from '@/layouts/AdminDashboard';
import SubCategoryPage from '@/pages/SubCategoryPage';
import ProductManagementPage from '../pages/ProductManagementPage';
import TableManagementPage from '../pages/TableManagementPage';
import TableOrdersPage from '../pages/TableOrdersPage';
import BookingManagementPage from '../pages/BookingManagementPage';
import BookingPage from '../pages/BookingPage';
import BookingWithPreOrderPage from '../pages/BookingWithPreOrderPage';
import BookingSuccessPage from '../pages/BookingSuccessPage';
import EmployeeManagementPage from '../pages/EmployeeManagementPage';
import EmployeeDashboard from '../pages/EmployeeDashboard';
import ShiftManagementPage from '../pages/ShiftManagementPage';
import AttendanceManagementPage from '../pages/AttendanceManagementPage';
import MyShiftsPage from '../pages/MyShiftsPage';
import MyPerformancePage from '../pages/MyPerformancePage';
import TableLoginPage from '../pages/TableLoginPage';
import TableMenuPage from '../pages/TableMenuPage';
import TableOrderManagementPage from '../pages/TableOrderManagementPage';
import TablePaymentSuccessPage from '../pages/TablePaymentSuccessPage';
import SupportChatAdmin from '@/pages/SupportChatAdmin';
import KitchenPage from '../pages/KitchenPage';
import NotificationsPage from '../pages/NotificationsPage';
import NotificationManagementPage from '../pages/NotificationManagementPage';
import ReviewManagementPage from '../pages/ReviewManagementPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                path: '',
                element: <Home />,
            },
            {
                path: 'search',
                element: <SearchPage />,
            },
            {
                path: 'booking',
                element: (
                    <ProtectedRoute>
                        <BookingPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'booking-with-preorder',
                element: (
                    <ProtectedRoute>
                        <BookingWithPreOrderPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'booking/success',
                element: <BookingSuccessPage />,
            },
            {
                path: 'table-login',
                element: <TableLoginPage />,
            },
            {
                path: 'table-menu',
                element: (
                    <ProtectedRoute>
                        <TableMenuPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'table-order-management',
                element: (
                    <ProtectedRoute>
                        <TableOrderManagementPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'table-payment-success',
                element: (
                    <ProtectedRoute>
                        <TablePaymentSuccessPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'login',
                element: (
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                ),
            },
            {
                path: 'register',
                element: (
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                ),
            },
            {
                path: 'registration-success',
                element: (
                    <PublicRoute>
                        <RegistrationSuccess />
                    </PublicRoute>
                ),
            },
            {
                path: 'verify-email',
                element: (
                    <PublicRoute>
                        <VerifyEmail />
                    </PublicRoute>
                ),
            },
            {
                path: 'forgot-password',
                element: (
                    <PublicRoute>
                        <ForgotPassword />
                    </PublicRoute>
                ),
            },
            {
                path: 'verification-otp',
                element: (
                    <PublicRoute>
                        <OtpVerification />
                    </PublicRoute>
                ),
            },
            {
                path: 'reset-password',
                element: <ResetPassword />,
            },
            {
                path: 'user',
                element: <UserMenuMobile />,
            },
            {
                path: 'dashboard',
                element: (
                    <ProtectedRoute>
                        <AdminDashboard />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        path: 'profile',
                        element: <Profile />,
                    },
                    {
                        path: 'category',
                        element: (
                            <AdminPermission>
                                <CategoryPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'sub-category',
                        element: (
                            <AdminPermission>
                                <SubCategoryPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'product',
                        element: (
                            <AdminPermission>
                                <ProductManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'table',
                        element: (
                            <AdminPermission>
                                <TableManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'table-orders',
                        element: (
                            <TableOrdersPermission>
                                <TableOrdersPage />
                            </TableOrdersPermission>
                        ),
                    },
                    {
                        path: 'booking',
                        element: (
                            <AdminPermission>
                                <BookingManagementPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'bill',
                        element: (
                            <AdminPermission>
                                <BillPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'report',
                        element: (
                            <AdminPermission>
                                <ReportPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'voucher',
                        element: (
                            <AdminPermission>
                                <VoucherPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'support-chat',
                        element: (
                            <AdminPermission>
                                <SupportChatAdmin />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'my-orders',
                        element: <MyOrders />,
                    },
                    {
                        path: 'employee-management',
                        element: (
                            <ManagerPermission>
                                <EmployeeManagementPage />
                            </ManagerPermission>
                        ),
                    },
                    {
                        path: 'employee-dashboard',
                        element: (
                            <AdminPermission>
                                <EmployeeDashboard />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'shift-management',
                        element: (
                            <ManagerPermission>
                                <ShiftManagementPage />
                            </ManagerPermission>
                        ),
                    },
                    {
                        path: 'attendance-management',
                        element: (
                            <ManagerPermission>
                                <AttendanceManagementPage />
                            </ManagerPermission>
                        ),
                    },
                    {
                        path: 'my-shifts',
                        element: (
                            <AdminPermission>
                                <MyShiftsPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'my-performance',
                        element: (
                            <AdminPermission>
                                <MyPerformancePage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'kitchen',
                        element: (
                            <AdminPermission>
                                <KitchenPage />
                            </AdminPermission>
                        ),
                    },
                    {
                        path: 'notifications',
                        element: <NotificationsPage />,
                    },
                    {
                        path: 'notification-management',
                        element: (
                            <ManagerPermission>
                                <NotificationManagementPage />
                            </ManagerPermission>
                        ),
                    },
                    {
                        path: 'review-management',
                        element: (
                            <ManagerPermission>
                                <ReviewManagementPage />
                            </ManagerPermission>
                        ),
                    },
                ],
            },
            {
                path: 'cart',
                element: <CartPage />,
            },
            {
                path: 'checkout',
                element: (
                    <ProtectedRoute>
                        <CheckoutPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'success',
                element: (
                    <ProtectedRoute>
                        <Success />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'cancel',
                element: (
                    <ProtectedRoute>
                        <Cancel />
                    </ProtectedRoute>
                ),
            },
            {
                path: 'payment/sepay',
                element: (
                    <ProtectedRoute>
                        <SepayPaymentPage />
                    </ProtectedRoute>
                ),
            },
            {
                path: ':category',
                element: <ProductListPage />,
            },
            {
                path: ':category/:subCategory',
                element: <ProductListPage />,
            },
            {
                path: 'product/:product',
                element: <ProductDisplayPage />,
            },
        ],
    },
]);

export default router;
