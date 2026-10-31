export const baseURL = import.meta.env.VITE_API_URL

const SummaryApi = {
    register: {
        url: '/api/user/register',
        method: 'post'
    },
    verifyEmail: {
        url: '/api/user/verify-email',
        method: 'post'
    },
    login: {
        url: '/api/user/login',
        method: 'post'
    },
    google_login: {
        url: '/api/user/google-login',
        method: 'post'
    },
    user_points: {
        url: '/api/user/user-points',
        method: 'get'
    },
    forgot_password: {
        url: '/api/user/forgot-password',
        method: 'put'
    },
    forgot_password_otp_verification: {
        url: '/api/user/verify-forgot-password-otp',
        method: 'put'
    },
    reset_password: {
        url: '/api/user/reset-password',
        method: 'put'
    },
    refresh_token: {
        url: '/api/user/refresh-token',
        method: 'post'
    },
    user_details: {
        url: '/api/user/user-details',
        method: 'get'
    },
    logout: {
        url: '/api/user/logout',
        method: 'get'
    },
    upload_avatar: {
        url: '/api/user/upload-avatar',
        method: 'put'
    },
    update_user: {
        url: '/api/user/update-user',
        method: 'put'
    },
    verify_password: {
        url: '/api/user/verify-password',
        method: 'post'
    },
    get_available_vouchers: {
        url: '/api/voucher/available',
        method: 'post'
    },
    apply_voucher: {
        url: '/api/voucher/apply',
        method: 'post'
    },
    change_password: {
        url: '/api/user/change-password',
        method: 'put'
    },
    get_initial_products: {
        url: '/api/product/initial-products',
        method: 'post'
    },

    // Category
    add_category: {
        url: '/api/category/add-category',
        method: 'post'
    },
    upload_image: {
        url: '/api/file/upload',
        method: 'post'
    },
    get_category: {
        url: '/api/category/get-category',
        method: 'get'
    },
    update_category: {
        url: '/api/category/update-category',
        method: 'put'
    },
    delete_category: {
        url: '/api/category/delete-category',
        method: 'delete'
    },
    get_deleted_categories: {
        url: '/api/category/get-deleted-categories',
        method: 'get'
    },
    restore_category: {
        url: '/api/category/restore-category',
        method: 'put'
    },
    hard_delete_category: {
        url: '/api/category/hard-delete-category',
        method: 'delete'
    },

    // Sub Category
    add_sub_category: {
        url: '/api/sub-category/add-sub-category',
        method: 'post'
    },
    get_sub_category: {
        url: '/api/sub-category/get-sub-category',
        method: 'get'
    },
    update_sub_category: {
        url: '/api/sub-category/update-sub-category',
        method: 'put'
    },
    delete_sub_category: {
        url: '/api/sub-category/delete-sub-category',
        method: 'delete'
    },

    // Product
    add_product: {
        url: '/api/product/add-product',
        method: 'post'
    },
    get_product: {
        url: '/api/product/get-product',
        method: 'post'
    },
    get_product_by_category: {
        url: '/api/product/get-product-by-category',
        method: 'post'
    },
    get_product_by_category_and_sub_category: {
        url: '/api/product/get-product-by-category-and-subcategory',
        method: 'post'
    },
    get_product_details: {
        url: '/api/product/get-product-details',
        method: 'post'
    },
    update_product_details: {
        url: '/api/product/update-product-details',
        method: 'put'
    },
    delete_product: {
        url: '/api/product/delete-product',
        method: 'delete'
    },
    search_product: {
        url: '/api/product/search-product',
        method: 'post'
    },

    // Cart
    add_to_cart: {
        url: '/api/cart/add-to-cart-item',
        method: 'post'
    },
    get_cart_item: {
        url: '/api/cart/get-cart-item',
        method: 'get'
    },
    update_cart_item_qty: {
        url: '/api/cart/update-cart-item',
        method: 'put'
    },
    delete_cart_item: {
        url: '/api/cart/delete-cart-item',
        method: 'delete'
    },
    clear_cart: {
        url: '/api/cart/clear-cart',
        method: 'delete'
    },

    // Order
    cash_on_delivery_order: {
        url: '/api/order/cash-on-delivery',
        method: 'post'
    },
    payment_url: {
        url: '/api/order/checkout',
        method: 'post'
    },
    get_order_items: {
        url: '/api/order/order-list',
        method: 'get'
    },
    all_orders: {
        url: '/api/order/all-orders',
        method: 'get'
    },
    update_order_status: {
        url: '/api/order/update-status',
        method: 'put'
    },

    // Voucher
    add_voucher: {
        url: '/api/voucher/add-voucher',
        method: 'post'
    },
    get_all_voucher: {
        url: '/api/voucher/get-all-voucher',
        method: 'get'
    },
    update_voucher: {
        url: '/api/voucher/update-voucher',
        method: 'put'
    },
    delete_voucher: {
        url: '/api/voucher/delete-voucher',
        method: 'delete'
    },
    bulk_delete_vouchers: {
        url: '/api/voucher/bulk-delete-vouchers',
        method: 'delete'
    },
    bulk_update_vouchers_status: {
        url: '/api/voucher/bulk-update-vouchers-status',
        method: 'put'
    },

    // AI Chat
    chat_message: {
        url: '/api/chat/message',
        method: 'post'
    },

    // Support Chat (Admin REST)
    get_support_conversations: {
        url: '/api/support/conversations',
        method: 'get'
    },
    get_support_conversation_by_id: {
        url: '/api/support/conversations/:id',
        method: 'get'
    },
    close_support_conversation: {
        url: '/api/support/conversations/:id/close',
        method: 'patch'
    },
    mark_support_conversation_read: {
        url: '/api/support/conversations/:id/read',
        method: 'patch'
    },

    // Table
    create_table: {
        url: '/api/table/create',
        method: 'post'
    },
    get_all_tables: {
        url: '/api/table/get-all',
        method: 'get'
    },
    get_table_by_id: {
        url: '/api/table/get/:id',
        method: 'get'
    },
    update_table: {
        url: '/api/table/update',
        method: 'put'
    },
    delete_table: {
        url: '/api/table/delete',
        method: 'delete'
    },
    update_table_status: {
        url: '/api/table/update-status',
        method: 'patch'
    },
    get_available_tables: {
        url: '/api/table/available',
        method: 'get'
    },
    generate_table_qr: {
        url: '/api/table/generate-qr',
        method: 'post'
    },
    get_table_qr: {
        url: '/api/table/qr/:id',
        method: 'get'
    },

    // Table Authentication
    tableLogin: {
        url: '/api/table-auth/login-qr',
        method: 'post'
    },
    getTableSession: {
        url: '/api/table-auth/session',
        method: 'get'
    },
    logoutTable: {
        url: '/api/table-auth/logout',
        method: 'post'
    },

    // Table Order Management
    add_items_to_table_order: {
        url: '/api/table-order/add-items',
        method: 'post'
    },
    get_current_table_order: {
        url: '/api/table-order/current',
        method: 'get'
    },
    checkout_table_order: {
        url: '/api/table-order/checkout',
        method: 'post'
    },
    cancel_table_order: {
        url: '/api/table-order/cancel',
        method: 'post'
    },
    get_all_active_table_orders: {
        url: '/api/table-order/all-active',
        method: 'get'
    },

    // Booking
    create_booking: {
        url: '/api/booking/create',
        method: 'post'
    },
    get_all_bookings: {
        url: '/api/booking/get-all',
        method: 'get'
    },
    get_booking_by_id: {
        url: '/api/booking/get/:id',
        method: 'get'
    },
    update_booking: {
        url: '/api/booking/update',
        method: 'put'
    },
    cancel_booking: {
        url: '/api/booking/cancel',
        method: 'delete'
    },
    confirm_booking: {
        url: '/api/booking/confirm',
        method: 'patch'
    },
    get_available_tables_for_booking: {
        url: '/api/booking/available-tables',
        method: 'post'
    },
    create_booking_payment_session: {
        url: '/api/booking/create-payment-session',
        method: 'post'
    },
    // Booking with pre-order
    create_booking_with_preorder: {
        url: '/api/booking/create-with-preorder',
        method: 'post'
    },
    get_booking_with_preorder: {
        url: '/api/booking/get-with-preorder/:id',
        method: 'get'
    },
    create_preorder_payment_session: {
        url: '/api/booking/create-preorder-payment-session',
        method: 'post'
    },

    // Cleanup cancelled payments
    cleanup_cancelled_payment: {
        url: '/api/order/cleanup-cancelled',
        method: 'post'
    },
    cleanup_by_ids: {
        url: '/api/order/cleanup-by-ids',
        method: 'post'
    },
    get_payment_status: {
        url: '/api/order/payment-status/:paymentId',
        method: 'get'
    },
    get_payment_details: {
        url: '/api/order/payment-details/:paymentId',
        method: 'get'
    },

    // Employee Management
    get_employee: {
        url: '/api/employee/all',
        method: 'get'
    },
    get_all_employees: {
        url: '/api/employee/all',
        method: 'get'
    },
    get_employee_by_id: {
        url: '/api/employee/:id',
        method: 'get'
    },
    create_employee: {
        url: '/api/employee/create',
        method: 'post'
    },
    update_employee: {
        url: '/api/employee/update/:id',
        method: 'put'
    },
    delete_employee: {
        url: '/api/employee/delete/:id',
        method: 'delete'
    },
    get_employees_by_role: {
        url: '/api/employee/role/:role',
        method: 'get'
    },

    // Shift Management
    create_shift: {
        url: '/api/shift/create',
        method: 'post'
    },
    get_shifts_by_date: {
        url: '/api/shift/date',
        method: 'get'
    },
    get_shifts_by_employee: {
        url: '/api/shift/employee/:employeeId',
        method: 'get'
    },
    update_shift: {
        url: '/api/shift/update/:id',
        method: 'put'
    },
    delete_shift: {
        url: '/api/shift/delete/:id',
        method: 'delete'
    },
    assign_staff_to_shift: {
        url: '/api/shift/assign',
        method: 'post'
    },

    // Attendance Management
    check_in: {
        url: '/api/attendance/check-in',
        method: 'post'
    },
    check_out: {
        url: '/api/attendance/check-out',
        method: 'post'
    },
    get_current_attendance: {
        url: '/api/attendance/current',
        method: 'get'
    },
    get_attendance_by_employee: {
        url: '/api/attendance/employee/:employeeId',
        method: 'get'
    },
    get_attendance_by_date: {
        url: '/api/attendance/date/:date',
        method: 'get'
    },

    // Performance Management
    get_performance_stats: {
        url: '/api/performance/employee/:employeeId',
        method: 'get'
    },
    get_team_performance: {
        url: '/api/performance/team',
        method: 'get'
    },
    update_performance_metrics: {
        url: '/api/performance/update',
        method: 'post'
    },

    // Reports & Analytics
    booking_report: {
        url: '/api/booking/report',
        method: 'get'
    },
    customer_analytics: {
        url: '/api/user/analytics',
        method: 'get'
    },

    // Voucher APIs
    get_best_voucher: {
        url: '/api/voucher/best',
        method: 'post'
    },
    // Voucher Analytics APIs
    voucher_analytics_overview: {
        url: '/api/voucher/analytics/overview',
        method: 'get'
    },
    voucher_analytics_top: {
        url: '/api/voucher/analytics/top-vouchers',
        method: 'get'
    },
    voucher_analytics_trend: {
        url: '/api/voucher/analytics/usage-trend',
        method: 'get'
    },

    // Notification APIs
    send_notification: {
        url: '/api/notification/send',
        method: 'post'
    },
    get_my_notifications: {
        url: '/api/notification/my',
        method: 'get'
    },
    mark_notification_read: {
        url: '/api/notification/read/:id',
        method: 'put'
    },
    mark_all_notifications_read: {
        url: '/api/notification/read-all',
        method: 'put'
    },
    delete_notification: {
        url: '/api/notification/delete/:id',
        method: 'delete'
    },

    // Review APIs
    create_review: {
        url: '/api/review/create',
        method: 'post'
    },
    get_product_reviews: {
        url: '/api/review/product/:productId',
        method: 'get'
    },
    get_all_reviews: {
        url: '/api/review/all',
        method: 'get'
    },
    reply_review: {
        url: '/api/review/reply/:id',
        method: 'put'
    },
    check_can_review: {
        url: '/api/review/can-review/:productId',
        method: 'get'
    },
    get_my_reviews: {
        url: '/api/review/my',
        method: 'get'
    },

    // Table Orders & Kitchen Staff APIs
    staff_add_items_to_table_order: {
        url: '/api/table-order/staff-add-items',
        method: 'post'
    },
    end_table_order: {
        url: '/api/table-order/end-order',
        method: 'post'
    },
    confirm_table_payment: {
        url: '/api/table-order/confirm-payment',
        method: 'post'
    },
    get_kitchen_items: {
        url: '/api/table-order/kitchen/items',
        method: 'get'
    },
    update_kitchen_item_status: {
        url: '/api/table-order/kitchen/item-status',
        method: 'put'
    },
    get_customer_active_dishes: {
        url: '/api/table-order/customer/active-dishes',
        method: 'get'
    }
}

export default SummaryApi