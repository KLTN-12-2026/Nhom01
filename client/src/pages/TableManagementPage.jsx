import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import AxiosToastError from '../utils/AxiosToastError';
import { LuPencil, LuTrash } from 'react-icons/lu';
import { UtensilsCrossed, Plus, Users, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import Loading from '../components/Loading';
import ConfirmBox from '../components/ConfirmBox';
import successAlert from '../utils/successAlert';
import DynamicTable from '@/components/table/dynamic-table';
import {
    Card,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UploadTableModel from '@/components/UploadTableModel';
import EditTableModel from '@/components/EditTableModel';
import NoData from '@/components/NoData';

const TableManagementPage = () => {
    const [openAddTable, setOpenAddTable] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    const [openEdit, setOpenEdit] = useState(false);
    const [editData, setEditData] = useState({
        _id: '',
        tableNumber: '',
        capacity: 0,
        status: 'available',
        location: '',
        description: '',
    });

    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [deleteTable, setDeleteTable] = useState({
        _id: '',
    });

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_all_tables,
            });

            if (response.data.success) {
                const formattedData = response.data.data.map((item, index) => ({
                    id: index + 1,
                    _id: item._id,
                    tableNumber: item.tableNumber,
                    capacity: item.capacity,
                    status: item.status,
                    location: item.location || 'Chưa xác định',
                    description: item.description || '',
                    date: format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm'),
                }));
                setData(formattedData);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const handleDeleteTable = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_table,
                data: deleteTable,
            });

            const { data: responseData } = response;

            if (responseData.success) {
                successAlert(responseData.message);
                fetchTables();
                setOpenConfirmBoxDelete(false);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: {
                text: 'Trống',
                badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                dotClass: 'bg-emerald-500',
            },
            occupied: {
                text: 'Đang sử dụng',
                badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
                dotClass: 'bg-rose-500',
            },
            reserved: {
                text: 'Đã đặt',
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                dotClass: 'bg-amber-500',
            },
            maintenance: {
                text: 'Bảo trì',
                badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
                dotClass: 'bg-slate-400',
            },
        };

        const config = statusConfig[status] || statusConfig.available;

        return (
            <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.badgeClass}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                {config.text}
            </span>
        );
    };

    const stats = {
        total: data.length,
        available: data.filter((t) => t.status === 'available').length,
        occupied: data.filter((t) => t.status === 'occupied').length,
        reserved: data.filter((t) => t.status === 'reserved').length,
    };

    const columns = [
        { key: 'tableNumber', label: 'Số bàn', type: 'string', sortable: true },
        { key: 'id', label: 'ID', type: 'number', sortable: true },
        { key: 'capacity', label: 'Sức chứa', type: 'number', sortable: true },
        {
            key: 'status',
            label: 'Trạng thái',
            type: 'string',
            sortable: true,
            format: (value) => getStatusBadge(value),
        },
        { key: 'location', label: 'Vị trí', type: 'string', sortable: true },
        {
            key: 'date',
            label: 'Ngày tạo',
            type: 'string',
            sortable: true,
        },
        {
            key: 'action',
            label: 'Thao tác',
            type: 'string',
            sortable: false,
            format: (value, row) =>
                row ? (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            title="Chỉnh sửa bàn"
                            className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-xl transition-colors cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenEdit(true);
                                setEditData(row);
                            }}
                        >
                            <LuPencil size={15} />
                        </button>
                        <button
                            type="button"
                            title="Xóa bàn"
                            className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenConfirmBoxDelete(true);
                                setDeleteTable(row);
                            }}
                        >
                            <LuTrash size={15} />
                        </button>
                    </div>
                ) : null,
        },
    ];

    return (
        <section className="container mx-auto space-y-5 z-10 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-card rounded-xl border border-border/80 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            Quản lý bàn ăn
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Theo dõi trạng thái, sức chứa và vị trí bàn trong nhà hàng
                        </p>
                    </div>
                </div>

                <div>
                    <Button
                        onClick={() => setOpenAddTable(true)}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium shadow-xs cursor-pointer transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Thêm Bàn Mới</span>
                    </Button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                            {stats.total}
                        </div>
                        <div className="text-xs text-muted-foreground">Tổng số bàn</div>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.available}
                        </div>
                        <div className="text-xs text-muted-foreground">Bàn trống</div>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                            {stats.occupied}
                        </div>
                        <div className="text-xs text-muted-foreground">Đang sử dụng</div>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {stats.reserved}
                        </div>
                        <div className="text-xs text-muted-foreground">Đã đặt trước</div>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-card rounded-xl p-4 sm:p-6 border border-border/80 shadow-xs">
                <div className="overflow-x-auto w-full">
                    <DynamicTable
                        data={data}
                        columns={columns}
                        pageSize={10}
                        sortable={true}
                        searchable={true}
                        searchPlaceholder="Tìm kiếm theo số bàn, vị trí, trạng thái..."
                        filterable={false}
                        groupable={false}
                    />
                </div>
                {data.length === 0 && !loading && <NoData message="Không có bàn" />}
            </div>

            {loading && <Loading />}

            {openAddTable && (
                <UploadTableModel
                    close={() => setOpenAddTable(false)}
                    fetchData={fetchTables}
                />
            )}

            {openEdit && (
                <EditTableModel
                    close={() => setOpenEdit(false)}
                    fetchData={fetchTables}
                    data={editData}
                />
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    close={() => setOpenConfirmBoxDelete(false)}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    confirm={handleDeleteTable}
                    title="Xóa bàn"
                    message="Bạn có chắc chắn muốn xóa bàn này?"
                    confirmText="Xóa"
                    cancelText="Hủy"
                />
            )}
        </section>
    );
};

export default TableManagementPage;
