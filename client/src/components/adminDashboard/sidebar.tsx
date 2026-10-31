'use client';
import { useState, useEffect } from 'react';
import {
    BarChart2,
    Package,
    Layers,
    TicketPercent,
    Settings,
    HelpCircle,
    Menu,
    PanelLeftClose,
    LocateIcon,
    Clock,
    FileText,
    MessageSquare,
    ChevronDown,
    Users,
    Calendar,
    Utensils,
    CheckSquare,
    LayoutDashboard,
    TrendingUp,
    Bell,
    ChefHat,
    Star,
    Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import { Link, useLocation } from 'react-router-dom';
import logo from '@/assets/logo.png';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useSupportChat } from '@/contexts/SupportChatContext';
// TypeScript types for navigation
interface NavigationItem {
    name: string;
    href: string;
    icon: any;
    roles?: string[];
}
interface NavigationSection {
    key: string;
    title: string;
    icon: string;
    roles: string[];
    items: NavigationItem[];
}
// Grouped navigation sections
const navigationSections: NavigationSection[] = [
    {
        key: 'products',
        title: 'Quản lý Thực đơn',
        icon: '📦',
        roles: ['MANAGER'],
        items: [
            { name: 'Danh mục', href: '/dashboard/category', icon: Layers },
            {
                name: 'Loại sản phẩm',
                href: '/dashboard/sub-category',
                icon: Layers,
            },
            { name: 'Sản phẩm', href: '/dashboard/product', icon: Package },
        ],
    },
    {
        key: 'restaurant',
        title: 'Quản lý Nhà hàng & Bếp',
        icon: '🍽️',
        roles: ['MANAGER', 'WAITER', 'CASHIER', 'CHEF'],
        items: [
            {
                name: 'Bàn ăn',
                href: '/dashboard/table',
                icon: Utensils,
                roles: ['MANAGER'],
            },
            {
                name: 'Đơn gọi món (POS)',
                href: '/dashboard/table-orders',
                icon: FileText,
                roles: ['MANAGER', 'WAITER', 'CASHIER'],
            },
            {
                name: 'Màn hình Bếp (KDS)',
                href: '/dashboard/kitchen',
                icon: ChefHat,
                roles: ['MANAGER', 'CHEF'],
            },
            {
                name: 'Đặt bàn',
                href: '/dashboard/booking',
                icon: Calendar,
                roles: ['MANAGER', 'WAITER', 'CASHIER'],
            },
            {
                name: 'Hóa đơn',
                href: '/dashboard/bill',
                icon: FileText,
                roles: ['MANAGER', 'WAITER', 'CASHIER'],
            },
            {
                name: 'Đánh giá món ăn',
                href: '/dashboard/review-management',
                icon: Star,
                roles: ['MANAGER'],
            },
            {
                name: 'Báo cáo',
                href: '/dashboard/report',
                icon: BarChart2,
                roles: ['MANAGER'],
            },
        ],
    },
    {
        key: 'hr',
        title: 'Quản lý Nhân sự',
        icon: '👥',
        roles: ['MANAGER'],
        items: [
            {
                name: 'Nhân viên',
                href: '/dashboard/employee-management',
                icon: Users,
            },
            {
                name: 'Ca làm',
                href: '/dashboard/shift-management',
                icon: Clock,
            },
            {
                name: 'Chấm công',
                href: '/dashboard/attendance-management',
                icon: CheckSquare,
            },
            {
                name: 'Tạo thông báo',
                href: '/dashboard/notification-management',
                icon: Send,
            },
        ],
    },
    {
        key: 'reports',
        title: 'Khuyến mãi & CSKH',
        icon: '📈',
        roles: ['MANAGER'],
        items: [
            {
                name: 'Mã giảm giá',
                href: '/dashboard/voucher',
                icon: TicketPercent,
            },
        ],
    },
    {
        key: 'employee',
        title: 'Khu vực Nhân viên',
        icon: '💼',
        roles: ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
        items: [
            {
                name: 'Dashboard',
                href: '/dashboard/employee-dashboard',
                icon: LayoutDashboard,
            },
            {
                name: 'Ca làm của tôi',
                href: '/dashboard/my-shifts',
                icon: Clock,
            },
            {
                name: 'Thông báo',
                href: '/dashboard/notifications',
                icon: Bell,
            },
            {
                name: 'Hiệu suất',
                href: '/dashboard/my-performance',
                icon: TrendingUp,
            },
        ],
    },
    {
        key: 'personal',
        title: 'Cá nhân',
        icon: '⚙️',
        roles: ['USER'],
        items: [
            {
                name: 'Lịch sử mua hàng',
                href: '/dashboard/my-orders',
                icon: Clock,
            },
            {
                name: 'Thông báo',
                href: '/dashboard/notifications',
                icon: Bell,
            },
        ],
    },
];
const bottomNavigation = [
    { name: 'Tài khoản', href: '/dashboard/profile', icon: Settings },
    {
        name: 'Hỗ trợ khách hàng',
        href: '/dashboard/support-chat',
        icon: MessageSquare,
        roles: ['MANAGER', 'WAITER', 'CASHIER'],
    },
];

