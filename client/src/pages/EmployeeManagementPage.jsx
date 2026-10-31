import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import successAlert from '../utils/successAlert';
import toast from 'react-hot-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import { FaEdit, FaTrash, FaTrashRestore } from 'react-icons/fa';
import Loading from '../components/Loading';
import GlareHover from '@/components/GlareHover';
import { IoClose } from 'react-icons/io5';
import DynamicTable from '@/components/table/dynamic-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NoData from '@/components/NoData';

const EmployeeManagementPage = () => {
    const user = useSelector((state) => state.user);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('working'); // 'working' | 'resigned'

    // Filters
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL'); // For 'working' tab: ALL, active, on_leave
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        mobile: '',
        role: 'WAITER',
        position: '',
        hireDate: new Date().toISOString().split('T')[0],
        employeeStatus: 'active',
    });

    const roles = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];

    // Email validation function
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

        const validTLDs = [
            'com',
            'net',
            'org',
            'io',
            'co',
            'ai',
            'vn',
            'com.vn',
            'edu.vn',
            'gov.vn',
        ];

        if (!emailRegex.test(email)) {
            return false;
        }

        const domain = email.split('@')[1];
        const domainParts = domain.split('.');

        const isPartValid = validTLDs.some((tld) => {
            const tldParts = tld.split('.');
            const domainTLDPart = domainParts.slice(-tldParts.length).join('.');
            return domainTLDPart === tld;
        });

        if (!isPartValid) {
            return false;
        }

        if (
            email.includes('..') ||
            email.startsWith('.') ||
            email.endsWith('.') ||
            email.split('@')[0].endsWith('.')
        ) {
            return false;
        }

        return true;
    };

    // Mobile validation function
    const validateMobile = (mobile) => {
        // Vietnamese phone number validation
        // Starts with 0, followed by 9 or 1-9, then 8 more digits (total 10 digits)
        const mobileRegex = /^(0[1-9]|0[1-9][0-9]{8})$/;
        if (!mobile) {
            return false;
        }
        if (!mobileRegex.test(mobile)) {
            return false;
        }
        return true;
    };

    // Fetch all employees
    const fetchEmployees = async () => {
        try {
            setLoading(true);
            // Fetch all employees without filtering on backend to ensure client-side filtering works smoothly
            const response = await Axios({
                ...SummaryApi.get_all_employees,
                params: {
                    limit: 1000, // Ensure we get all records
                },
            });

            if (response.data.success) {
                setEmployees(response.data.data);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Create employee
    const handleCreateEmployee = async (e) => {
        e.preventDefault();

        // Validate email
        if (!validateEmail(formData.email)) {
            toast.error(
                'Email không hợp lệ. Vui lòng kiểm tra lại định dạng email.'
            );
            return;
        }

        // Validate password length
        if (formData.password && formData.password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        // Validate mobile if provided
        if (formData.mobile && !validateMobile(formData.mobile)) {
            toast.error('Số điện thoại không hợp lệ');
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.create_employee,
                data: formData,
            });

            if (response.data.success) {
                successAlert(response.data.message);
                setIsAddModalOpen(false);
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    mobile: '',
                    role: 'WAITER',
                    position: '',
                    hireDate: new Date().toISOString().split('T')[0],
                    employeeStatus: 'active',
                });
                fetchEmployees();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Update employee
    const handleUpdateEmployee = async (e) => {
        e.preventDefault();

        // Validate email
        if (!validateEmail(formData.email)) {
            toast.error(
                'Email không hợp lệ. Vui lòng kiểm tra lại định dạng email.'
            );
            return;
        }

        // Validate mobile if provided
        if (formData.mobile && !validateMobile(formData.mobile)) {
            toast.error('Số điện thoại không hợp lệ');
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.update_employee,
                url: SummaryApi.update_employee.url.replace(
                    ':id',
                    selectedEmployee._id
                ),
                data: formData,
            });

            if (response.data.success) {
                successAlert(response.data.message);
                setIsEditModalOpen(false);
                setSelectedEmployee(null);
                fetchEmployees();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Soft Delete (Move to Resigned)
    const handleSoftDelete = async (id) => {
        if (
            !window.confirm(
                'Bạn có chắc chắn muốn chuyển nhân viên này sang danh sách nghỉ việc?'
            )
        ) {
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.update_employee,
                url: SummaryApi.update_employee.url.replace(':id', id),
                data: { employeeStatus: 'inactive' },
            });

            if (response.data.success) {
                successAlert('Đã chuyển nhân viên sang danh sách nghỉ việc');
                fetchEmployees();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Hard Delete (Permanent)
    const handleHardDelete = async (id) => {
        if (
            !window.confirm(
                'CẢNH BÁO: Hành động này không thể hoàn tác! Bạn có chắc chắn muốn xóa vĩnh viễn nhân viên này?'
            )
        ) {
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.delete_employee,
                url: SummaryApi.delete_employee.url.replace(':id', id),
            });

            if (response.data.success) {
                successAlert(response.data.message);
                fetchEmployees();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Restore Employee
    const handleRestore = async (id) => {
        try {
            const response = await Axios({
                ...SummaryApi.update_employee,
                url: SummaryApi.update_employee.url.replace(':id', id),
                data: { employeeStatus: 'active' },
            });

            if (response.data.success) {
                successAlert('Đã khôi phục nhân viên');
                fetchEmployees();
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // Open edit modal
    const openEditModal = (employee) => {
        setSelectedEmployee(employee);
        setFormData({
            name: employee.name,
            email: employee.email,
            mobile: employee.mobile || '',
            role: employee.role,
            position: employee.position || '',
            hireDate: employee.hireDate
                ? new Date(employee.hireDate).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            employeeStatus: employee.employeeStatus || 'active',
        });
        setIsEditModalOpen(true);
    };

    // Column configuration for DynamicTable
    const columns = useMemo(
        () => [
            {
                key: 'employeeId',
                label: 'Mã NV',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <span className="font-mono text-xs bg-background/20 border text-highlight px-2 py-1 rounded">
                        {value || '-'}
                    </span>
                ),
            },
            {
                key: 'name',
                label: 'Tên',
                type: 'string',
                sortable: true,
            },
            {
                key: 'email',
                label: 'Email',
                type: 'string',
                sortable: true,
            },
            {
                key: 'role',
                label: 'Vai trò',
                type: 'string',
                sortable: true,
                format: (value) => (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {value}
                    </span>
                ),
            },
            {
                key: 'position',
                label: 'Vị trí',
                type: 'string',
                sortable: true,
                format: (value) => value || '-',
            },
            {
                key: 'employeeStatus',
                label: 'Trạng thái',
                type: 'string',
                sortable: true,
                format: (value) => {
                    let className = 'bg-gray-100 text-gray-800';
                    let label = 'Không xác định';

                    switch (value) {
                        case 'active':
                            className = 'bg-green-100 text-green-800';
                            label = 'Đang làm';
                            break;
                        case 'inactive':
                            className = 'bg-red-100 text-red-800';
                            label = 'Nghỉ việc';
                            break;
                        case 'on_leave':
                            className = 'bg-yellow-100 text-yellow-800';
                            label = 'Nghỉ phép';
                            break;
                    }

                    return (
                        <span
                            className={`px-2 py-1 rounded text-xs ${className}`}
                        >
                            {label}
                        </span>
                    );
                },
            },
            {
                key: 'action',
                label: 'Thao tác',
                type: 'string',
                sortable: false,
                format: (value, row) => (
                    <div className="flex gap-2">
                        {activeTab === 'working' ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditModal(row.rawData)}
                                    title="Chỉnh sửa"
                                >
                                    <FaEdit />
                                </Button>
                                {user?.role === 'MANAGER' && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            handleSoftDelete(row.rawData._id)
                                        }
                                        title="Chuyển sang nghỉ việc"
                                    >
                                        <FaTrash />
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() =>
                                        handleRestore(row.rawData._id)
                                    }
                                    title="Khôi phục"
                                >
                                    <FaTrashRestore />
                                </Button>
                                {user?.role === 'MANAGER' && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            handleHardDelete(row.rawData._id)
                                        }
                                        title="Xóa vĩnh viễn"
                                    >
                                        <FaTrash />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                ),
            },
        ],
        [user?.role, activeTab]
    );

    // Transform and Filter data for DynamicTable
    const tableData = useMemo(() => {
        let filtered = employees;

        // 1. Filter by Tab (Working vs Resigned)
        if (activeTab === 'working') {
            filtered = filtered.filter(
                (emp) => emp.employeeStatus !== 'inactive'
            );
        } else {
            filtered = filtered.filter(
                (emp) => emp.employeeStatus === 'inactive'
            );
        }

        // 2. Filter by Role
        if (filterRole !== 'ALL') {
            filtered = filtered.filter((emp) => emp.role === filterRole);
        }

        // 3. Filter by Status (only for working tab)
        if (activeTab === 'working' && filterStatus !== 'ALL') {
            filtered = filtered.filter(
                (emp) => emp.employeeStatus === filterStatus
            );
        }

        // 4. Filter by Search Term
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.trim().toLowerCase();
            filtered = filtered.filter(
                (emp) =>
                    (emp.name && emp.name.toLowerCase().includes(lowerTerm)) ||
                    (emp.email &&
                        emp.email.toLowerCase().includes(lowerTerm)) ||
                    (emp.employeeId &&
                        emp.employeeId.toLowerCase().includes(lowerTerm)) ||
                    (emp.mobile && emp.mobile.includes(lowerTerm))
            );
        }

        return filtered.map((employee, index) => ({
            id: index + 1,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            role: employee.role,
            position: employee.position,
            employeeStatus: employee.employeeStatus,
            rawData: employee,
        }));
    }, [employees, activeTab, filterRole, filterStatus, searchTerm]);

    // Reset filters
    const resetFilters = () => {
        setFilterRole('ALL');
        setFilterStatus('ALL');
        setSearchTerm('');
    };

    // Check if user has permission
    if (user?.role !== 'MANAGER') {
        return (
            <div className="container mx-auto py-8 px-4">
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-red-500">
                            Bạn không có quyền truy cập trang này
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <section className="container mx-auto grid gap-2 z-10">
            <Card className="py-6 flex-row justify-between gap-6 border-border/80 rounded-xl">
                <CardHeader>
                    <CardTitle className="text-lg text-highlight font-bold uppercase">
                        Quản lý Nhân viên
                    </CardTitle>
                    <CardDescription>
                        Quản lý thông tin nhân viên
                    </CardDescription>
                </CardHeader>

                <CardFooter>
                    <Dialog
                        open={isAddModalOpen}
                        onOpenChange={setIsAddModalOpen}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl capitalize">
                                Thêm Nhân viên
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            showCloseButton={false}
                            className="w-full max-w-2xl overflow-hidden border-foreground"
                        >
                            <DialogHeader>
                                <DialogTitle className="text-lg text-highlight font-bold uppercase">
                                    Thêm nhân viên mới
                                </DialogTitle>

                                <DialogClose asChild>
                                    <button className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted">
                                        <IoClose className="h-5 w-5" />
                                    </button>
                                </DialogClose>
                            </DialogHeader>
                            <form onSubmit={handleCreateEmployee}>
                                <CardContent className="grid grid-cols-2 gap-4 py-4 px-0 text-sm">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">
                                            Họ và tên{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">
                                            Email{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            Mật khẩu{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="password"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="mobile">
                                            Số điện thoại
                                        </Label>
                                        <Input
                                            type="tel"
                                            id="mobile"
                                            name="mobile"
                                            value={formData.mobile}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">
                                            Vai trò{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={formData.role}
                                            onValueChange={(value) =>
                                                handleSelectChange(
                                                    'role',
                                                    value
                                                )
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem
                                                        key={role}
                                                        value={role}
                                                    >
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="position">Vị trí</Label>
                                        <Input
                                            id="position"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="hireDate">
                                            Ngày vào làm
                                        </Label>
                                        <Input
                                            type="date"
                                            id="hireDate"
                                            name="hireDate"
                                            value={formData.hireDate}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </CardContent>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsAddModalOpen(false)}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-foreground"
                                    >
                                        Tạo nhân viên
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>

            {/* Tabs for Working vs Resigned */}
            <Tabs
                defaultValue="working"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
            >
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                    <TabsTrigger value="working">Đang làm việc</TabsTrigger>
                    <TabsTrigger value="resigned">Đã nghỉ việc</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <Card className="p-6">
                <div
                    className={`grid grid-cols-1 gap-6 text-sm items-end ${
                        activeTab === 'working'
                            ? 'md:grid-cols-4'
                            : 'md:grid-cols-3'
                    }`}
                >
                    <div className="space-y-2">
                        <Label>Tìm kiếm</Label>
                        <Input
                            placeholder="Tên, email, mã nhân viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Vai trò</Label>
                        <Select
                            value={filterRole}
                            onValueChange={setFilterRole}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Tất cả vai trò" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tất cả</SelectItem>
                                {roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {activeTab === 'working' && (
                        <div className="space-y-2">
                            <Label>Trạng thái</Label>
                            <Select
                                value={filterStatus}
                                onValueChange={setFilterStatus}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    <SelectItem value="active">
                                        Đang làm việc
                                    </SelectItem>
                                    <SelectItem value="on_leave">
                                        Nghỉ phép
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        onClick={resetFilters}
                        className="w-full"
                    >
                        Đặt lại
                    </Button>
                </div>
            </Card>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loading />
                </div>
            ) : (
                <>
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
                        <NoData message="Không có nhân viên" />
                    )}
                </>
            )}

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent
                    showCloseButton={false}
                    className="w-full max-w-2xl overflow-hidden border-foreground"
                >
                    <DialogHeader>
                        <DialogTitle className="text-lg text-highlight font-bold uppercase">
                            Chỉnh Sửa Nhân Viên
                        </DialogTitle>

                        <DialogClose asChild>
                            <button className="absolute right-4 top-4 p-2 rounded-md hover:bg-muted">
                                <IoClose className="h-5 w-5" />
                            </button>
                        </DialogClose>
                    </DialogHeader>

                    <form onSubmit={handleUpdateEmployee}>
                        <CardContent className="grid grid-cols-2 gap-4 py-4 px-0 text-sm">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">
                                    Họ và tên{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-mobile">
                                    Số điện thoại
                                </Label>
                                <Input
                                    type="tel"
                                    id="edit-mobile"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">
                                    Vai trò{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) =>
                                        handleSelectChange('role', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-position">Vị trí</Label>
                                <Input
                                    id="edit-position"
                                    name="position"
                                    value={formData.position}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">
                                    Trạng thái{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={formData.employeeStatus}
                                    onValueChange={(value) =>
                                        handleSelectChange(
                                            'employeeStatus',
                                            value
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">
                                            Đang làm việc
                                        </SelectItem>
                                        <SelectItem value="on_leave">
                                            Nghỉ phép
                                        </SelectItem>
                                        <SelectItem value="inactive">
                                            Nghỉ việc
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" className="bg-foreground">
                                Cập nhật
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default EmployeeManagementPage;
