import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import {
    Menu,
    Briefcase,
    Tag,
    HelpCircle,
    FileText,
    Info,
    MessageSquare,
} from 'lucide-react';
import logo from '../assets/logo.png';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaCartPlus } from 'react-icons/fa6';
import {
    FaBoxOpen,
    FaCaretDown,
    FaCaretUp,
    FaHome,
    FaSearch,
    FaCalendarAlt,
    FaUtensils,
} from 'react-icons/fa';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import UserMenu from './UserMenu';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { useGlobalContext } from '../provider/GlobalProvider';
import DisplayCartItem from './DisplayCartItem';
import defaultAvatar from '../assets/defaultAvatar.png';
import Search from './Search';
import { valideURLConvert } from '@/utils/valideURLConvert';
import { ThemeToggle } from './theme-toggle';
import { useSupportChat } from '../contexts/SupportChatContext';
import NotificationBell from './NotificationBell';

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const user = useSelector((state) => state?.user);
    const { unreadCount } = useSupportChat();
    const categoryData =
        useSelector((state) => state.product.allCategory) || [];
    const firstCategory = categoryData.length > 0 ? categoryData[0] : null;

    const links = [
        {
            href: firstCategory
                ? `/${valideURLConvert(firstCategory.name)}-${
                      firstCategory._id
                  }`
                : '/products',
            icon: <FaBoxOpen size={14} className="" />,
            label: 'Thực đơn',
        },
        {
            href: '/booking',
            icon: <FaCalendarAlt size={14} className="" />,
            label: 'Đặt bàn',
        },
        {
            href: '/booking-with-preorder',
            icon: <FaUtensils size={14} className="" />,
            label: 'Đặt bàn & Món',
        },
    ];

    const navigate = useNavigate();
    const [openUserMenu, setOpenUserMenu] = useState(false);
    const menuRef = useRef(null);
    const cartItem = useSelector((state) => state.cartItem.cart);
    const { totalPrice, totalQty } = useGlobalContext();
    const [openCartSection, setOpenCartSection] = useState(false);

    // Handle clicks outside the menu
    useEffect(() => {
        const handleClick = (event) => {
            if (!menuRef.current) return;
            const isClickInside = menuRef.current.contains(event.target);
            const isToggleButton = event.target.closest(
                'button[aria-haspopup="true"]'
            );
            if (!isClickInside && !isToggleButton) {
                setOpenUserMenu(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setOpenUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClick, true);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Chỉ mở menu nếu đang đóng, đóng menu nếu đang mở
    const toggleUserMenu = useCallback((e) => {
        e.stopPropagation();
        setOpenUserMenu((prev) => (prev ? false : true)); // Chỉ mở nếu đang đóng, đóng nếu đang mở
    }, []);

    // Hàm đóng menu
    const closeMenu = useCallback(() => {
        setOpenUserMenu(false);
    }, []);

    const closeMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    const redirectToLoginPage = () => {
        navigate('/login');
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <header className="sticky top-0 z-50 p-4 text-foreground font-semibold">
                <div className="container mx-auto">
                    <div className="flex h-16 items-center justify-between px-6 liquid-glass-header rounded-full">
                        {/* Brand Logo */}
                        <Link
                            to="/"
                            onClick={scrollToTop}
                            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                        >
                            <img
                                src={logo}
                                alt="RestoHub logo"
                                width={26}
                                height={26}
                                className="h-6 w-6 object-contain"
                            />
                            <span className="font-bold text-lg tracking-wide text-foreground">
                                RestoHub
                            </span>
                        </Link>
                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            <nav className="flex items-center gap-6 text-sm">
                                {links.map((l) => {
                                    const isBookingLink =
                                        l.href === '/booking' ||
                                        l.href === '/booking-with-preorder';
                                    const handleClick = (e) => {
                                        if (isBookingLink && !user?._id) {
                                            e.preventDefault();
                                            redirectToLoginPage();
                                        } else {
                                            scrollToTop();
                                        }
                                    };

                                    return (
                                        <Link
                                            key={l.href}
                                            to={l.href}
                                            onClick={handleClick}
                                            className="text-foreground/80 hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                                        >
                                            {l.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                        {/* User */}
                        <div className="hidden md:flex items-center gap-3">
                            <ThemeToggle />

                            <div className="flex items-center justify-end gap-3">
                                {user?._id ? (
                                    <div className="flex items-center gap-3">
                                        {user.role === 'MANAGER' && (
                                            <Link
                                                to="/dashboard/support-chat"
                                                className="relative p-2 rounded-full hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                                                title="Hỗ trợ khách hàng"
                                            >
                                                <MessageSquare className="h-5 w-5" />
                                                {unreadCount > 0 && (
                                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground border-2 border-background">
                                                        {unreadCount > 9
                                                            ? '9+'
                                                            : unreadCount}
                                                    </span>
                                                )}
                                            </Link>
                                        )}
                                        <NotificationBell />
                                        <div className="relative" ref={menuRef}>
                                            <div className="relative">
                                                <button
                                                    onClick={toggleUserMenu}
                                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:bg-muted/50 border border-transparent hover:border-border/60 transition-colors"
                                                    aria-expanded={openUserMenu}
                                                    aria-haspopup="true"
                                                    aria-label="User menu"
                                                    type="button"
                                                >
                                                    <div className="relative p-0.5 overflow-hidden rounded-full liquid-glass-2 border border-border/60">
                                                        <img
                                                            src={
                                                                user.avatar ||
                                                                defaultAvatar
                                                            }
                                                            alt={user.name}
                                                            className="w-7 h-7 rounded-full object-cover"
                                                            width={28}
                                                            height={28}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <span
                                                            title={user.name}
                                                            className="text-sm font-medium text-foreground truncate max-w-16 lg:max-w-24"
                                                        >
                                                            {user.name}
                                                        </span>
                                                        {user.role ===
                                                            'MANAGER' && (
                                                            <span className="text-[10px] text-primary font-bold px-1 rounded">
                                                                Quản lý
                                                            </span>
                                                        )}
                                                    </div>
                                                    {openUserMenu ? (
                                                        <FaCaretUp
                                                            className="flex-shrink-0 text-muted-foreground"
                                                            size={13}
                                                        />
                                                    ) : (
                                                        <FaCaretDown
                                                            className="flex-shrink-0 text-muted-foreground"
                                                            size={13}
                                                        />
                                                    )}
                                                </button>
                                            </div>
                                            <AnimatePresence>
                                                {openUserMenu && (
                                                    <motion.div
                                                        className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)]"
                                                        initial={{
                                                            opacity: 0,
                                                            y: -10,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            y: -10,
                                                        }}
                                                        transition={{
                                                            duration: 0.15,
                                                            ease: 'easeOut',
                                                        }}
                                                    >
                                                        <UserMenu
                                                            close={closeMenu}
                                                            menuTriggerRef={
                                                                menuRef
                                                            }
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={redirectToLoginPage}
                                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-2 py-1"
                                    >
                                        Đăng nhập
                                    </button>
                                )}
                                {user.role !== 'MANAGER' && (
                                    <button
                                        onClick={
                                            user?._id
                                                ? () => setOpenCartSection(true)
                                                : redirectToLoginPage
                                        }
                                        className="h-10 flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium rounded-full px-4 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all"
                                    >
                                        <FaCartPlus size={16} />
                                        <div className="font-bold text-xs sm:text-sm">
                                            {cartItem[0] ? (
                                                <div className="flex items-center gap-1.5">
                                                    <span>{totalQty}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {DisplayPriceInVND(
                                                            totalPrice
                                                        )}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>Giỏ hàng</span>
                                            )}
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Mobile Nav */}
                        <div className="md:hidden">
                            <Sheet
                                open={isMobileMenuOpen}
                                onOpenChange={setIsMobileMenuOpen}
                            >
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="border-border bg-card/80 hover:bg-muted text-foreground rounded-full"
                                    >
                                        <Menu className="h-5 w-5" />
                                        <span className="sr-only">
                                            Open menu
                                        </span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    className="liquid-glass border-border p-0 w-72 flex flex-col"
                                >
                                    <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
                                        <Link
                                            to="/"
                                            onClick={scrollToTop}
                                            className="flex items-center gap-2"
                                        >
                                            <img
                                                src={logo}
                                                alt="RestoHub logo"
                                                width={24}
                                                height={24}
                                                className="h-6 w-6"
                                            />
                                            <span className="font-bold tracking-wide text-foreground">
                                                RestoHub
                                            </span>
                                        </Link>
                                    </div>
                                    <div className="px-3 pt-3">
                                        <Search />
                                    </div>
                                    <nav className="flex flex-col gap-1 mt-3 px-2 text-foreground">
                                        {links.map((l) => {
                                            const isBookingLink =
                                                l.href === '/booking' ||
                                                l.href ===
                                                    '/booking-with-preorder';
                                            const handleClick = () => {
                                                if (
                                                    isBookingLink &&
                                                    !user?._id
                                                ) {
                                                    redirectToLoginPage();
                                                    closeMobileMenu();
                                                } else {
                                                    closeMenu();
                                                    closeMobileMenu();
                                                    scrollToTop();
                                                }
                                            };

                                            return (
                                                <Link
                                                    key={l.href}
                                                    to={
                                                        isBookingLink &&
                                                        !user?._id
                                                            ? '#'
                                                            : l.href
                                                    }
                                                    onClick={handleClick}
                                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-accent hover:text-primary transition-colors text-sm font-medium"
                                                >
                                                    <span className="inline-flex items-center justify-center w-5 h-5 text-muted-foreground">
                                                        {l.icon}
                                                    </span>
                                                    <span>
                                                        {l.label}
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </nav>
                                    <div className="mt-auto border-t border-border/60 p-4">
                                        <div className="flex items-center justify-center w-full gap-5">
                                            {user?._id ? (
                                                <div
                                                    className="relative w-full"
                                                    ref={menuRef}
                                                >
                                                    <div className="relative">
                                                        <button
                                                            onClick={
                                                                toggleUserMenu
                                                            }
                                                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-accent transition-colors"
                                                            aria-expanded={
                                                                openUserMenu
                                                            }
                                                            aria-haspopup="true"
                                                            aria-label="User menu"
                                                            type="button"
                                                        >
                                                            <div className="relative p-0.5 overflow-hidden rounded-full liquid-glass">
                                                                <img
                                                                    src={
                                                                        user.avatar ||
                                                                        defaultAvatar
                                                                    }
                                                                    alt={
                                                                        user.name
                                                                    }
                                                                    className="w-8 h-8 rounded-full object-cover"
                                                                    width={32}
                                                                    height={32}
                                                                />
                                                            </div>
                                                            <div className="flex flex-col items-start flex-1 min-w-0">
                                                                <span
                                                                    title={
                                                                        user.name
                                                                    }
                                                                    className="text-sm font-medium text-foreground truncate"
                                                                >
                                                                    {user.name}
                                                                </span>
                                                                {user.role ===
                                                                    'MANAGER' && (
                                                                    <span className="text-[10px] text-primary font-bold">
                                                                        Quản lý
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {openUserMenu ? (
                                                                <FaCaretDown
                                                                    className="flex-shrink-0 ml-2"
                                                                    size={15}
                                                                />
                                                            ) : (
                                                                <FaCaretUp
                                                                    className="flex-shrink-0 ml-2"
                                                                    size={15}
                                                                />
                                                            )}
                                                        </button>
                                                    </div>
                                                    <AnimatePresence>
                                                        {openUserMenu && (
                                                            <motion.div
                                                                className="absolute right-0 bottom-full mb-2 z-50 w-72 max-w-[calc(100vw-2rem)]"
                                                                initial={{
                                                                    opacity: 0,
                                                                    y: 10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    y: -10,
                                                                }}
                                                                transition={{
                                                                    duration: 0.15,
                                                                    ease: 'easeOut',
                                                                }}
                                                            >
                                                                <UserMenu
                                                                    close={() => {
                                                                        closeMenu();
                                                                        closeMobileMenu();
                                                                    }}
                                                                    menuTriggerRef={
                                                                        menuRef
                                                                    }
                                                                />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        redirectToLoginPage();
                                                        closeMenu();
                                                        closeMobileMenu();
                                                        scrollToTop();
                                                    }}
                                                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium rounded-xl px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
                                                >
                                                    Đăng nhập
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </div>
            </header>
            <div className="hidden md:block">
                <Search />
            </div>
            {openCartSection && (
                <DisplayCartItem close={() => setOpenCartSection(false)} />
            )}
        </>
    );
}