// Helper to determine which section a route belongs to
const findSectionForPath = (path: string): string | null => {
    for (const section of navigationSections) {
        if (
            section.items.some(
                (item) =>
                    path === item.href ||
                    (item.href !== '/dashboard' && path.startsWith(item.href))
            )
        ) {
            return section.key;
        }
    }
    return null;
};

export function Sidebar() {
    const { pathname } = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Helper to find which section matches the current path
    const activeSectionKey = findSectionForPath(pathname);

    // State for collapsible menu sections with sessionStorage preservation
    const [expandedSections, setExpandedSections] = useState<
        Record<string, boolean>
    >(() => {
        const initial: Record<string, boolean> = {
            products: false,
            restaurant: false,
            hr: false,
            reports: false,
            employee: false,
            personal: false,
        };
        try {
            const saved = sessionStorage.getItem('admin_sidebar_expanded');
            if (saved) {
                Object.assign(initial, JSON.parse(saved));
            }
        } catch (_) {}
        if (activeSectionKey) {
            initial[activeSectionKey] = true;
        }
        return initial;
    });

    const user = useSelector((state: RootState) => state.user);
    const { unreadCount } = useSupportChat();

    // When navigating to any route, ensure its parent section is open without collapsing sections the user expanded
    useEffect(() => {
        const activeKey = findSectionForPath(pathname);
        if (activeKey) {
            setExpandedSections((prev) => {
                if (prev[activeKey]) return prev;
                const next = { ...prev, [activeKey]: true };
                try {
                    sessionStorage.setItem('admin_sidebar_expanded', JSON.stringify(next));
                } catch (_) {}
                return next;
            });
        }
    }, [pathname]);

    // Toggle section expand/collapse and save to sessionStorage
    const toggleSection = (sectionKey: string) => {
        setExpandedSections((prev) => {
            const next = {
                ...prev,
                [sectionKey]: !prev[sectionKey],
            };
            try {
                sessionStorage.setItem('admin_sidebar_expanded', JSON.stringify(next));
            } catch (_) {}
            return next;
        });
    };
    // NavItem component for individual links
    const NavItem = ({
        item,
        isBottom = false,
    }: {
        item: NavigationItem;
        isBottom?: boolean;
    }) => (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <Link
                    to={item.href}
                    className={cn(
                        'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        pathname === item.href
                            ? 'bg-muted-foreground/20 text-secondary-foreground'
                            : 'text-muted-foreground hover:bg-muted-foreground/20 hover:text-secondary-foreground',
                        isCollapsed && 'justify-center px-2'
                    )}
                >
                    <item.icon
                        className={cn('h-4 w-4', !isCollapsed && 'mr-3 mb-0.5')}
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                    {item.name === 'Hỗ trợ khách hàng' && unreadCount > 0 && (
                        <span
                            className={cn(
                                'ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white',
                                isCollapsed && 'absolute -top-1 -right-1'
                            )}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
            </TooltipTrigger>
            {isCollapsed && (
                <TooltipContent
                    side="right"
                    className="flex items-center gap-4"
                >
                    {item.name}
                </TooltipContent>
            )}
        </Tooltip>
    );
    // MenuSection component for collapsible groups
    const MenuSection = ({ section }: { section: NavigationSection }) => {
        // Filter items by role
        const visibleItems = section.items.filter(
            (item) => !item.roles || item.roles.includes(user.role)
        );
        if (visibleItems.length === 0) return null;
        const isExpanded = expandedSections[section.key];

        // Format section title and icon depending on role
        const sectionTitle =
            section.key === 'restaurant'
                ? user.role === 'CHEF'
                    ? 'Khu vực Bếp'
                    : ['WAITER', 'CASHIER'].includes(user.role)
                    ? 'Phục vụ & Thu ngân'
                    : section.title
                : section.title;

        const sectionIcon =
            section.key === 'restaurant' && user.role === 'CHEF'
                ? '👨‍🍳'
                : section.icon;

        return (
            <div className="mb-1">
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => toggleSection(section.key)}
                            className={cn(
                                'w-full flex items-center justify-between px-3 py-2 rounded-md',
                                'text-sm font-semibold text-muted-foreground',
                                'hover:bg-muted-foreground/20 hover:text-secondary-foreground',
                                'transition-colors',
                                isCollapsed && 'justify-center px-2'
                            )}
                        >
                            {!isCollapsed && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">
                                            {sectionIcon}
                                        </span>
                                        <span>{sectionTitle}</span>
                                    </div>
                                    <ChevronDown
                                        className={cn(
                                            'h-4 w-4 transition-transform duration-200',
                                            isExpanded && 'rotate-180'
                                        )}
                                    />
                                </>
                            )}
                            {isCollapsed && (
                                <span className="text-base">
                                    {sectionIcon}
                                </span>
                            )}
                        </button>
                    </TooltipTrigger>
                    {isCollapsed && (
                        <TooltipContent side="right">
                            {sectionTitle}
                        </TooltipContent>
                    )}
                </Tooltip>
                {isExpanded && !isCollapsed && (
                    <div className="ml-6 mt-1 space-y-1">
                        {visibleItems.map((item) => (
                            <NavItem key={item.href} item={item} />
                        ))}
                    </div>
                )}
            </div>
        );
    };
    // Filter sections by user role
    const visibleSections = navigationSections.filter((section) =>
        section.roles.includes(user.role)
    );
    return (
        <TooltipProvider>
            <>
                <button
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background rounded-md shadow-md"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Toggle sidebar"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div
                    className={cn(
                        'fixed inset-y-0 z-20 flex flex-col bg-background transition-all duration-300 ease-in-out lg:static',
                        isCollapsed ? 'w-[72px]' : 'w-72',
                        isMobileOpen
                            ? 'translate-x-0'
                            : '-translate-x-full lg:translate-x-0'
                    )}
                >
                    <div className="border-b border-border">
                        <div
                            className={cn(
                                'flex h-16 items-center gap-2 px-4',
                                isCollapsed && 'justify-center px-2'
                            )}
                        >
                            {!isCollapsed && (
                                <Link
                                    to="/"
                                    className="lg:flex hidden items-center gap-1.5 font-semibold"
                                >
                                    <img
                                        src={logo}
                                        alt="RestoHub logo"
                                        width={25}
                                        height={25}
                                    />
                                    <span className="tracking-wide">
                                        RestoHub
                                    </span>
                                </Link>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    'ml-auto h-8 w-8 lg:block hidden',
                                    isCollapsed && 'ml-0'
                                )}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                <PanelLeftClose
                                    className={cn(
                                        'h-5 w-5 transition-transform',
                                        isCollapsed && 'rotate-180'
                                    )}
                                />
                                <span className="sr-only">
                                    {isCollapsed ? 'Expand' : 'Collapse'}{' '}
                                    Sidebar
                                </span>
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <div
                            className={cn(
                                'flex lg:hidden h-16 items-center gap-2 pt-4 justify-center'
                            )}
                        >
                            <Link
                                to="/"
                                className="flex items-center gap-1.5 font-semibold"
                            >
                                <img
                                    src={logo}
                                    alt="RestoHub logo"
                                    width={25}
                                    height={25}
                                />
                                <span className="tracking-wide">RestoHub</span>
                            </Link>
                        </div>
                        <nav className="flex-1 space-y-1 px-2 py-4">
                            {visibleSections.map((section) => (
                                <MenuSection
                                    key={section.key}
                                    section={section}
                                />
                            ))}
                        </nav>
                    </div>
                    <div className="border-t border-border p-2">
                        <nav className="space-y-1">
                            {bottomNavigation
                                .filter((item) => !item.roles || item.roles.includes(user.role))
                                .map((item) => (
                                    <NavItem key={item.name} item={item} isBottom />
                                ))}
                        </nav>
                    </div>
                </div>
            </>
        </TooltipProvider>
    );
}
