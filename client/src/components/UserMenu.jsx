import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Divider from './Divider';
import Axios, { setIsLoggingOut } from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { logout, updateUserPoints } from '../store/userSlice';
import { clearCart } from '../store/cartProduct';
import { toast } from 'react-hot-toast';
import AxiosToastError from './../utils/AxiosToastError';
import { BiLinkExternal, BiRefresh } from 'react-icons/bi';
import { ChevronDown } from 'lucide-react';
// import isAdmin from '../utils/isAdmin';
import GradientText from './GradientText';
import isAdmin from '@/utils/isAdmin';
import { RiExternalLinkFill } from 'react-icons/ri';
import defaultAvatar from '@/assets/defaultAvatar.png';

const UserMenu = ({ close }) => {
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef();
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);

    // State for collapsible menu sections
    const [expandedSections, setExpandedSections] = useState({
        products: false,
        restaurant: false,
        hr: false,
        reports: false,
        employee: false,
        personal: false,
    });

    // Function to fetch user points
    const fetchUserPoints = useCallback(async () => {
        try {
            setIsLoadingPoints(true);
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await Axios.get(SummaryApi.user_points.url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.data.success && response.data.data) {
                dispatch(updateUserPoints(response.data.data.points || 0));
            }
        } catch (error) {
            console.error('Error fetching user points:', error);
        } finally {
            setIsLoadingPoints(false);
        }
    }, [dispatch]);

    // Fetch points when menu opens
    useEffect(() => {
        const fetchData = async () => {
            if (user?._id) {
                await fetchUserPoints();
            }
        };

        fetchData();
    }, [user?._id, fetchUserPoints]);

    // Auto-expand section based on current route (accordion behavior)
    useEffect(() => {
        const path = location.pathname;

        // Reset all sections first
        const newSections = {
            products: false,
            restaurant: false,
            hr: false,
            reports: false,
            employee: false,
            personal: false,
        };

        // Then open only the relevant section
        if (
            path.includes('/category') ||
            path.includes('/sub-category') ||
            path.includes('/product')
        ) {
            newSections.products = true;
        } else if (
            path.includes('/table') ||
            path.includes('/booking') ||
            path.includes('/bill') ||
            path.includes('/report')
        ) {
            newSections.restaurant = true;
        } else if (
            path.includes('/employee-management') ||
            path.includes('/shift-management') ||
            path.includes('/attendance-management')
        ) {
            newSections.hr = true;
        } else if (path.includes('/voucher')) {
            newSections.reports = true;
        } else if (
            path.includes('/employee-dashboard') ||
            path.includes('/my-shifts') ||
            path.includes('/my-performance')
        ) {
            newSections.employee = true;
        } else if (path.includes('/my-orders')) {
            newSections.personal = true;
        }

        setExpandedSections(newSections);
    }, [location.pathname]);

    // Function to check if a path is active
    const isActive = (path) => {
        // Exact match for root path
        if (path === '/dashboard' && location.pathname === '/dashboard')
            return true;
        // Exact match
        if (location.pathname === path) return true;
        // Check if current path starts with the given path followed by a slash (for nested routes)
        // This prevents /dashboard/table from matching /dashboard/table-orders
        return (
            location.pathname.startsWith(path + '/') && path !== '/dashboard'
        );
    };

    const handleLogout = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.logout,
            });

            if (response.data.success) {
                if (close) {
                    close();
                }
                // Clear Redux state immediately
                dispatch(logout());
                dispatch(clearCart());
                setIsLoggingOut(true);

                // Clear localStorage
                localStorage.removeItem('accesstoken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('checkoutSelectedItems');

                toast.success(response.data.message);
                navigate('/');
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const handleClose = () => {
        if (close) {
            close();
        }
    };

    // Toggle section expand/collapse
    const toggleSection = (section) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    // MenuSection Component for collapsible groups
    const MenuSection = ({
        title,
        icon,
        sectionKey,
        children,
        show = true,
    }) => {
        if (!show) return null;

        const isExpanded = expandedSections[sectionKey];

        return (
            <div className="mb-0.5">
                <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-3 py-2.5 
                               hover:bg-accent/80 hover:text-accent-foreground transition-colors rounded-xl text-foreground"
                >
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">{icon}</span>
                        <span className="font-semibold text-sm">{title}</span>
                    </div>
                    <ChevronDown
                        className={`transition-transform duration-200 text-muted-foreground ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                        size={16}
                    />
                </button>
                {isExpanded && (
                    <div className="ml-4 pl-2.5 border-l-2 border-border/70 my-1 space-y-0.5">{children}</div>
                )}
            </div>
        );
    };

    // MenuLink Component to reduce repetition and ensure consistent styling
    const MenuLink = ({ to, label }) => {
        const active = isActive(to);
        return (
            <Link
                onClick={handleClose}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ease-out cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                    active
                        ? 'bg-active text-foreground font-semibold shadow-xs'
                        : 'text-foreground/80 hover:text-foreground'
                }`}
            >
                <span className="font-medium text-sm">
                    {label}
                </span>
            </Link>
        );
    };

    return (
        <div
            ref={menuRef}
            className="liquid-glass-menu bg-popover/98 dark:bg-[#1a1613]/98 backdrop-blur-xl border border-border/80 text-foreground rounded-2xl shadow-2xl overflow-hidden w-full max-h-[82vh] flex flex-col"
        >
            <div className="p-4 py-3 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        to={'/dashboard/profile'}
                        className="relative w-14 hover:opacity-85"
                    >
                        <img
                            src={user?.avatar || defaultAvatar}
                            alt={user?.name}
                            className="w-14 h-14 p-0.5 rounded-full object-cover border-2 border-red-600"
                        />
                        {user.role === 'MANAGER' && (
                            <span
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-600 text-white text-[10px] font-bold
                                        px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs"
                            >
                                Quản lý
                            </span>
                        )}
                    </Link>
                    <div className="min-w-0 flex-1 text-foreground">
                        <Link
                            to={'/dashboard/profile'}
                            className="flex items-center gap-1 text-sm font-bold truncate
                                    hover:opacity-80"
                            title="Tài khoản"
                        >
                            <span className="truncate">{user?.name}</span>
                            <RiExternalLinkFill className="shrink-0 text-muted-foreground" size={14} />
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <GradientText
                        colors={[
                            '#FFD700',
                            '#FFB300',
                            '#FF8C00',
                            '#FF4500',
                            '#B22222',
                        ]}
                        animationSpeed={3}
                        showBorder={false}
                        className="custom-class"
                    >
                        <span className="text-xs">Điểm tích lũy:</span>
                        {isLoadingPoints ? (
                            <BiRefresh className="animate-spin inline-block ml-1" />
                        ) : (
                            <span className="text-xs font-bold px-1.5">
                                {user?.rewardsPoint?.toLocaleString() || 0}
                            </span>
                        )}
                    </GradientText>
                    <button
                        onClick={fetchUserPoints}
                        disabled={isLoadingPoints}
                        className="text-orange-600 hover:text-orange-400 disabled:opacity-50 p-1 rounded-md"
                        title="Làm mới điểm"
                    >
                        <BiRefresh
                            className={`${
                                isLoadingPoints ? 'animate-spin' : ''
                            }`}
                            size={16}
                        />
                    </button>
                </div>
            </div>
            <Divider />
            <div className="lg:text-sm text-xs flex flex-col gap-0.5 font-semibold overflow-y-auto custom-scrollbar p-2 flex-1">
                {/* MANAGER - Products Section */}
                <MenuSection
                    title="Quản lý Thực đơn"
                    icon="📦"
                    sectionKey="products"
                    show={user.role === 'MANAGER'}
                >
                    <MenuLink to="/dashboard/category" label="Quản lý Danh mục" />
                    <MenuLink to="/dashboard/sub-category" label="Quản lý Loại sản phẩm" />
                    <MenuLink to="/dashboard/product" label="Quản lý Món ăn" />
                </MenuSection>
                {/* Restaurant Section - MANAGER, WAITER, CASHIER, CHEF */}
                <MenuSection
                    title={
                        ['WAITER', 'CASHIER'].includes(user.role)
                            ? 'Công việc Phục vụ & Thu ngân'
                            : user.role === 'CHEF'
                            ? 'Khu vực Bếp'
                            : 'Quản lý Nhà hàng & Bếp'
                    }
                    icon="🍽️"
                    sectionKey="restaurant"
                    show={['MANAGER', 'WAITER', 'CASHIER', 'CHEF'].includes(
                        user.role
                    )}
                >
                    {user.role === 'MANAGER' && (
                        <MenuLink to="/dashboard/table" label="Quản lý Bàn ăn" />
                    )}
                    {['MANAGER', 'WAITER', 'CASHIER'].includes(user.role) && (
                        <MenuLink to="/dashboard/table-orders" label="Đơn gọi món (POS)" />
                    )}
                    {['MANAGER', 'CHEF'].includes(user.role) && (
                        <MenuLink to="/dashboard/kitchen" label="Màn hình Bếp (KDS)" />
                    )}
                    {['MANAGER', 'WAITER', 'CASHIER'].includes(user.role) && (
                        <MenuLink to="/dashboard/booking" label="Danh sách Đặt bàn" />
                    )}
                    {['MANAGER', 'WAITER', 'CASHIER'].includes(
                        user.role
                    ) && (
                        <MenuLink
                            to="/dashboard/bill"
                            label="Hóa đơn & Thanh toán"
                        />
                    )}
                    {user.role === 'MANAGER' && (
                        <MenuLink to="/dashboard/review-management" label="Đánh giá từ khách hàng" />
                    )}
                    {user.role === 'MANAGER' && (
                        <MenuLink to="/dashboard/report" label="Báo cáo Thống kê" />
                    )}
                </MenuSection>
                {/* HR Section - MANAGER */}
                <MenuSection
                    title="Quản lý Nhân sự"
                    icon="👥"
                    sectionKey="hr"
                    show={user.role === 'MANAGER'}
                >
                    <MenuLink to="/dashboard/employee-management" label="Quản lý Nhân viên" />
                    <MenuLink to="/dashboard/shift-management" label="Quản lý Ca làm" />
                    <MenuLink to="/dashboard/attendance-management" label="Quản lý Chấm công" />
                    <MenuLink to="/dashboard/notification-management" label="Gửi thông báo nhân viên" />
                </MenuSection>
                {/* Reports & Voucher Section - MANAGER */}
                <MenuSection
                    title="Khuyến mãi & CSKH"
                    icon="📈"
                    sectionKey="reports"
                    show={user.role === 'MANAGER'}
                >
                    <MenuLink to="/dashboard/voucher" label="Quản lý Mã giảm giá" />
                </MenuSection>
                {/* Employee Section - MANAGER, WAITER, CHEF, CASHIER */}
                <MenuSection
                    title="Khu vực Nhân viên"
                    icon="💼"
                    sectionKey="employee"
                    show={['MANAGER', 'WAITER', 'CHEF', 'CASHIER'].includes(
                        user.role
                    )}
                >
                    <MenuLink to="/dashboard/employee-dashboard" label="Dashboard Nhân viên" />
                    <MenuLink to="/dashboard/my-shifts" label="Ca làm của tôi" />
                    <MenuLink to="/dashboard/notifications" label="Thông báo" />
                    <MenuLink to="/dashboard/my-performance" label="Hiệu suất của tôi" />
                </MenuSection>
                {/* Personal Section - USER only */}
                <MenuSection
                    title="Cá nhân"
                    icon="⚙️"
                    sectionKey="personal"
                    show={user.role === 'USER'}
                >
                    <MenuLink to="/dashboard/profile" label="Tài khoản cá nhân" />
                    <MenuLink to="/dashboard/my-orders" label="Lịch sử mua hàng" />
                    <MenuLink to="/dashboard/notifications" label="Hộp thông báo" />
                </MenuSection>
            </div>
            <Divider />
            <div className="p-2 shrink-0">
                <button
                    onClick={handleLogout}
                    className="text-destructive w-full text-sm text-center font-bold px-4 py-2.5 rounded-xl border border-destructive/20 transition-all duration-200 ease-out cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:scale-[1.01] active:scale-[0.98]"
                >
                    Đăng xuất
                </button>
            </div>
        </div>
    );
};

export default UserMenu;
