import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Send,
    Users,
    Megaphone,
    CheckCircle,
    ChefHat,
    Utensils,
    UserCheck,
    Globe,
    Bell,
    Sparkles,
    Trash2,
    Clock,
    Search,
    RefreshCw
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/shiftTime';

export default function NotificationManagementPage() {
    const user = useSelector((state) => state.user);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState('ALL_STAFF'); // ALL_STAFF, STAFF, CHEF, USER, ALL
    const [recipientId, setRecipientId] = useState('');
    const [employeeFilterRole, setEmployeeFilterRole] = useState('ALL');
    const [employees, setEmployees] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Quick templates
    const templates = [
        {
            title: 'Họp giao ban đầu ca',
            msg: 'Toàn bộ nhân viên có mặt trước 15 phút tại sảnh chính để phân công công việc ca làm hôm nay.'
        },
        {
            title: 'Chú ý an toàn vệ sinh thực phẩm',
            msg: 'Nhắc nhở toàn bộ bộ phận bếp và phục vụ tuân thủ nghiêm ngặt quy trình vệ sinh và đeo găng tay khi chế biến.'
        },
        {
            title: 'Món đặc biệt hôm nay (Daily Special)',
            msg: 'Hôm nay nhà hàng áp dụng ưu đãi đặc biệt cho set Lẩu Hải Sản. Nhân viên phục vụ tích cực tư vấn cho khách hàng.'
        },
        {
            title: 'Khẩn: Bếp chuẩn bị đơn đoàn lớn',
            msg: 'Bếp chú ý có bàn tiệc 20 khách đến lúc 19:00, vui lòng chuẩn bị sơ chế trước các món khai vị.'
        }
    ];

    // Load active employees for recipient dropdown
    const fetchEmployees = useCallback(async () => {
        try {
            setLoadingEmployees(true);
            const res = await Axios({
                ...SummaryApi.get_all_employees
            });
            if (res.data.success) {
                // Filter only staff roles: WAITER, CHEF, CASHIER, MANAGER
                const staffList = (res.data.data || []).filter((emp) =>
                    ['WAITER', 'CHEF', 'CASHIER', 'MANAGER'].includes(emp.role)
                );
                setEmployees(staffList);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoadingEmployees(false);
        }
    }, []);

    // Load announcement history
    const fetchHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const res = await Axios({
                ...SummaryApi.get_my_notifications
            });
            if (res.data.success) {
                const items = res.data.data.items || [];
                // Filter announcements sent by management
                const announcements = items.filter(
                    (item) => item.type === 'ANNOUNCEMENT' || String(item.sender?._id) === String(user?._id)
                );
                setHistory(announcements);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchEmployees();
        fetchHistory();
    }, [fetchEmployees, fetchHistory]);

    const handleApplyTemplate = (tmpl) => {
        setTitle(tmpl.title);
        setMessage(tmpl.msg);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
            return;
        }

        if (targetType === 'USER' && !recipientId) {
            toast.error('Vui lòng chọn đích danh nhân viên nhận thông báo');
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                title: title.trim(),
                message: message.trim(),
                type: 'ANNOUNCEMENT',
                targetRole: targetType === 'USER' ? 'USER' : targetType,
                recipientId: targetType === 'USER' ? recipientId : null
            };

            const res = await Axios({
                ...SummaryApi.send_notification,
                data: payload
            });

            if (res.data.success) {
                toast.success('Đã phát thông báo thành công!');
                setTitle('');
                setMessage('');
                setRecipientId('');
                fetchHistory();
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi thông báo');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
        try {
            const res = await Axios({
                url: SummaryApi.delete_notification.url.replace(':id', id),
                method: SummaryApi.delete_notification.method
            });
            if (res.data.success) {
                toast.success('Đã xóa thông báo');
                setHistory((prev) => prev.filter((item) => item._id !== id));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Không thể xóa thông báo');
        }
    };

    const targetOptions = [
        {
            key: 'ALL_STAFF',
            label: 'Toàn bộ nhân viên (Nội bộ)',
            desc: 'Dành riêng cho Nhân viên & Đầu bếp',
            badge: 'Tất cả NV',
            icon: Users
        },
        {
            key: 'USER',
            label: 'Gửi riêng từng nhân viên',
            desc: 'Chọn đích danh 1 Phục vụ hoặc Đầu bếp',
            badge: 'Cá nhân',
            icon: UserCheck
        },
        {
            key: 'CHEF',
            label: 'Chỉ bộ phận Bếp (Chef)',
            desc: 'Gửi riêng cho Đầu bếp & Phụ bếp',
            badge: 'Bếp',
            icon: ChefHat
        },
        {
            key: 'STAFF',
            label: 'Chỉ bộ phận Phục vụ (Waiter)',
            desc: 'Nhân viên chạy bàn & Thu ngân',
            badge: 'Phục vụ',
            icon: Utensils
        },
        {
            key: 'ALL',
            label: 'Toàn hệ thống (Công khai)',
            desc: 'Gửi cho cả Khách hàng & Nhân viên',
            badge: 'Toàn HT',
            icon: Globe
        }
    ];

    // Filter employees by role
    const filteredEmployees = employees.filter((emp) => {
        if (employeeFilterRole === 'ALL') return true;
        return emp.role === employeeFilterRole;
    });

    const getRoleNameInVietnamese = (role) => {
        switch (role) {
            case 'CHEF':
                return 'Đầu bếp (Chef)';
            case 'WAITER':
                return 'Nhân viên Phục vụ (Waiter)';
            case 'CASHIER':
                return 'Thu ngân (Cashier)';
            case 'MANAGER':
                return 'Quản lý (Manager)';
            default:
                return role;
        }
    };

    const selectedEmployee = employees.find((e) => e._id === recipientId);

    return (
        <section className="container mx-auto grid gap-6 max-w-6xl pb-10">
            {/* Header */}
            <Card className="p-5 sm:p-6 border-border shadow-sm bg-card">
                <CardHeader className="p-0">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600">
                            <Megaphone className="h-6 w-6" />
                        </span>
                        Quản Lý & Phát Thông Báo Nhân Sự
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                        Phát thông báo nhanh cho toàn bộ hệ thống nhân viên (Đầu bếp & Phục vụ) hoặc gửi thông điệp riêng cho từng nhân viên cụ thể.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Input Form */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="p-5 sm:p-6 border-border shadow-sm bg-card space-y-5">
                        <form onSubmit={handleSend} className="space-y-4">
                            {/* Target selector */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    1. Chọn đối tượng nhận thông báo
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {targetOptions.map((opt) => {
                                        const Icon = opt.icon;
                                        const isSelected = targetType === opt.key;
                                        return (
                                            <div
                                                key={opt.key}
                                                onClick={() => setTargetType(opt.key)}
                                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                                                    isSelected
                                                        ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                                                        : 'border-border bg-card hover:border-muted-foreground/30'
                                                }`}
                                            >
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                        isSelected
                                                            ? 'bg-orange-600 text-white'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    <Icon size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs text-foreground truncate">{opt.label}</div>
                                                    <div className="text-[10px] text-muted-foreground truncate">{opt.desc}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Specific Employee Selector */}
                            {targetType === 'USER' && (
                                <div className="p-4 bg-muted/40 rounded-xl border border-orange-500/30 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-xs font-bold text-foreground">
                                            2. Chọn nhân viên cụ thể <span className="text-red-500">*</span>
                                        </label>
                                        {/* Quick Role Filter */}
                                        <div className="flex items-center gap-1">
                                            {[
                                                { role: 'ALL', label: 'Tất cả' },
                                                { role: 'WAITER', label: 'Phục vụ' },
                                                { role: 'CHEF', label: 'Đầu bếp' }
                                            ].map((btn) => (
                                                <button
                                                    key={btn.role}
                                                    type="button"
                                                    onClick={() => setEmployeeFilterRole(btn.role)}
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
                                                        employeeFilterRole === btn.role
                                                            ? 'bg-orange-600 text-white'
                                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    }`}
                                                >
                                                    {btn.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {loadingEmployees ? (
                                        <div className="text-xs text-muted-foreground py-2 text-center">Đang tải danh sách nhân viên…</div>
                                    ) : (
                                        <select
                                            value={recipientId}
                                            onChange={(e) => setRecipientId(e.target.value)}
                                            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            required
                                        >
                                            <option value="">-- Bấm để chọn Nhân viên ({filteredEmployees.length} nhân sự) --</option>
                                            {filteredEmployees.map((emp) => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.role === 'CHEF' ? '👨‍🍳 ' : '🍽️ '}
                                                    {emp.name} ({getRoleNameInVietnamese(emp.role)} - {emp.email})
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {selectedEmployee && (
                                        <div className="p-2.5 bg-background rounded-xl border border-border flex items-center justify-between text-xs">
                                            <div>
                                                <span className="text-muted-foreground">Người nhận: </span>
                                                <strong className="text-foreground">{selectedEmployee.name}</strong>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600">
                                                {getRoleNameInVietnamese(selectedEmployee.role)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quick Template Buttons */}
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                                    <Sparkles size={13} className="text-orange-500" /> Mẫu thông báo gợi ý:
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {templates.map((t, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleApplyTemplate(t)}
                                            className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2.5 py-1 rounded-lg border border-border font-medium transition-colors"
                                        >
                                            {t.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Input */}
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">
                                    Tiêu đề thông báo <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="VD: Họp giao ban đầu ca / Chú ý vệ sinh an toàn thực phẩm"
                                    className="h-10 text-xs rounded-xl"
                                    required
                                />
                            </div>

                            {/* Message Textarea */}
                            <div>
                                <label className="block text-xs font-bold text-foreground mb-1">
                                    Nội dung chi tiết <span className="text-red-500">*</span>
                                </label>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Nhập nội dung thông điệp gửi tới các bộ phận hoặc nhân viên..."
                                    rows={4}
                                    className="text-xs rounded-xl"
                                    required
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 shadow-md shadow-orange-600/20 flex items-center gap-2 rounded-xl"
                                >
                                    <Send size={15} />
                                    {submitting ? 'Đang phát thông báo…' : 'Gửi thông báo ngay'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Right: Live Preview & Sent History */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Live Preview */}
                    <Card className="p-5 border-border shadow-sm bg-card space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Bell size={14} className="text-orange-500" /> Xem trước hiển thị trên máy nhân viên
                            </span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
                                Trực tiếp
                            </span>
                        </div>

                        {/* Simulated Notification Card */}
                        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/15 text-orange-600">
                                    📢 Quản lý
                                </span>
                                <span className="text-[10px] text-muted-foreground">Vừa xong</span>
                            </div>

                            <h4 className="font-bold text-sm text-foreground">
                                {title.trim() || 'Tiêu đề thông báo của bạn...'}
                            </h4>

                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                                {message.trim() || 'Nội dung thông báo sẽ hiển thị ở đây như trên giao diện nhân viên nhận được.'}
                            </p>

                            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                                <span>
                                    Gửi tới:{' '}
                                    <strong>
                                        {targetType === 'USER'
                                            ? selectedEmployee
                                                ? selectedEmployee.name
                                                : 'Chưa chọn nhân viên'
                                            : targetOptions.find((t) => t.key === targetType)?.label}
                                    </strong>
                                </span>
                                <span className="text-orange-600 font-semibold">Chưa đọc</span>
                            </div>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-xl text-xs text-muted-foreground space-y-1">
                            <div className="font-bold text-foreground">Cơ chế phát thông báo:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                <li>Phát âm thanh báo chuông trực tiếp trên thiết bị của nhân viên nhận.</li>
                                <li>Nhân viên nhận có thể xem tại Hộp Thông Báo cá nhân bất cứ lúc nào.</li>
                            </ul>
                        </div>
                    </Card>

                    {/* History Card */}
                    <Card className="p-5 border-border shadow-sm bg-card space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                <Clock size={14} className="text-orange-500" /> Thông báo đã phát gần đây ({history.length})
                            </span>
                            <button
                                onClick={fetchHistory}
                                className="p-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
                                title="Làm mới lịch sử"
                            >
                                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                            {loadingHistory ? (
                                <div className="text-xs text-muted-foreground py-4 text-center">Đang tải lịch sử…</div>
                            ) : history.length === 0 ? (
                                <div className="text-xs text-muted-foreground py-6 text-center">Chưa có thông báo nào được phát.</div>
                            ) : (
                                history.map((item) => (
                                    <div
                                        key={item._id}
                                        className="p-3 rounded-xl border border-border bg-card hover:border-orange-500/30 transition-all space-y-1.5 text-xs"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-foreground truncate">{item.title}</span>
                                            <button
                                                onClick={() => handleDelete(item._id)}
                                                className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                                                title="Xóa thông báo"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                            {item.message}
                                        </p>

                                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                            <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 font-semibold">
                                                {item.recipient
                                                    ? `Gửi riêng: ${item.recipient.name || 'Nhân viên'}`
                                                    : item.targetRole === 'ALL_STAFF'
                                                    ? 'Toàn bộ nhân viên'
                                                    : item.targetRole === 'CHEF'
                                                    ? 'Bộ phận Bếp'
                                                    : item.targetRole === 'STAFF'
                                                    ? 'Bộ phận Phục vụ'
                                                    : item.targetRole}
                                            </span>
                                            <span>{formatTime(item.createdAt)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </section>
    );
}
