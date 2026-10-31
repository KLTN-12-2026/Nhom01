import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    FaSearch,
    FaFileInvoice,
    FaFilePdf,
    FaFileExcel,
    FaFilter,
    FaTimesCircle,
} from 'react-icons/fa';
import { LuCheck, LuPrinter } from 'react-icons/lu';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { fetchAllOrders, updateOrderStatus } from '../store/orderSlice';
import ViewImage from '../components/ViewImage';
import ConfirmBox from '../components/ConfirmBox';
import Loading from '../components/Loading';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@radix-ui/react-label';
import DynamicTable from '@/components/table/dynamic-table';
import NoData from '@/components/NoData';

const BillPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { allOrders: orders = [], loading } = useSelector(
        (state) => state.orders
    );
    const user = useSelector((state) => state.user);
    // Allow MANAGER, WAITER, CASHIER to access
    const canAccessBills = ['MANAGER', 'WAITER', 'CASHIER'].includes(
        user?.role
    );

    // State for search and filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterParams, setFilterParams] = useState({
        status: '',
        startDate: '',
        endDate: '',
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [dateError, setDateError] = useState('');

    const [imageURL, setImageURL] = useState('');
    const [openUpdateStatus, setOpenUpdateStatus] = useState(false);
    const [openCancelDialog, setOpenCancelDialog] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [cancelReason, setCancelReason] = useState('');

    // Gọi API chỉ khi filterParams thay đổi
    useEffect(() => {
        const loadOrders = async () => {
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken || !canAccessBills) {
                navigate('/dashboard/profile');
                return;
            }

            try {
                await dispatch(fetchAllOrders(filterParams)).unwrap();
            } catch (error) {
                if (error?.response?.status !== 401) {
                    toast.error(error || 'Có lỗi xảy ra khi tải đơn hàng');
                }
            }
        };

        loadOrders();
    }, [dispatch, canAccessBills, navigate, filterParams]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        // Tạo đối tượng params mới để kiểm tra
        const newParams = {
            ...filterParams,
            [name]: value,
        };

        // Kiểm tra nếu cả hai ngày đều có giá trị
        if (newParams.startDate && newParams.endDate) {
            const startDate = new Date(newParams.startDate);
            const endDate = new Date(newParams.endDate);

            if (startDate > endDate) {
                setDateError(
                    'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
                );
                return; // Không cập nhật params nếu ngày không hợp lệ
            }
        }

        // Nếu kiểm tra hợp lệ, xóa thông báo lỗi và cập nhật params
        setDateError('');
        setFilterParams(newParams);
    };

    const resetFilters = () => {
        setFilterParams({
            status: '',
            startDate: '',
            endDate: '',
        });
        setSearchTerm('');
        setDateError(''); // Xóa thông báo lỗi khi reset
    };

    // Apply filters and search
    useEffect(() => {
        try {
            let result = [...orders];

            // Apply status filter
            if (filterParams.status) {
                result = result.filter(
                    (order) => order.payment_status === filterParams.status
                );
            }

            // Apply date range filter
            if (filterParams.startDate) {
                const startDate = new Date(filterParams.startDate);
                result = result.filter(
                    (order) => new Date(order.createdAt) >= startDate
                );
            }

            if (filterParams.endDate) {
                const endDate = new Date(filterParams.endDate);
                endDate.setHours(23, 59, 59, 999); // End of the day
                result = result.filter(
                    (order) => new Date(order.createdAt) <= endDate
                );
            }

            // Apply search term
            if (searchTerm.trim()) {
                const searchLower = searchTerm.trim().toLowerCase();
                result = result.filter((order) => {
                    const searchFields = [
                        order.orderId,
                        order.userId?.name,
                        order.userId?.email,
                        // Check user mobile
                        order.userId?.mobile,
                        // Check phone number in different formats
                        order.userId?.mobile?.replace(/\s+/g, ''), // Remove spaces
                        order.payment_status,
                        // Search in product details if available
                        ...(order.products?.flatMap((product) => [
                            product.name,
                            product.sku,
                            product.brand,
                            product.category?.name,
                        ]) || []),
                        // Fallback to product_details if products array is not available
                        order.product_details?.name,
                        order.product_details?.brand,
                        order.product_details?.category,
                    ].filter(Boolean);

                    return searchFields.some((field) =>
                        String(field).toLowerCase().includes(searchLower)
                    );
                });
            }

            setFilteredOrders(result);
        } catch (error) {
            console.error('Error filtering orders:', error);
            setFilteredOrders(orders);
        }
    }, [orders, searchTerm, filterParams]);

    const getStatusBadge = (status) => {
        const statusConfig = {
            'Đang chờ thanh toán': {
                text: 'Chờ thanh toán',
                className: 'bg-yellow-100 text-yellow-800',
            },
            'Chờ thanh toán': {
                text: 'Chờ thanh toán',
                className: 'bg-yellow-100 text-yellow-800',
            },
            'Đã thanh toán': {
                text: 'Đã thanh toán',
                className: 'bg-green-100 text-green-800',
            },
            'Đã hủy': { text: 'Đã hủy', className: 'bg-red-100 text-red-800' },
        };

        const config = statusConfig[status] || {
            text: status || 'Chưa xác định',
            className: 'bg-gray-100 text-gray-800',
        };

        return (
            <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
            >
                {config.text}
            </span>
        );
    };

    // Column configuration for DynamicTable
    const columns = useMemo(
        () => [
            {
                key: 'orderId',
                label: 'Mã Đơn',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <div
                        title={value}
                        className="font-medium text-center text-rose-500 line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis"
                    >
                        {value}
                    </div>
                ),
            },
            {
                key: 'customer',
                label: 'Khách hàng',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div>
                        <div className="font-medium text-rose-500 line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis">
                            {row.rawData.userId?.name || 'Khách vãng lai'}
                        </div>
                        <p
                            title={row.rawData.userId?.email}
                            className="text-sm line-clamp-1 max-w-[100px] overflow-hidden text-ellipsis"
                        >
                            {row.rawData.userId?.email}
                        </p>
                    </div>
                ),
            },
            {
                key: 'product',
                label: 'Sản phẩm',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div className="flex items-center gap-3 max-w-[250px]">
                        <img
                            src={
                                row.rawData.product_details?.image?.[0] ||
                                '/placeholder.jpg'
                            }
                            alt=""
                            className="w-12 h-12 border border-border/80 object-cover rounded-xl shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                            onClick={() =>
                                setImageURL(
                                    row.rawData.product_details?.image?.[0]
                                )
                            }
                            onError={(e) => (e.target.src = '/placeholder.jpg')}
                        />
                        <div>
                            <p
                                className="line-clamp-2 sm:max-w-[50px] 2xl:max-w-[250px] overflow-hidden text-ellipsis"
                                title={row.rawData.product_details?.name}
                            >
                                {row.rawData.product_details?.name || 'N/A'}
                            </p>
                            <p className="text-rose-400 font-bold">
                                x{row.rawData.quantity}
                            </p>
                        </div>
                    </div>
                ),
            },
            {
                key: 'totalAmt',
                label: 'Tổng tiền',
                type: 'number',
                sortable: true,
                format: (value) => (
                    <div className="text-center font-medium">
                        {DisplayPriceInVND(value || 0)}
                    </div>
                ),
            },
            {
                key: 'payment_status',
                label: 'Trạng thái',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <div className="text-center">{getStatusBadge(value)}</div>
                ),
            },
            {
                key: 'createdAt',
                label: 'Ngày tạo',
                type: 'date',
                sortable: true,
                format: (value) => (
                    <div className="text-center font-medium">
                        {format(new Date(value), 'dd/MM/yyyy HH:mm', {
                            locale: vi,
                        })}
                    </div>
                ),
            },
            {
                key: 'action',
                label: 'Thao tác',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div className="flex gap-2 justify-center">
                        {['Đang chờ thanh toán', 'Chờ thanh toán'].includes(
                            row.rawData.payment_status
                        ) && (
                            <button
                                className="p-2 bg-green-100 text-green-600 rounded-md hover:bg-green-200"
                                onClick={() =>
                                    handleOpenConfirmBox(row.rawData._id)
                                }
                                title="Xác nhận thanh toán"
                            >
                                <LuCheck size={18} />
                            </button>
                        )}
                        <button
                            onClick={() => printBill(row.rawData)}
                            className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
                            title="In hóa đơn"
                        >
                            <LuPrinter size={18} />
                        </button>
                    </div>
                ),
            },
        ],
        []
    );

    // Transform data for DynamicTable
    const tableData = useMemo(() => {
        return filteredOrders.map((order, index) => ({
            id: index + 1,
            orderId: order.orderId,
            customer: order.userId?.name || 'Khách vãng lai',
            product: order.product_details?.name || 'N/A',
            totalAmt: order.totalAmt || 0,
            payment_status: order.payment_status,
            createdAt: order.createdAt,
            rawData: order, // Keep reference to original order data
        }));
    }, [filteredOrders]);

    const { totalRevenue, orderCount } = useMemo(() => {
        return filteredOrders.reduce(
            (acc, order) => ({
                totalRevenue: acc.totalRevenue + (order.totalAmt || 0),
                orderCount: acc.orderCount + 1,
            }),
            { totalRevenue: 0, orderCount: 0 }
        );
    }, [filteredOrders]);

    const exportToExcel = () => {
        const data = filteredOrders.map((order) => ({
            'Mã hóa đơn': order.orderId,
            'Ngày tạo': format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', {
                locale: vi,
            }),
            'Khách hàng': order.userId?.name || 'Khách vãng lai',
            'Sản phẩm': order.product_details?.name || '',
            'Số lượng': order.quantity,
            'Tổng tiền': order.totalAmt,
            'Trạng thái thanh toán': order.payment_status || 'Chưa xác định',
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách hóa đơn');
        XLSX.writeFile(
            wb,
            `danh-sach-hoa-don-${new Date().toISOString().split('T')[0]}.xlsx`
        );
    };

    const handleOpenConfirmBox = (orderId) => {
        setSelectedOrderId(orderId);
        setOpenUpdateStatus(true);
    };

    const handleUpdateStatus = async (
        orderId,
        status = 'Đã thanh toán',
        cancelReason = ''
    ) => {
        try {
            const updateData = { orderId, status };
            if (status === 'Đã hủy' && cancelReason)
                updateData.cancelReason = cancelReason;

            await dispatch(updateOrderStatus(updateData)).unwrap();
            await dispatch(fetchAllOrders(filterParams)).unwrap();

            toast.success(
                status === 'Đã hủy'
                    ? 'Hủy đơn hàng thành công!'
                    : 'Cập nhật trạng thái thành công!'
            );
            setOpenUpdateStatus(false);
            setOpenCancelDialog(false);
            setCancelReason('');
            setSelectedOrderId(null);
        } catch (error) {
            toast.error(error?.message || 'Cập nhật thất bại');
        }
    };

    const printBill = (order) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Hóa đơn ${order.orderId}</title>
            <style>
                body { font-family: Arial; font-size: 12px; padding: 20px; }
                .header, .info, .table, .signature { margin-bottom: 20px; }
                .title { font-size: 18px; font-weight: bold; text-align: center; }
                .info-row { display: flex; margin-bottom: 5px; }
                .info-label { font-weight: bold; width: 120px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f2f2f2; }
                .text-right { text-align: right; }
            </style>
            </head><body onload="window.print()">
                <div class="title">HÓA ĐƠN BÁN HÀNG</div>
                <div style="text-align:center">Ngày: ${format(
                    new Date(order.createdAt),
                    'dd/MM/yyyy HH:mm',
                    { locale: vi }
                )}</div>
                <div class="info">
                    <div class="info-row"><div class="info-label">Mã HD:</div><div>${
                        order.orderId
                    }</div></div>
                    <div class="info-row"><div class="info-label">Khách:</div><div>${
                        order.userId?.name || 'Khách vãng lai'
                    }<br>${order.userId?.mobile || ''}</div></div>
                </div>
                <table>
                    <tr><th>STT</th><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr>
                    <tr>
                        <td>1</td>
                        <td>${order.product_details?.name || ''}</td>
                        <td>${DisplayPriceInVND(
                            (order.totalAmt || 0) / (order.quantity || 1)
                        )}</td>
                        <td>${order.quantity || 1}</td>
                        <td class="text-right">${DisplayPriceInVND(
                            order.totalAmt || 0
                        )}</td>
                    </tr>
                    <tfoot><tr><td colspan="4" class="text-right"><strong>Tổng:</strong></td><td class="text-right"><strong>${DisplayPriceInVND(
                        order.totalAmt || 0
                    )}</strong></td></tr></tfoot>
                </table>
                <div class="signature" style="display:flex; justify-content: space-between; margin-top: 50px;">
                    <div>Người lập<br>(Ký, ghi rõ họ tên)</div>
                    <div>Khách hàng<br>(Ký, ghi rõ họ tên)</div>
                </div>
            </body></html>
        `);
        printWindow.document.close();
    };

    const statusOptions = [
        { value: '', label: 'Tất cả' },
        { value: 'Đang chờ thanh toán', label: 'Đang chờ thanh toán' },
        { value: 'Đã thanh toán', label: 'Đã thanh toán' },
    ];

    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-border/80 rounded-xl">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Quản lý hoá đơn
                    </CardTitle>
                    <CardDescription>Quản lý hoá đơn hệ thống</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-2">
                <div className="liquid-glass rounded-xl shadow-xs p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaFileInvoice className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold">Tổng số hóa đơn</p>
                        <p className="text-xl font-bold">{orderCount}</p>
                    </div>
                </div>
                <div className="liquid-glass rounded-xl shadow-xs p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaFileInvoice className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold">Tổng doanh thu</p>
                        <p className="text-xl font-bold">
                            {DisplayPriceInVND(totalRevenue)}
                        </p>
                    </div>
                </div>
                <div className="liquid-glass rounded-xl shadow-xs p-3 flex items-center gap-4">
                    <div className="p-3 rounded-full border-[3px] liquid-glass text-highlight">
                        <FaFilter className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold">Đang hiển thị</p>
                        <p className="text-xl font-bold">
                            {filteredOrders.length} / {orders.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bộ lọc */}
            <div className="rounded-lg border-2 liquid-glass px-4 py-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="space-y-2">
                        <Label className="block font-medium">Tìm kiếm</Label>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Tìm kiếm..."
                                className="w-full pl-10 h-12 text-sm placeholder:text-foreground border-foreground"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="block font-medium">Trạng thái</Label>
                        <select
                            name="status"
                            className="text-sm h-12 w-full border-foreground border bg-transparent
                    px-3 py-1 rounded-md cursor-pointer"
                            value={filterParams.status}
                            onChange={handleFilterChange}
                        >
                            {statusOptions.map((opt) => (
                                <option
                                    key={opt.value}
                                    value={opt.value}
                                    className="text-foreground bg-background"
                                >
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label className="block font-medium mb-1">
                            Từ ngày
                        </Label>
                        <div className="relative">
                            <input
                                type="date"
                                name="startDate"
                                className="text-sm h-12 w-full border-foreground border bg-transparent
                            px-3 py-1 rounded-md pr-8 appearance-none" // Thêm appearance-none
                                value={filterParams.startDate}
                                onChange={handleFilterChange}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg
                                    className="w-5 h-5 text-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="block font-medium mb-1">
                            Đến ngày
                        </Label>
                        <div className="relative">
                            <input
                                type="date"
                                name="endDate"
                                className={`w-full h-12 border ${
                                    dateError
                                        ? 'border-red-500'
                                        : 'border-foreground'
                                } bg-transparent px-3 py-1 rounded-md pr-8 appearance-none text-sm`}
                                value={filterParams.endDate}
                                onChange={handleFilterChange}
                                min={filterParams.startDate}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg
                                    className="w-5 h-5 text-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>
                        {dateError && (
                            <p className="mt-1 text-sm text-red-500">
                                {dateError}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end mt-4 gap-2">
                    <button
                        onClick={resetFilters}
                        className="px-4 h-9 font-medium liquid-glass rounded-lg text-sm"
                    >
                        Đặt lại
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center px-4 h-9 text-white bg-green-600/80 rounded-lg hover:bg-green-700"
                    >
                        <FaFileExcel className="mr-2" /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* DynamicTable */}
            <div className="overflow-auto w-full max-w-[95vw]">
                <DynamicTable
                    data={tableData}
                    columns={columns}
                    pageSize={10}
                    sortable={true}
                    searchable={false}
                    filterable={false}
                    groupable={false}
                />
                {tableData.length === 0 && (
                    <NoData message="Không có hóa đơn" />
                )}
            </div>

            {loading && <Loading />}

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
            {openUpdateStatus && (
                <ConfirmBox
                    open={openUpdateStatus}
                    close={() => {
                        setOpenUpdateStatus(false);
                        setSelectedOrderId(null);
                    }}
                    confirm={() => handleUpdateStatus(selectedOrderId)}
                    title="Xác nhận cập nhật"
                    message="Cập nhật trạng thái thành Đã thanh toán?"
                    confirmText="Xác nhận"
                    cancelText="Hủy"
                />
            )}
        </section>
    );
};

export default BillPage;
