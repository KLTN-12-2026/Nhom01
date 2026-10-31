import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import SummaryApi from '../common/SummaryApi';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@radix-ui/react-label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import GlareHover from '@/components/GlareHover';
import Loading from '@/components/Loading';
import Divider from '@/components/Divider';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';
import { DisplayPriceInVND } from '@/utils/DisplayPriceInVND';
import { pricewithDiscount } from '@/utils/PriceWithDiscount';

const BookingWithPreOrderPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [availableTables, setAvailableTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [cart, setCart] = useState([]);

    const user = useSelector((state) => state.user);

    // Step 1: Booking Info
    const [bookingData, setBookingData] = useState({
        customerName: '',
        phone: '',
        email: '',
        numberOfGuests: '',
        bookingDate: '',
        bookingTime: '',
        tableId: '',
        specialRequests: '',
    });

    // Auto-fill user data
    useEffect(() => {
        if (user?._id) {
            setBookingData((prev) => ({
                ...prev,
                customerName: user.name || '',
                email: user.email || '',
                phone: user.mobile || '',
            }));
        }
    }, [user]);

    // Time slots
    const timeSlots = [
        '18:00',
        '18:30',
        '19:00',
        '19:30',
        '20:00',
        '20:30',
        '21:00',
        '21:30',
        '22:00',
    ];

    const handleBookingChange = (e) => {
        const { name, value } = e.target;
        setBookingData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSelectChange = (name, value) => {
        setBookingData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Fetch available tables
    const fetchAvailableTables = useCallback(async () => {
        if (
            !bookingData.bookingDate ||
            !bookingData.bookingTime ||
            !bookingData.numberOfGuests
        ) {
            setAvailableTables([]);
            return;
        }

        try {
            setLoadingTables(true);
            const response = await Axios({
                ...SummaryApi.get_available_tables_for_booking,
                data: {
                    bookingDate: bookingData.bookingDate,
                    bookingTime: bookingData.bookingTime,
                    numberOfGuests: parseInt(bookingData.numberOfGuests),
                },
            });

            if (response.data.success) {
                setAvailableTables(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching tables:', error);
            toast.error('Không thể tải danh sách bàn');
        } finally {
            setLoadingTables(false);
        }
    }, [
        bookingData.bookingDate,
        bookingData.bookingTime,
        bookingData.numberOfGuests,
    ]);

    useEffect(() => {
        fetchAvailableTables();
    }, [fetchAvailableTables]);

    // Fetch products for menu
    const fetchProducts = useCallback(async () => {
        try {
            setLoadingProducts(true);
            const response = await Axios({
                ...SummaryApi.get_product,
                data: {
                    page: 1,
                    limit: 100,
                },
            });

            if (response.data.success) {
                setProducts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Không thể tải danh sách món ăn');
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    useEffect(() => {
        if (currentStep === 2) {
            fetchProducts();
        }
    }, [currentStep, fetchProducts]);

    // Cart functions
    const addToCart = (product) => {
        if (product.stock <= 0) {
            toast.error('Sản phẩm đã hết hàng');
            return;
        }

        const existingItem = cart.find(
            (item) => item.productId === product._id
        );
        if (existingItem) {
            if (existingItem.quantity + 1 > product.stock) {
                toast.error(`Chỉ còn ${product.stock} sản phẩm trong kho`);
                return;
            }
            setCart(
                cart.map((item) =>
                    item.productId === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setCart([
                ...cart,
                {
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    discount: product.discount || 0,
                    image: Array.isArray(product.image)
                        ? product.image[0]
                        : product.image,
                    quantity: 1,
                    stock: product.stock, // Add stock to cart item for later checks
                },
            ]);
        }
        toast.success(`Đã thêm ${product.name} vào giỏ`);
    };

    const updateQuantity = (productId, change) => {
        const item = cart.find((i) => i.productId === productId);
        if (!item) return;

        const newQuantity = item.quantity + change;

        if (change > 0 && newQuantity > item.stock) {
            toast.error(`Chỉ còn ${item.stock} sản phẩm trong kho`);
            return;
        }

        setCart(
            cart.map((item) =>
                item.productId === productId
                    ? { ...item, quantity: Math.max(1, newQuantity) }
                    : item
            )
        );
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter((item) => item.productId !== productId));
        toast.info('Đã xóa món khỏi giỏ');
    };

    // Calculate totals
    const calculateTotal = () => {
        return cart.reduce((total, item) => {
            const itemPrice = pricewithDiscount(item.price, item.discount);
            return total + itemPrice * item.quantity;
        }, 0);
    };

    const depositAmount =
        bookingData.numberOfGuests > 4
            ? parseInt(bookingData.numberOfGuests) * 50000
            : 0;

    const preOrderTotal = calculateTotal();
    const totalPayment = depositAmount + preOrderTotal;

    // Step validation
    const validateStep1 = () => {
        if (
            !bookingData.customerName ||
            !bookingData.phone ||
            !bookingData.numberOfGuests ||
            !bookingData.bookingDate ||
            !bookingData.bookingTime ||
            !bookingData.tableId
        ) {
            toast.error('Vui lòng điền đầy đủ thông tin đặt bàn');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (cart.length === 0) {
            toast.error('Vui lòng chọn ít nhất một món ăn');
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        setCurrentStep(currentStep - 1);
    };

    // Submit booking with pre-order
    const handleSubmit = async () => {
        try {
            setLoading(true);

            const preOrderItems = cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            }));

            const response = await Axios({
                ...SummaryApi.create_booking_with_preorder,
                data: {
                    ...bookingData,
                    numberOfGuests: parseInt(bookingData.numberOfGuests),
                    preOrderItems,
                    depositAmount,
                    userId: user?._id || null,
                },
            });

            if (response.data.success) {
                const { booking, order } = response.data.data;

                // Create payment session
                const paymentResponse = await Axios({
                    ...SummaryApi.create_preorder_payment_session,
                    data: {
                        bookingId: booking._id,
                        orderId: order._id,
                    },
                });

                if (paymentResponse.data && paymentResponse.data.data) {
                    window.location.href = paymentResponse.data.data.url;
                }
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    // Step indicator
    const steps = [
        { number: 1, title: 'Thông tin đặt bàn' },
        { number: 2, title: 'Chọn món' },
        { number: 3, title: 'Xác nhận' },
    ];

    return (
        <section className="container mx-auto py-8 px-4 max-w-5xl">
            <Card className="mx-auto border border-border/80 bg-card rounded-2xl shadow-xs py-6">
                <CardHeader>
                    <CardTitle className="text-2xl text-highlight font-bold text-center">
                        Đặt bàn & Đặt món trước
                    </CardTitle>
                    <CardDescription className="text-center">
                        Đặt bàn và chọn món ăn trước để tiết kiệm thời gian
                    </CardDescription>

                    {/* Step Indicator */}
                    <div className="flex justify-center items-center gap-4 my-6">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.number}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs ${
                                            currentStep >= step.number
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {step.number}
                                    </div>
                                    <span className="text-xs mt-1 text-center hidden sm:block font-medium">
                                        {step.title}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`h-1 w-16 rounded-full ${
                                            currentStep > step.number
                                                ? 'bg-primary'
                                                : 'bg-muted'
                                        }`}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Step 1: Booking Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-4">
                                    Thông tin khách hàng
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customerName">
                                            Họ và tên{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="text"
                                            id="customerName"
                                            name="customerName"
                                            value={bookingData.customerName}
                                            onChange={handleBookingChange}
                                            className="h-12"
                                            placeholder="Nguyễn Văn A"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">
                                            Số điện thoại{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={bookingData.phone}
                                            onChange={handleBookingChange}
                                            className="h-12"
                                            placeholder="0912345678"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={bookingData.email}
                                            onChange={handleBookingChange}
                                            className="h-12"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Divider />

                            <div>
                                <h3 className="font-semibold text-lg mb-4">
                                    Thông tin đặt bàn
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="numberOfGuests">
                                            Số người{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="number"
                                            id="numberOfGuests"
                                            name="numberOfGuests"
                                            min="1"
                                            value={bookingData.numberOfGuests}
                                            onChange={handleBookingChange}
                                            className="h-12"
                                            placeholder="Số người"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bookingDate">
                                            Ngày đặt{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            type="date"
                                            id="bookingDate"
                                            name="bookingDate"
                                            min={today}
                                            value={bookingData.bookingDate}
                                            onChange={handleBookingChange}
                                            className="h-12"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bookingTime">
                                            Giờ đặt{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={bookingData.bookingTime}
                                            onValueChange={(value) =>
                                                handleSelectChange(
                                                    'bookingTime',
                                                    value
                                                )
                                            }
                                            required
                                        >
                                            <SelectTrigger className="w-full h-12">
                                                <SelectValue placeholder="Chọn giờ" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeSlots.map((time) => (
                                                    <SelectItem
                                                        key={time}
                                                        value={time}
                                                    >
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tableId">
                                            Chọn bàn{' '}
                                            <span className="text-red-500">
                                                *
                                            </span>
                                        </Label>
                                        <Select
                                            value={bookingData.tableId}
                                            onValueChange={(value) =>
                                                handleSelectChange(
                                                    'tableId',
                                                    value
                                                )
                                            }
                                            disabled={
                                                !bookingData.bookingDate ||
                                                !bookingData.bookingTime ||
                                                !bookingData.numberOfGuests ||
                                                loadingTables
                                            }
                                            required
                                        >
                                            <SelectTrigger className="w-full h-12">
                                                <SelectValue
                                                    placeholder={
                                                        loadingTables
                                                            ? 'Đang tải...'
                                                            : !bookingData.bookingDate ||
                                                              !bookingData.bookingTime ||
                                                              !bookingData.numberOfGuests
                                                            ? 'Chọn ngày, giờ và số người trước'
                                                            : availableTables.length ===
                                                              0
                                                            ? 'Không có bàn trống'
                                                            : 'Chọn bàn'
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableTables.map(
                                                    (table) => (
                                                        <SelectItem
                                                            key={table._id}
                                                            value={table._id}
                                                        >
                                                            Bàn{' '}
                                                            {table.tableNumber}{' '}
                                                            - {table.capacity}{' '}
                                                            người
                                                            {table.location &&
                                                                ` (${table.location})`}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Divider />

                            <div className="space-y-2">
                                <Label htmlFor="specialRequests">
                                    Yêu cầu đặc biệt
                                </Label>
                                <Textarea
                                    id="specialRequests"
                                    name="specialRequests"
                                    value={bookingData.specialRequests}
                                    onChange={handleBookingChange}
                                    rows={4}
                                    className="resize-none"
                                    placeholder="Ví dụ: Cần ghế em bé, vị trí gần cửa sổ, ..."
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <GlareHover>
                                    <Button
                                        onClick={handleNext}
                                        className="bg-foreground px-12 h-12"
                                    >
                                        Tiếp theo
                                    </Button>
                                </GlareHover>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Menu Selection */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-4">
                                    Chọn món ăn ({cart.length} món)
                                </h3>

                                {/* Cart Summary */}
                                {cart.length > 0 && (
                                    <div className="bg-foreground/10 p-4 rounded-lg mb-4">
                                        <h4 className="font-semibold mb-2">
                                            Giỏ hàng
                                        </h4>
                                        <div className="space-y-2">
                                            {cart.map((item) => (
                                                <div
                                                    key={item.productId}
                                                    className="flex items-center justify-between text-sm"
                                                >
                                                    <span>
                                                        {item.name} x
                                                        {item.quantity}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">
                                                            {DisplayPriceInVND(
                                                                pricewithDiscount(
                                                                    item.price,
                                                                    item.discount
                                                                ) *
                                                                    item.quantity
                                                            )}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.productId,
                                                                    -1
                                                                )
                                                            }
                                                        >
                                                            <FaMinus className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.productId,
                                                                    1
                                                                )
                                                            }
                                                        >
                                                            <FaPlus className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                removeFromCart(
                                                                    item.productId
                                                                )
                                                            }
                                                        >
                                                            <FaTrash className="w-3 h-3 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <Divider />
                                            <div className="flex justify-between font-bold">
                                                <span>Tổng cộng:</span>
                                                <span>
                                                    {DisplayPriceInVND(
                                                        preOrderTotal
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Product List */}
                                {loadingProducts ? (
                                    <div className="flex justify-center py-8">
                                        <Loading />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                        {products.map((product) => (
                                            <Card
                                                key={product._id}
                                                className="hover:shadow-lg transition-shadow"
                                            >
                                                <CardContent className="p-4">
                                                    <div className="relative">
                                                        <img
                                                            src={
                                                                Array.isArray(
                                                                    product.image
                                                                )
                                                                    ? product
                                                                          .image[0]
                                                                    : product.image
                                                            }
                                                            alt={product.name}
                                                            className="w-full h-32 object-cover rounded mb-2"
                                                        />
                                                        {product.stock <= 0 && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                                                                <span className="text-white font-bold bg-red-500 px-2 py-1 rounded text-sm">
                                                                    Hết hàng
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-semibold text-sm mb-1">
                                                        {product.name}
                                                    </h4>
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            {product.discount >
                                                            0 ? (
                                                                <div>
                                                                    <span className="text-xs line-through text-muted-foreground">
                                                                        {DisplayPriceInVND(
                                                                            product.price
                                                                        )}
                                                                    </span>
                                                                    <p className="font-bold text-primary">
                                                                        {DisplayPriceInVND(
                                                                            pricewithDiscount(
                                                                                product.price,
                                                                                product.discount
                                                                            )
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <p className="font-bold text-primary">
                                                                    {DisplayPriceInVND(
                                                                        product.price
                                                                    )}
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-muted-foreground font-semibold mt-1">
                                                                Kho:{' '}
                                                                {product.stock}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() =>
                                                                addToCart(
                                                                    product
                                                                )
                                                            }
                                                            disabled={
                                                                product.stock <=
                                                                0
                                                            }
                                                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs"
                                                        >
                                                            <FaPlus />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button onClick={handleBack} variant="outline">
                                    Quay lại
                                </Button>
                                <GlareHover>
                                    <Button
                                        onClick={handleNext}
                                        className="bg-foreground px-12 h-12"
                                    >
                                        Tiếp theo
                                    </Button>
                                </GlareHover>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Confirm */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-4">
                                    Xác nhận thông tin
                                </h3>

                                {/* Booking Info */}
                                <div className="bg-foreground/10 p-4 rounded-lg mb-4">
                                    <h4 className="font-semibold mb-2">
                                        Thông tin đặt bàn
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                        <p>
                                            <strong>Tên:</strong>{' '}
                                            {bookingData.customerName}
                                        </p>
                                        <p>
                                            <strong>SĐT:</strong>{' '}
                                            {bookingData.phone}
                                        </p>
                                        {bookingData.email && (
                                            <p>
                                                <strong>Email:</strong>{' '}
                                                {bookingData.email}
                                            </p>
                                        )}
                                        <p>
                                            <strong>Số người:</strong>{' '}
                                            {bookingData.numberOfGuests}
                                        </p>
                                        <p>
                                            <strong>Ngày:</strong>{' '}
                                            {bookingData.bookingDate}
                                        </p>
                                        <p>
                                            <strong>Giờ:</strong>{' '}
                                            {bookingData.bookingTime}
                                        </p>
                                        <p>
                                            <strong>Bàn:</strong>{' '}
                                            {
                                                availableTables.find(
                                                    (t) =>
                                                        t._id ===
                                                        bookingData.tableId
                                                )?.tableNumber
                                            }
                                        </p>
                                        {bookingData.specialRequests && (
                                            <p>
                                                <strong>Yêu cầu:</strong>{' '}
                                                {bookingData.specialRequests}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="bg-foreground/10 p-4 rounded-lg mb-4">
                                    <h4 className="font-semibold mb-2">
                                        Món đã chọn
                                    </h4>
                                    <div className="space-y-2">
                                        {cart.map((item) => (
                                            <div
                                                key={item.productId}
                                                className="flex justify-between text-sm"
                                            >
                                                <span>
                                                    {item.name} x{item.quantity}
                                                </span>
                                                <span className="font-semibold">
                                                    {DisplayPriceInVND(
                                                        pricewithDiscount(
                                                            item.price,
                                                            item.discount
                                                        ) * item.quantity
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Summary */}
                                <div className="liquid-glass p-4 rounded-lg">
                                    <h4 className="font-semibold mb-2">
                                        Tổng thanh toán
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                        {depositAmount > 0 && (
                                            <div className="flex justify-between">
                                                <span>
                                                    Tiền cọc (
                                                    {bookingData.numberOfGuests}{' '}
                                                    người):
                                                </span>
                                                <span>
                                                    {DisplayPriceInVND(
                                                        depositAmount
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>Tiền món ăn:</span>
                                            <span>
                                                {DisplayPriceInVND(
                                                    preOrderTotal
                                                )}
                                            </span>
                                        </div>
                                        <Divider />
                                        <div className="flex justify-between font-bold text-base">
                                            <span>Tổng cộng:</span>
                                            <span className="text-primary font-bold text-lg">
                                                {DisplayPriceInVND(
                                                    totalPayment
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-4">
                                <Button onClick={handleBack} variant="outline">
                                    Quay lại
                                </Button>
                                <GlareHover>
                                    <Button
                                        onClick={handleSubmit}
                                        className="bg-foreground px-12 h-12"
                                        disabled={loading}
                                    >
                                        {loading ? <Loading /> : 'Thanh toán'}
                                    </Button>
                                </GlareHover>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
};

export default BookingWithPreOrderPage;
