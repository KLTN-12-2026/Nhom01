import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, PlusCircle, Utensils, LayoutGrid } from 'lucide-react';
import ActiveTableOrders from '@/components/ActiveTableOrders';
import StaffAddOrderModal from '@/components/StaffAddOrderModal';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import AxiosToastError from '@/utils/AxiosToastError';
import { getSocket } from '@/utils/socket';

const TableOrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openAddModal, setOpenAddModal] = useState(false);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_all_active_table_orders,
            });

            if (response.data.success) {
                setOrders(response.data.data || []);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        const socket = getSocket();
        if (!socket.connected) socket.connect();

        const handleUpdate = () => {
            fetchOrders();
        };

        socket.on('table_order:updated', handleUpdate);
        socket.on('dish:ready', handleUpdate);
        socket.on('kitchen:new_order', handleUpdate);

        // Poll every 20 seconds
        const interval = setInterval(fetchOrders, 20000);
        return () => {
            socket.off('table_order:updated', handleUpdate);
            socket.off('dish:ready', handleUpdate);
            socket.off('kitchen:new_order', handleUpdate);
            clearInterval(interval);
        };
    }, []);

    return (
        <section className="container mx-auto grid gap-5 z-10 max-w-7xl">
            {/* Header Banner */}
            <Card className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between gap-4 border-border shadow-sm items-start sm:items-center bg-card">
                <CardHeader className="p-0">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="p-2 rounded-xl bg-orange-500/10 text-orange-600">
                            <Utensils className="h-6 w-6" />
                        </span>
                        Quản Lý Đơn Gọi Món (POS Bàn)
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Theo dõi món đang nấu, bưng món cho khách, tạo mã QR VietQR và thu tiền tại bàn
                    </CardDescription>
                </CardHeader>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchOrders}
                        disabled={loading}
                        className="h-10 text-xs font-semibold flex items-center gap-2"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? 'animate-spin text-orange-600' : ''}`}
                        />
                        Làm mới
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setOpenAddModal(true)}
                        className="h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/20 px-4"
                    >
                        <PlusCircle className="h-4 w-4" /> Đặt món cho khách
                    </Button>
                </div>
            </Card>

            <ActiveTableOrders orders={orders} loading={loading} onReload={fetchOrders} />

            <StaffAddOrderModal
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                onOrderAdded={fetchOrders}
            />
        </section>
    );
};

export default TableOrdersPage;