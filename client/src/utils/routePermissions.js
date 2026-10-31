// Route Permissions Configuration
// Maps each route to the roles that can access it

export const routePermissions = {
    // Products - MANAGER
    '/dashboard/category': ['MANAGER'],
    '/dashboard/sub-category': ['MANAGER'],
    '/dashboard/product': ['MANAGER'],

    // Restaurant Management
    '/dashboard/table': ['MANAGER'],
    // Staff operations (Waiters & Cashiers consolidated)
    '/dashboard/table-orders': ['MANAGER', 'WAITER', 'CASHIER'],
    '/dashboard/booking': ['MANAGER', 'WAITER', 'CASHIER'],
    '/dashboard/bill': ['MANAGER', 'WAITER', 'CASHIER'],
    '/dashboard/report': ['MANAGER'],

    // Kitchen Display System (Chef & Managers)
    '/dashboard/kitchen': ['MANAGER', 'CHEF'],

    // HR Management (Manager only)
    '/dashboard/employee-management': ['MANAGER'],
    '/dashboard/shift-management': ['MANAGER'],
    '/dashboard/attendance-management': ['MANAGER'],

    // Review Management & Notification Management (Manager only)
    '/dashboard/review-management': ['MANAGER'],
    '/dashboard/notification-management': ['MANAGER'],

    // Reports & Vouchers
    '/dashboard/voucher': ['MANAGER'],
    '/dashboard/support-chat': ['MANAGER', 'WAITER', 'CASHIER'],

    // Employee Features
    '/dashboard/employee-dashboard': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
    '/dashboard/my-shifts': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
    '/dashboard/my-performance': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'],
    '/dashboard/notifications': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER', 'USER'],

    // Personal - USER
    '/dashboard/address': ['USER'],
    '/dashboard/my-orders': ['USER', 'MANAGER'],

    // Profile (all users)
    '/dashboard/profile': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER', 'USER'],

    // Dashboard home (all users)
    '/dashboard': ['MANAGER', 'WAITER', 'CHEF', 'CASHIER', 'USER'],
};

// Helper function to check if user has permission for a route
export const hasRoutePermission = (userRole, pathname) => {
    // Check exact match first
    if (routePermissions[pathname]) {
        return routePermissions[pathname].includes(userRole);
    }

    // Check if pathname starts with any configured route (for nested routes)
    for (const [route, roles] of Object.entries(routePermissions)) {
        if (pathname.startsWith(route) && route !== '/dashboard') {
            return roles.includes(userRole);
        }
    }

    // Default: allow if MANAGER, otherwise deny
    return userRole === 'MANAGER';
};
