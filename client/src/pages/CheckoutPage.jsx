import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserPoints } from '../store/userSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import Axios from '../utils/Axios';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import Loading from '../components/Loading';
import { useGlobalContext } from '../provider/GlobalProvider';
import Divider from '../components/Divider';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BestVoucherSuggestion from '../components/BestVoucherSuggestion';

const CheckoutPage = () => {
    const dispatch = useDispatch();
    const { reloadAfterPayment } = useGlobalContext();
    const [showConfirmModal, setShowConfirmModal] = useState({
        show: false,
        type: '',
    });
    const addressList = useSelector((state) => state.addresses.addressList);
    const [selectAddress, setSelectAddress] = useState(0);
    const cartItemsList = useSelector((state) => state.cartItem.cart);
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [usePoints, setUsePoints] = useState(false);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [maxPointsToUse, setMaxPointsToUse] = useState(0);
    const [showVouchers, setShowVouchers] = useState(false);
    const [selectedVouchers, setSelectedVouchers] = useState({
        regular: null,
    });
    const userPoints = useSelector((state) => state.user.rewardsPoint || 0);
    const user = useSelector((state) => state.user);
    const pointsValue = 100; // 1 point = 100 VND

    const [availableVouchers, setAvailableVouchers] = useState({
        active: [],
        upcoming: [],
    });
    const [loadingVouchers, setLoadingVouchers] = useState(false);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherError, setVoucherError] = useState('');

    // Best voucher suggestion
    const [bestVoucher, setBestVoucher] = useState(null);
    const [loadingBestVoucher, setLoadingBestVoucher] = useState(false);
    const [showBestVoucherSuggestion, setShowBestVoucherSuggestion] =
        useState(false);

    // Calculate total order amount
    const calculateTotal = useCallback(() => {
        return selectedItems.reduce((total, itemId) => {
            const cartItem = cartItemsList.find(
                (cartItem) => cartItem._id === itemId
            );
            if (cartItem) {
                const product = cartItem.productId;
                const quantity = cartItem.quantity;
                const price =
                    product.discountPrice > 0
                        ? product.discountPrice
                        : product.price;
                return total + price * quantity;
            }
            return total;
        }, 0);
    }, [selectedItems, cartItemsList]);

    // Fetch available vouchers
    useEffect(() => {
        const fetchAvailableVouchers = async () => {
            try {
                setLoadingVouchers(true);
                let discountedTotal = 0;
                const cartItemsData = [];
                const productIds = [];

                for (const itemId of selectedItems) {
                    const cartItem = cartItemsList.find(
                        (ci) => ci._id === itemId
                    );
                    if (!cartItem) continue;

                    const product = cartItem.productId;
                    if (!product) continue;

                    const price = pricewithDiscount(
                        product.price,
                        product.discount || 0
                    );
                    const itemTotal = price * cartItem.quantity;
                    discountedTotal += itemTotal;

                    cartItemsData.push({
                        productId: product,
                        quantity: cartItem.quantity,
                    });

                    if (product._id) {
                        productIds.push(product._id);
                    }
                }

                const response = await Axios.post(
                    SummaryApi.get_available_vouchers.url,
                    {
                        orderAmount: discountedTotal,
                        productIds,
                        cartItems: cartItemsData,
                        userId: user?._id,
                    }
                );

                if (response.data.success) {
                    const now = new Date();
                    // Separate vouchers into active and upcoming
                    const allVouchers = response.data.data || [];
                    const activeVouchers = [];
                    const upcomingVouchers = [];

                    allVouchers.forEach((voucher) => {
                        const startDate = new Date(voucher.startDate || 0);
                        if (startDate <= now) {
                            activeVouchers.push(voucher);
                        } else {
                            upcomingVouchers.push(voucher);
                        }
                    });

                    // Sort vouchers: first-time customer vouchers first
                    activeVouchers.sort((a, b) => {
                        if (a.isFirstTimeCustomer && !b.isFirstTimeCustomer)
                            return -1;
                        if (!a.isFirstTimeCustomer && b.isFirstTimeCustomer)
                            return 1;
                        return 0;
                    });

                    upcomingVouchers.sort((a, b) => {
                        if (a.isFirstTimeCustomer && !b.isFirstTimeCustomer)
                            return -1;
                        if (!a.isFirstTimeCustomer && b.isFirstTimeCustomer)
                            return 1;
                        return 0;
                    });

                    // Store both active and upcoming vouchers in state
                    setAvailableVouchers({
                        active: activeVouchers,
                        upcoming: upcomingVouchers,
                    });
                } else {
                    console.error('Vouchers API error:', response.data);
                    toast.error(
                        response.data.message ||
                            'Không thể tải danh sách voucher'
                    );
                }
            } catch (error) {
                console.error('Lỗi khi tải voucher:', error);
                toast.error(
                    'Có lỗi xảy ra khi tải danh sách voucher: ' +
                        (error.response?.data?.message || error.message)
                );
            } finally {
                setLoadingVouchers(false);
            }
        };

        if (selectedItems.length > 0) {
            fetchAvailableVouchers();
        } else {
            setAvailableVouchers([]);
        }
    }, [selectedItems, cartItemsList, calculateTotal, user?._id]);

    // Fetch best voucher suggestion
    const fetchBestVoucher = useCallback(async () => {
        if (selectedItems.length === 0) {
            setBestVoucher(null);
            setShowBestVoucherSuggestion(false);
            return;
        }

        try {
            setLoadingBestVoucher(true);
            let discountedTotal = 0;
            const cartItemsData = [];
            const productIds = [];

            for (const itemId of selectedItems) {
                const cartItem = cartItemsList.find((ci) => ci._id === itemId);
                if (!cartItem) continue;

                const product = cartItem.productId;
                if (!product) continue;

                const price = pricewithDiscount(
                    product.price,
                    product.discount || 0
                );
                const itemTotal = price * cartItem.quantity;
                discountedTotal += itemTotal;

                cartItemsData.push({
                    productId: product,
                    quantity: cartItem.quantity,
                });

                if (product._id) {
                    productIds.push(product._id);
                }
            }

            const response = await Axios.post(SummaryApi.get_best_voucher.url, {
                orderAmount: discountedTotal,
                productIds,
                cartItems: cartItemsData,
                userId: user?._id,
            });

            if (response.data.success) {
                const { bestCombination } = response.data.data;

                // Only show suggestion if there's a best voucher and it's not already applied
                if (bestCombination && bestCombination.totalSavings > 0) {
                    const isAlreadyApplied =
                        bestCombination.regular &&
                        selectedVouchers.regular?.code ===
                            bestCombination.regular.code;

                    if (!isAlreadyApplied) {
                        setBestVoucher(response.data.data);
                        setShowBestVoucherSuggestion(true);
                    } else {
                        setShowBestVoucherSuggestion(false);
                    }
                } else {
                    setBestVoucher(null);
                    setShowBestVoucherSuggestion(false);
                }
            }
        } catch (error) {
            console.error('Lỗi khi tải best voucher:', error);
        } finally {
            setLoadingBestVoucher(false);
        }
    }, [selectedItems, cartItemsList, user._id, selectedVouchers]);

    // Fetch best voucher when items change
    useEffect(() => {
        fetchBestVoucher();
    }, [fetchBestVoucher]);

    useEffect(() => {
        if (addressList.length > 0) {
            const defaultIndex = addressList.findIndex(
                (addr) => addr.isDefault === true
            );
            setSelectAddress(defaultIndex >= 0 ? defaultIndex : 0);
        }
    }, [addressList]);

    useEffect(() => {
        if (location.state?.selectedItems) {
            setSelectedItems(location.state.selectedItems);
            const selectedProductIds = cartItemsList
                .filter((item) =>
                    location.state.selectedItems.includes(item._id)
                )
                .map((item) => item.productId._id);

            if (selectedProductIds.length > 0) {
                localStorage.setItem(
                    'checkoutSelectedItems',
                    JSON.stringify(selectedProductIds)
                );
            }
        } else {
            setSelectedItems(cartItemsList.map((item) => item._id));
            localStorage.removeItem('checkoutSelectedItems');
        }
    }, [location.state, cartItemsList]);

    const filteredItems = cartItemsList.filter((item) =>
        selectedItems.includes(item._id)
    );

    const filteredTotalPrice = filteredItems.reduce(
        (acc, item) =>
            acc +
            (item.productId?.price || 0) *
                (item.quantity || 1) *
                (1 - (item.productId?.discount || 0) / 100),
        0
    );

    // Handle apply voucher
    const handleApplyVoucher = async () => {
        if (!voucherCode.trim()) {
            setVoucherError('Vui lòng nhập mã giảm giá');
            return;
        }

        try {
            setLoadingVouchers(true);
            setVoucherError('');

            const response = await Axios.post(SummaryApi.apply_voucher.url, {
                code: voucherCode.trim(),
                orderAmount: calculateTotal(),
                productIds: filteredItems.map((item) => item.productId._id),
                userId: user?._id,
            });

            if (response.data.success) {
                const voucher = response.data.data;
                // Ensure voucher has all required fields
                const formattedVoucher = {
                    ...voucher, // Spread the voucher data from API first
                    code: voucher.code || voucherCode.trim(),
                    name: voucher.name || 'Mã giảm giá',
                    // Use discountValue if available, otherwise fallback to discount
                    discountValue: Number(
                        voucher.discountValue || voucher.discount || 0
                    ),
                    discountType: voucher.discountType || 'fixed',
                    isFreeShipping: voucher.isFreeShipping || false,
                    calculatedDiscount: Number(voucher.calculatedDiscount) || 0,
                    maxDiscount: Number(voucher.maxDiscount) || 0,
                    // Ensure discount is set for backward compatibility
                    discount: Number(
                        voucher.discount || voucher.discountValue || 0
                    ),
                };

                setSelectedVouchers((prev) => ({
                    ...prev,
                    regular: formattedVoucher,
                }));
                setVoucherCode(''); // Clear input after successful application
                toast.success('Áp dụng mã giảm giá thành công');
            } else {
                setVoucherError(
                    response.data.message || 'Mã giảm giá không hợp lệ'
                );
            }
        } catch (error) {
            console.error('Lỗi khi áp dụng mã giảm giá:', error);
            setVoucherError(
                error.response?.data?.message ||
                    'Có lỗi xảy ra khi áp dụng mã giảm giá'
            );
        } finally {
            setLoadingVouchers(false);
        }
    };

    // Cleanup cart after payment
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (sessionId && filteredItems.length > 0) {
            const hasSelectedItems =
                location.state?.selectedItems &&
                Array.isArray(location.state.selectedItems);
            const isPartialCheckout =
                hasSelectedItems &&
                location.state.selectedItems.length < cartItemsList.length;

            if (isPartialCheckout) {
                const selectedProductIds = filteredItems.map(
                    (item) => item.productId._id
                );
                setTimeout(() => {
                    reloadAfterPayment(selectedProductIds);
                }, 2000);
            } else {
                setTimeout(() => {
                    reloadAfterPayment(null);
                }, 2000);
            }
        }
    }, [
        reloadAfterPayment,
        filteredItems,
        cartItemsList.length,
        location.state,
    ]);

    useEffect(() => {
        // Maximum 20% discount from points (changed from 50%)
        const maxPoints = Math.min(
            Math.floor((filteredTotalPrice * 0.2) / pointsValue),
            userPoints
        );
        setMaxPointsToUse(maxPoints);
    }, [filteredTotalPrice, userPoints, pointsValue]);

    useEffect(() => {
        if (pointsToUse > maxPointsToUse) {
            setPointsToUse(maxPointsToUse);
        }
    }, [pointsToUse, maxPointsToUse]);

    const calculateVoucherDiscount = useCallback(() => {
        let totalDiscount = 0;

        // Calculate regular voucher discount if any
        if (selectedVouchers.regular) {
            const { discountType, discount, maxDiscount, discountValue } =
                selectedVouchers.regular;
            const discountVal = Number(
                discount !== undefined && discount !== null
                    ? discount
                    : (discountValue || 0)
            );
            const maxDiscountValue = Number(maxDiscount) || 0;

            if (discountType === 'percentage') {
                const discountAmount =
                    (filteredTotalPrice * discountVal) / 100;
                totalDiscount +=
                    maxDiscountValue > 0
                        ? Math.min(discountAmount, maxDiscountValue)
                        : discountAmount;
            } else if (discountType === 'fixed') {
                totalDiscount += Math.min(discountVal, filteredTotalPrice);
            }
        }

        return totalDiscount;
    }, [selectedVouchers, filteredTotalPrice]);

    const handleSelectVoucher = useCallback((voucher) => {
        setSelectedVouchers((prev) => {
            const voucherType = 'regular';

            // Create a new vouchers object first
            const newVouchers = { ...prev };

            // If clicking the same voucher, deselect it
            if (
                prev[voucherType]?.id === voucher.id ||
                prev[voucherType]?._id === voucher._id
            ) {
                newVouchers[voucherType] = null;
                toast.success('Đã bỏ chọn mã giảm giá');
                return newVouchers;
            }

            // Otherwise, select the new voucher with normalized discount fields
            const formattedVoucher = {
                ...voucher,
                discount: Number(
                    voucher.discount !== undefined && voucher.discount !== null
                        ? voucher.discount
                        : (voucher.discountValue || 0)
                ),
                discountValue: Number(
                    voucher.discountValue !== undefined && voucher.discountValue !== null
                        ? voucher.discountValue
                        : (voucher.discount || 0)
                ),
            };
            newVouchers[voucherType] = formattedVoucher;

            // Show success message
            const displayDiscount = formattedVoucher.discount;
            if (formattedVoucher.discountType === 'percentage') {
                toast.success(
                    `Áp dụng giảm giá ${displayDiscount}% thành công!`
                );
            } else if (formattedVoucher.discountType === 'fixed') {
                toast.success(
                    `Áp dụng giảm giá ${DisplayPriceInVND(
                        displayDiscount || 0
                    )} thành công!`
                );
            }

            setShowVouchers(false);
            return newVouchers;
        });
    }, []);

    const removeVoucher = useCallback((voucherType) => {
        setSelectedVouchers((prev) => ({
            ...prev,
            [voucherType]: null,
        }));
        toast.success('Đã xóa mã giảm giá');
    }, []);

    const voucherDiscount = calculateVoucherDiscount();
    const pointsDiscount = usePoints ? pointsToUse * pointsValue : 0;
    const finalTotal = Math.max(
        0,
        filteredTotalPrice - pointsDiscount - voucherDiscount
    );

    const filteredNotDiscountTotalPrice = filteredItems.reduce(
        (acc, item) =>
            acc + (item.productId?.price || 0) * (item.quantity || 1),
        0
    );

    const filteredTotalQty = filteredItems.reduce(
        (acc, item) => acc + (item.quantity || 1),
        0
    );

    const handleCashOnDelivery = async () => {
        if (orderType === 'pre_order') {
            // Validate customer contact for pre-orders
            if (
                !customerContact.name ||
                !customerContact.email ||
                !customerContact.phone
            ) {
                toast.error('Vui lòng điền đầy đủ thông tin liên hệ.');
                return;
            }
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerContact.email)) {
                toast.error('Email không hợp lệ.');
                return;
            }
        }

        if (orderType === 'dine_in' && !tableNumber) {
            toast.error('Vui lòng chọn bàn.');
            return;
        }

        if (usePoints && pointsToUse > 0 && pointsToUse > userPoints) {
            toast.error('Số điểm sử dụng vượt quá số điểm hiện có');
            return;
        }
        setShowConfirmModal({ show: true, type: 'cash' });
    };

    const confirmCashOnDelivery = async () => {
        try {
            // Maximum 20% discount from points (changed from 50%)
            const maxPointsAllowed = Math.floor(
                (filteredTotalPrice * 0.2) / 100
            );
            const actualPointsToUse = usePoints
                ? Math.min(pointsToUse, maxPointsAllowed)
                : 0;

            setLoading(true);
            // Format product data to ensure it's serializable
            const formattedItems = filteredItems.map((item) => ({
                ...item,
                productId: {
                    _id: item.productId._id,
                    name: item.productId.name,
                    price: item.productId.price,
                    discount: item.productId.discount || 0,
                    // Ensure image is a single URL string, not an object or array
                    image: Array.isArray(item.productId.image)
                        ? item.productId.image[0]
                        : typeof item.productId.image === 'string'
                        ? item.productId.image
                        : '',
                    category: item.productId.category,
                },
                quantity: item.quantity,
            }));

            const response = await Axios({
                ...SummaryApi.cash_on_delivery_order,
                data: {
                    list_items: formattedItems,
                    addressId:
                        orderType === 'pre_order' && addressList[selectAddress]
                            ? addressList[selectAddress]?._id
                            : null,
                    customerContact:
                        orderType === 'pre_order' && !addressList[selectAddress]
                            ? customerContact
                            : null,
                    subTotalAmt: filteredTotalPrice,
                    totalAmt: finalTotal,
                    pointsToUse: actualPointsToUse,
                    voucherCode: selectedVouchers.regular?.code || '',
                    orderType: orderType,
                    tableNumber: orderType === 'dine_in' ? tableNumber : null,
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(responseData.message);
                try {
                    const userResponse = await Axios({
                        ...SummaryApi.user_details,
                    });
                    if (userResponse.data.success) {
                        dispatch(
                            updateUserPoints(
                                userResponse.data.data.rewardsPoint || 0
                            )
                        );
                    }
                } catch (error) {
                    console.error('Error fetching user points:', error);
                }
                navigate('/success', { state: { text: 'Order' } });
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || 'Có lỗi xảy ra khi đặt hàng'
            );
        } finally {
            setLoading(false);
            setShowConfirmModal({ show: false, type: '' });
        }
    };

    const handleOnlinePayment = async () => {
        if (orderType === 'pre_order') {
            // Validate customer contact for pre-orders
            if (
                !customerContact.name ||
                !customerContact.email ||
                !customerContact.phone
            ) {
                toast.error('Vui lòng điền đầy đủ thông tin liên hệ.');
                return;
            }
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerContact.email)) {
                toast.error('Email không hợp lệ.');
                return;
            }
        }

        if (orderType === 'dine_in' && !tableNumber) {
            toast.error('Vui lòng chọn bàn.');
            return;
        }

        if (usePoints && pointsToUse > 0 && pointsToUse > userPoints) {
            toast.error('Số điểm sử dụng vượt quá số điểm hiện có');
            return;
        }

        setShowConfirmModal({ show: true, type: 'online' });
    };

    const executeOnlinePayment = async () => {
        try {
            // Maximum 20% discount from points (changed from 50%)
            const maxPointsAllowed = Math.floor(
                (filteredTotalPrice * 0.2) / 100
            );
            const actualPointsToUse = usePoints
                ? Math.min(pointsToUse, maxPointsAllowed, userPoints)
                : 0;

            setLoading(true);
            // Format product data to ensure it's serializable
            const formattedItems = filteredItems.map((item) => ({
                ...item,
                productId: {
                    _id: item.productId._id,
                    name: item.productId.name,
                    price: item.productId.price,
                    discount: item.productId.discount || 0,
                    // Ensure image is a single URL string, not an object or array
                    image: Array.isArray(item.productId.image)
                        ? item.productId.image[0]
                        : typeof item.productId.image === 'string'
                        ? item.productId.image
                        : '',
                    category: item.productId.category,
                },
                quantity: item.quantity,
            }));

            // Convert amounts to integers (VND doesn't use decimals)
            const amountInVND = Math.round(finalTotal);

            // Validate amount is within application limits
            if (amountInVND > 99999999) {
                // 99,999,999 VND is the max limit
                throw new Error(
                    'Số tiền thanh toán vượt quá giới hạn cho phép (99,999,999 VND)'
                );
            }
            if (amountInVND < 1000) {
                // Minimum amount in VND
                throw new Error('Số tiền thanh toán tối thiểu là 1,000 VND');
            }

            const response = await Axios({
                ...SummaryApi.payment_url,
                data: {
                    list_items: formattedItems,
                    addressId:
                        orderType === 'pre_order' && addressList[selectAddress]
                            ? addressList[selectAddress]?._id
                            : null,
                    customerContact:
                        orderType === 'pre_order' && !addressList[selectAddress]
                            ? customerContact
                            : null,
                    subTotalAmt: filteredTotalPrice,
                    totalAmt: amountInVND, // Send the rounded amount
                    pointsToUse: actualPointsToUse,
                    voucherCode: selectedVouchers.regular?.code || '',
                    orderType: orderType,
                    tableNumber: orderType === 'dine_in' ? tableNumber : null,
                },
            });

            const { data: responseData } = response;

            if (responseData.isFreeOrder) {
                toast.success(responseData.message);
                navigate('/success', { state: { text: 'Order' } });
            } else if (responseData.url) {
                window.location.href = responseData.url;
            } else {
                toast.error('Không khởi tạo được phiên thanh toán');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Thanh toán thất bại');
        } finally {
            setLoading(false);
            setShowConfirmModal({ show: false, type: '' });
        }
    };

    const hasDiscount = cartItemsList
        .filter((item) => selectedItems.includes(item._id))
        .some((item) => item.productId?.discount > 0);

    const [orderType, setOrderType] = useState('dine_in');
    const [tableNumber, setTableNumber] = useState('');
    const [customerContact, setCustomerContact] = useState({
        name: '',
        email: '',
        phone: '',
    });
    const [availableTables, setAvailableTables] = useState([]);
    const [loadingTables, setLoadingTables] = useState(false);

    // Auto-fill contact form with user data when component mounts or user changes
    useEffect(() => {
        if (user && user._id) {
            setCustomerContact({
                name: user.name || '',
                email: user.email || '',
                phone: user.mobile || '',
            });
        }
    }, [user]);

    // Fetch available tables when orderType is dine_in
    useEffect(() => {
        const fetchAvailableTables = async () => {
            if (orderType === 'dine_in') {
                try {
                    setLoadingTables(true);
                    const response = await Axios({
                        ...SummaryApi.get_available_tables,
                    });
                    if (response.data.success) {
                        setAvailableTables(response.data.data || []);
                    }
                } catch (error) {
                    console.error('Error fetching tables:', error);
                    toast.error('Không thể tải danh sách bàn');
                } finally {
                    setLoadingTables(false);
                }
            }
        };

        fetchAvailableTables();
    }, [orderType]);

    return (
        <section className="container mx-auto min-h-[80vh] px-4 py-6 text-foreground">
            {/* Header */}
            <Card className="py-5 px-6 mb-6 flex flex-row items-center justify-between gap-4 border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-0">
                    <CardTitle className="text-xl sm:text-2xl text-highlight font-bold uppercase tracking-wide">
                        Thanh toán đơn hàng
                    </CardTitle>
                </CardHeader>
            </Card>
            <div className="h-full flex flex-col lg:flex-row w-full gap-5 liquid-glass shadow-xs rounded-2xl sm:p-5 p-3 border border-border/70">
                <div className="w-full flex flex-col gap-3">
                    {/* Order Type Selection */}
                    <div className="liquid-glass p-4 rounded-xl mb-4 border border-border/60">
                        <h3 className="sm:text-lg text-sm font-bold mb-3">
                            Loại đơn hàng
                        </h3>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="radio"
                                    name="orderType"
                                    value="dine_in"
                                    checked={orderType === 'dine_in'}
                                    onChange={(e) =>
                                        setOrderType(e.target.value)
                                    }
                                    className="accent-primary w-4 h-4 cursor-pointer"
                                />
                                <span className="font-medium text-sm">Tại bàn</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="radio"
                                    name="orderType"
                                    value="takeaway"
                                    checked={orderType === 'takeaway'}
                                    onChange={(e) =>
                                        setOrderType(e.target.value)
                                    }
                                    className="accent-primary w-4 h-4 cursor-pointer"
                                />
                                <span className="font-medium text-sm">Mang về</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="radio"
                                    name="orderType"
                                    value="pre_order"
                                    checked={orderType === 'pre_order'}
                                    onChange={(e) =>
                                        setOrderType(e.target.value)
                                    }
                                    className="accent-primary w-4 h-4 cursor-pointer"
                                />
                                <span className="font-medium text-sm">Đặt trước online</span>
                            </label>
                        </div>

                        {/* Table Selection for Dine-in */}
                        {orderType === 'dine_in' && (
                            <div className="mt-4">
                                <label className="block mb-2 font-semibold">
                                    Chọn bàn:{' '}
                                    <span className="text-rose-500">*</span>
                                </label>
                                {loadingTables ? (
                                    <div className="w-full p-2 rounded bg-white/10 border border-gray-500 text-muted-foreground">
                                        Đang tải danh sách bàn...
                                    </div>
                                ) : availableTables.length === 0 ? (
                                    <div className="w-full p-2 rounded bg-white/10 border border-red-500 text-red-400">
                                        Hiện không có bàn trống
                                    </div>
                                ) : (
                                    <select
                                        value={tableNumber}
                                        onChange={(e) =>
                                            setTableNumber(e.target.value)
                                        }
                                        className="w-full p-2.5 rounded-xl bg-card border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm font-medium"
                                    >
                                        <option
                                            value=""
                                            className="bg-card text-foreground"
                                        >
                                            -- Chọn bàn --
                                        </option>
                                        {availableTables.map((table) => (
                                            <option
                                                key={table._id}
                                                value={table.tableNumber}
                                                className="bg-card text-foreground"
                                            >
                                                {table.tableNumber} -{' '}
                                                {table.capacity} người
                                                {table.location
                                                    ? ` (${table.location})`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Customer Contact Form - Only for Pre-order */}
                    {orderType === 'pre_order' && (
                        <>
                            <h3 className="sm:text-lg text-sm font-bold">
                                Thông tin liên hệ
                            </h3>
                            <Divider />

                            <div className="liquid-glass rounded-xl p-4 space-y-4 border border-border/60">
                                <div>
                                    <label className="block mb-2 font-semibold text-sm">
                                        Họ và tên:{' '}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={customerContact.name}
                                        onChange={(e) =>
                                            setCustomerContact((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                            }))
                                        }
                                        placeholder="Nhập họ và tên của bạn"
                                        className="w-full p-2.5 rounded-xl bg-card border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold text-sm">
                                        Email:{' '}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={customerContact.email}
                                        onChange={(e) =>
                                            setCustomerContact((prev) => ({
                                                ...prev,
                                                email: e.target.value,
                                            }))
                                        }
                                        placeholder="Nhập email của bạn"
                                        className="w-full p-2.5 rounded-xl bg-card border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-semibold text-sm">
                                        Số điện thoại:{' '}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={customerContact.phone}
                                        onChange={(e) =>
                                            setCustomerContact((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                        placeholder="Nhập số điện thoại của bạn"
                                        className="w-full p-2.5 rounded-xl bg-card border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="w-full liquid-glass flex flex-col gap-3 shadow-xs px-3 sm:px-4 pt-3 pb-5 rounded-2xl border border-border/70">
                    <h3 className="sm:text-lg text-sm font-bold px-1 py-2">
                        Đơn hàng
                    </h3>
                    <div className="liquid-glass-2 rounded-xl sm:px-4 px-2 py-3 grid gap-3 border border-border/60">
                        <div>
                            <h3 className="font-bold sm:text-base text-sm text-primary py-1">
                                Danh sách sản phẩm
                            </h3>
                            {filteredItems.length === 0 ? (
                                <p className="text-foreground">Giỏ hàng trống</p>
                            ) : (
                                filteredItems.map((item) => {
                                    const product = item.productId || {};
                                    const name =
                                        product.name ||
                                        'Sản phẩm không xác định';
                                    // Get the first available image from the product
                                    const getProductImage = (product) => {
                                        try {
                                            // If product.image is an array, get the first image
                                            if (
                                                Array.isArray(product.image) &&
                                                product.image.length > 0
                                            ) {
                                                return product.image[0];
                                            }
                                            // If it's a string, use it directly
                                            if (
                                                typeof product.image ===
                                                    'string' &&
                                                product.image
                                            ) {
                                                return product.image;
                                            }
                                            // If image is in product.images array
                                            if (
                                                Array.isArray(product.images) &&
                                                product.images.length > 0
                                            ) {
                                                return product.images[0];
                                            }
                                            // Fallback to placeholder
                                            return '/placeholder-image.jpg';
                                        } catch (error) {
                                            console.error(
                                                'Error getting product image:',
                                                error
                                            );
                                            return '/placeholder-image.jpg';
                                        }
                                    };

                                    // Format the image URL
                                    const formatImageUrl = (imagePath) => {
                                        if (!imagePath)
                                            return '/placeholder-image.jpg';

                                        // If it's already a full URL or data URL, return as is
                                        if (
                                            typeof imagePath === 'string' &&
                                            (imagePath.startsWith('http') ||
                                                imagePath.startsWith(
                                                    'data:image'
                                                ) ||
                                                imagePath.startsWith('blob:') ||
                                                imagePath.startsWith('https:'))
                                        ) {
                                            return imagePath;
                                        }

                                        // If it's a relative path, ensure it starts with a slash
                                        const cleanPath =
                                            String(imagePath).trim();
                                        return cleanPath.startsWith('/')
                                            ? cleanPath
                                            : `/${cleanPath}`;
                                    };

                                    const image = formatImageUrl(
                                        getProductImage(product)
                                    );
                                    const price = product.price || 0;
                                    const discount = product.discount || 0;
                                    const quantity = item.quantity || 1;
                                    const finalPrice =
                                        price * quantity * (1 - discount / 100);

                                    return (
                                        <div
                                            key={item._id}
                                            className="flex gap-3.5 items-center mb-3 p-3 bg-background/60 border border-border/70 rounded-xl shadow-2xs"
                                        >
                                            <div className="sm:w-16 sm:h-16 w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden border border-border/80">
                                                <img
                                                    src={image}
                                                    alt={name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        if (
                                                            e.target.src !==
                                                            '/placeholder-image.jpg'
                                                        ) {
                                                            e.target.src =
                                                                '/placeholder-image.jpg';
                                                        }
                                                    }}
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col sm:gap-0 gap-1">
                                                <p className="font-medium sm:text-base text-xs">
                                                    {name}
                                                </p>
                                                <p className="sm:text-sm text-xs">
                                                    Số lượng: {quantity}
                                                </p>
                                                <p className="sm:text-sm text-xs flex items-center gap-2 text-foreground">
                                                    Giá:{' '}
                                                    {DisplayPriceInVND(
                                                        finalPrice
                                                    )}
                                                    {discount > 0 && (
                                                        <span className="line-through text-muted-foreground">
                                                            {DisplayPriceInVND(
                                                                price * quantity
                                                            )}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="flex flex-col sm:gap-2 gap-3 sm:text-base text-xs">
                            <h3 className="font-semibold text-red-darker">
                                Chi tiết hóa đơn
                            </h3>
                            <div className="px-4 flex flex-col gap-2">
                                <div className="flex gap-4 justify-between">
                                    <p>Tổng sản phẩm</p>
                                    <p className="flex sm:flex-row flex-col items-center sm:gap-2 gap-[1px]">
                                        {hasDiscount > 0 && (
                                            <span className="line-through text-muted-foreground">
                                                {DisplayPriceInVND(
                                                    filteredNotDiscountTotalPrice
                                                )}
                                            </span>
                                        )}
                                        <span className="text-red-darker font-bold">
                                            {DisplayPriceInVND(
                                                filteredTotalPrice
                                            )}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex gap-4 justify-between">
                                    <p>Số lượng</p>
                                    <p className="flex items-center gap-2">
                                        {filteredTotalQty} sản phẩm
                                    </p>
                                </div>
                            </div>
                            <div>
                                {/* Voucher Section */}
                                <div className="border-t border-gray-200 pt-4 mt-2 flex flex-col gap-2">
                                    {/* Voucher Code Input */}
                                    <div className="">
                                        <div className="flex gap-2 py-1">
                                            <div className="flex-1 relative">
                                                <Input
                                                    type="text"
                                                    placeholder="Nhập mã giảm giá"
                                                    className="h-10 bg-black/20"
                                                    spellCheck={false}
                                                    value={voucherCode}
                                                    onChange={(e) =>
                                                        setVoucherCode(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                                {voucherCode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVoucherCode('');
                                                            setVoucherError('');
                                                        }}
                                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-600 hover:opacity-80"
                                                    >
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleApplyVoucher}
                                                className="px-4 h-10 bg-primary text-primary-foreground sm:text-sm text-xs font-semibold rounded-xl hover:bg-primary/90
                                            focus:outline-none focus:ring-2 focus:ring-primary/30 whitespace-nowrap shadow-xs transition-colors"
                                            >
                                                Áp dụng
                                            </button>
                                        </div>
                                        {voucherError && (
                                            <p className="text-red-400 text-xs font-semibold px-[2px] pt-2">
                                                {voucherError}
                                            </p>
                                        )}
                                    </div>

                                    {/* Regular Voucher */}
                                    {selectedVouchers.regular && (
                                        <div className="mb-2 p-3 rounded-md border bg-black/50 border-pink-300 sm:text-sm text-[10px]">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-rose-300">
                                                            {
                                                                selectedVouchers
                                                                    .regular
                                                                    .code
                                                            }
                                                        </p>
                                                    </div>
                                                    <p className="mt-1  font-semibold">
                                                        {
                                                            selectedVouchers
                                                                .regular.name
                                                        }
                                                    </p>
                                                    <div className="mt-1">
                                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-pink-200 text-pink-800">
                                                            <svg
                                                                className="mr-1.5 h-3 w-3 mb-[2px]"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                            {selectedVouchers.regular.discountType === 'percentage'
                                                                ? `Giảm ${selectedVouchers.regular.discount !== undefined && selectedVouchers.regular.discount !== null ? selectedVouchers.regular.discount : selectedVouchers.regular.discountValue}%`
                                                                : `Giảm ${DisplayPriceInVND(
                                                                      selectedVouchers.regular.discount !== undefined && selectedVouchers.regular.discount !== null
                                                                          ? selectedVouchers.regular.discount
                                                                          : (selectedVouchers.regular.discountValue || 0)
                                                                  )}`}
                                                            {selectedVouchers
                                                                .regular
                                                                .maxDiscount >
                                                                0 &&
                                                                ` (tối đa ${DisplayPriceInVND(
                                                                    selectedVouchers
                                                                        .regular
                                                                        .maxDiscount
                                                                )})`}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeVoucher('regular')
                                                    }
                                                    className="text-destructive hover:opacity-80 transition-opacity"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="sm:h-5 sm:w-5 h-[14px] w-[14px]"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M6 18L18 6M6 6l12 12"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show voucher selection button if not both vouchers are selected */}
                                    {!selectedVouchers.regular ? (
                                        <div
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() =>
                                                setShowVouchers(!showVouchers)
                                            }
                                        >
                                            <div className="flex items-center gap-2 text-sm py-4">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-5 w-5 text-green-600"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M15 5v2m0 4v2m0 4v2m5-11h2m0 4h-2m0 4h-2m-6 2a1 1 0 11-2 0 1 1 0 012 0zM7 7a1 1 0 11-2 0 1 1 0 012 0z"
                                                    />
                                                </svg>
                                                <p className="flex items-center gap-1 sm:text-sm text-xs font-semibold">
                                                    Chọn hoặc nhập mã giảm giá
                                                </p>
                                                {availableVouchers.active
                                                    ?.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {availableVouchers
                                                            .active?.length >
                                                            0 && (
                                                            <span className="sm:text-xs text-[10px] bg-green-100 text-green-800 px-1.5 sm:py-0.5 rounded-full">
                                                                {
                                                                    availableVouchers
                                                                        .active
                                                                        .length
                                                                }{' '}
                                                                mã khả dụng
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div
                                                className={`transition-transform ${
                                                    showVouchers
                                                        ? 'rotate-180'
                                                        : ''
                                                }`}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="h-4 w-4 text-secondary-200 mb-1"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                {showVouchers && (
                                    <div className="space-y-4 max-h-96 overflow-y-auto sm:p-2 text-foreground">
                                        {loadingVouchers ? (
                                            <div className="flex justify-center py-4">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 sm:text-sm text-xs">
                                                {/* Active Vouchers */}
                                                {availableVouchers.active
                                                    ?.length > 0 && (
                                                    <div>
                                                        <p className="font-semibold text-primary mb-2 text-sm">
                                                            Mã khả dụng (
                                                            {
                                                                availableVouchers
                                                                    .active
                                                                    .length
                                                            }
                                                            )
                                                        </p>

                                                        <div className="flex flex-col gap-4">
                                                            {/* Regular Vouchers */}
                                                            {availableVouchers
                                                                .active.length >
                                                                0 && (
                                                                <div>
                                                                    <p className="font-medium text-rose-300 mb-2">
                                                                        <i className="fas fa-tag mr-3"></i>
                                                                        Mã giảm
                                                                        giá (
                                                                        {
                                                                            availableVouchers
                                                                                .active
                                                                                .length
                                                                        }
                                                                        )
                                                                    </p>
                                                                    <div className="space-y-2 pl-2 border-l-[3px] border-pink-400">
                                                                        {availableVouchers.active.map(
                                                                            (
                                                                                voucher
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        voucher.id
                                                                                    }
                                                                                    className={`p-3 border rounded-lg cursor-pointer liquid-glass transition-colors ${
                                                                                        selectedVouchers
                                                                                            .regular
                                                                                            ?.id ===
                                                                                        voucher.id
                                                                                            ? 'border-pink-500 bg-pink-50'
                                                                                            : voucher.isFirstTimeCustomer
                                                                                            ? 'border-blue-400 bg-blue-50 hover:border-blue-500 shadow-md'
                                                                                            : 'border-gray-200 hover:border-pink-300'
                                                                                    }`}
                                                                                    onClick={() =>
                                                                                        handleSelectVoucher(
                                                                                            voucher
                                                                                        )
                                                                                    }
                                                                                    title={
                                                                                        voucher.description
                                                                                    }
                                                                                >
                                                                                    <div className="flex justify-between items-start sm:text-sm text-[10px]">
                                                                                        <div>
                                                                                            <div className="font-bold text-rose-300">
                                                                                                {
                                                                                                    voucher.code
                                                                                                }
                                                                                            </div>
                                                                                            <p className="">
                                                                                                {
                                                                                                    voucher.name
                                                                                                }
                                                                                                {voucher.isFirstTimeCustomer && (
                                                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm animate-pulse">
                                                                                                        ✨
                                                                                                        Khách
                                                                                                        mới
                                                                                                    </span>
                                                                                                )}
                                                                                            </p>
                                                                                            <div className="">
                                                                                                <p className="flex gap-1">
                                                                                                    Đơn
                                                                                                    tối
                                                                                                    thiểu:{' '}
                                                                                                    <p className="font-medium text-rose-300">
                                                                                                        {DisplayPriceInVND(
                                                                                                            voucher.minOrder ||
                                                                                                                voucher.minOrderValue ||
                                                                                                                0
                                                                                                        )}
                                                                                                    </p>
                                                                                                </p>
                                                                                                <div className="flex items-center gap-1">
                                                                                                    <svg
                                                                                                        className="w-3 h-3 mb-[2px]"
                                                                                                        fill="none"
                                                                                                        stroke="currentColor"
                                                                                                        viewBox="0 0 24 24"
                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                    >
                                                                                                        <path
                                                                                                            strokeLinecap="round"
                                                                                                            strokeLinejoin="round"
                                                                                                            strokeWidth={
                                                                                                                2
                                                                                                            }
                                                                                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                                                        />
                                                                                                    </svg>
                                                                                                    <span>
                                                                                                        HSD:{' '}
                                                                                                        {
                                                                                                            voucher.expiryDate
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-right sm:text-sm text-[9px]">
                                                                                            <span className="text-rose-300 font-semibold">
                                                                                                {voucher.discountType ===
                                                                                                'percentage'
                                                                                                    ? `Giảm ${voucher.discount}%`
                                                                                                    : `Giảm ${DisplayPriceInVND(
                                                                                                          voucher.discount
                                                                                                      )}`}
                                                                                            </span>
                                                                                            {voucher.maxDiscount && (
                                                                                                <p className="text-rose-400 font-medium">
                                                                                                    Tối
                                                                                                    đa{' '}
                                                                                                    {DisplayPriceInVND(
                                                                                                        voucher.maxDiscount
                                                                                                    )}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Upcoming Vouchers */}
                                                <div className="sm:text-sm text-xs">
                                                    {availableVouchers.upcoming
                                                        .length > 0 && (
                                                        <p className="font-bold text-secondary-200 mt-6 mb-2">
                                                            Mã sắp diễn ra (
                                                            {
                                                                availableVouchers
                                                                    .upcoming
                                                                    .length
                                                            }
                                                            )
                                                        </p>
                                                    )}
                                                    <div className="flex flex-col gap-4">
                                                        {availableVouchers.upcoming.filter(
                                                            (v) =>
                                                                v.isUpcoming &&
                                                                v.isFreeShipping
                                                        ).length > 0 && (
                                                            <div>
                                                                <p className="font-medium text-blue-200 mb-2">
                                                                    <i className="fas fa-shipping-fast mr-3"></i>
                                                                    Mã miễn phí
                                                                    vận chuyển (
                                                                    {
                                                                        availableVouchers.upcoming.filter(
                                                                            (
                                                                                v
                                                                            ) =>
                                                                                v.isUpcoming &&
                                                                                v.isFreeShipping
                                                                        ).length
                                                                    }
                                                                    )
                                                                </p>
                                                                <div className="space-y-2 pl-2 border-l-[3px] border-blue-400">
                                                                    {availableVouchers.upcoming
                                                                        .filter(
                                                                            (
                                                                                voucher
                                                                            ) =>
                                                                                voucher.isUpcoming &&
                                                                                voucher.isFreeShipping
                                                                        )
                                                                        .map(
                                                                            (
                                                                                voucher
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        voucher.id
                                                                                    }
                                                                                    className="p-3 border border-blue-400 rounded-lg liquid-glass-header opacity-75 cursor-not-allowed"
                                                                                >
                                                                                    <div className="sm:text-sm text-[10px]">
                                                                                        <div className="">
                                                                                            <div className="grid grid-flow-col grid-cols-[2fr_1fr] justify-between">
                                                                                                <div className="flex sm:items-center items-start sm:flex-row flex-col-reverse sm:gap-2 gap-0">
                                                                                                    <span className="font-bold text-blue-500">
                                                                                                        {
                                                                                                            voucher.code
                                                                                                        }
                                                                                                    </span>
                                                                                                    <span className="text-[8px] sm:text-xs font-semibold bg-blue-100 text-blue-600 sm:px-2 px-1 sm:py-0.5 rounded">
                                                                                                        Sắp
                                                                                                        diễn
                                                                                                        ra
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className="text-blue-200 text-right">
                                                                                                    <div className="font-semibold sm:text-sm text-[9px]">
                                                                                                        Miễn
                                                                                                        phí
                                                                                                        vận
                                                                                                        chuyển
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <p className="">
                                                                                                {
                                                                                                    voucher.name
                                                                                                }
                                                                                            </p>
                                                                                            <div className=" ">
                                                                                                <p className="flex gap-1">
                                                                                                    Đơn
                                                                                                    tối
                                                                                                    thiểu:{' '}
                                                                                                    <p className="text-blue-500 font-semibold">
                                                                                                        {DisplayPriceInVND(
                                                                                                            voucher.minOrder ||
                                                                                                                voucher.minOrderValue ||
                                                                                                                0
                                                                                                        )}
                                                                                                    </p>
                                                                                                </p>
                                                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                                                    <svg
                                                                                                        className="w-3 h-3 mb-[2px]"
                                                                                                        fill="none"
                                                                                                        stroke="currentColor"
                                                                                                        viewBox="0 0 24 24"
                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                    >
                                                                                                        <path
                                                                                                            strokeLinecap="round"
                                                                                                            strokeLinejoin="round"
                                                                                                            strokeWidth={
                                                                                                                2
                                                                                                            }
                                                                                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                                                        />
                                                                                                    </svg>
                                                                                                    <span>
                                                                                                        Bắt
                                                                                                        đầu
                                                                                                        từ:{' '}
                                                                                                        {
                                                                                                            voucher.startDate
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {availableVouchers.upcoming.filter(
                                                            (v) =>
                                                                v.isUpcoming &&
                                                                !v.isFreeShipping
                                                        ).length > 0 && (
                                                            <div className="">
                                                                <p className="font-medium text-rose-300 mb-2">
                                                                    <i className="fas fa-tag mr-3"></i>
                                                                    Mã giảm giá
                                                                    (
                                                                    {
                                                                        availableVouchers.upcoming.filter(
                                                                            (
                                                                                v
                                                                            ) =>
                                                                                v.isUpcoming &&
                                                                                !v.isFreeShipping
                                                                        ).length
                                                                    }
                                                                    )
                                                                </p>
                                                                <div className="space-y-2 pl-2 border-l-[3px] border-pink-400">
                                                                    {availableVouchers.upcoming
                                                                        .filter(
                                                                            (
                                                                                voucher
                                                                            ) =>
                                                                                voucher.isUpcoming &&
                                                                                !voucher.isFreeShipping
                                                                        )
                                                                        .map(
                                                                            (
                                                                                voucher
                                                                            ) => (
                                                                                <div
                                                                                    key={
                                                                                        voucher.id
                                                                                    }
                                                                                    className="p-3 border border-gray-200 rounded-lg liquid-glass-header opacity-75 cursor-not-allowed"
                                                                                >
                                                                                    <div className="sm:text-sm text-[10px]">
                                                                                        <div className="grid grid-flow-col grid-cols-[2fr_1fr] justify-between">
                                                                                            <div className="flex sm:items-center items-start sm:flex-row flex-col-reverse sm:gap-2 gap-0">
                                                                                                <span className="font-bold text-rose-300">
                                                                                                    {
                                                                                                        voucher.code
                                                                                                    }
                                                                                                </span>
                                                                                                <span className="text-[8px] sm:text-xs font-semibold bg-pink-100 text-rose-600 sm:px-2 px-1 sm:py-0.5 rounded">
                                                                                                    Sắp
                                                                                                    diễn
                                                                                                    ra
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="text-rose-300 sm:text-sm text-[9px] flex flex-col items-end w-full">
                                                                                                <div className="text-rose-300 font-semibold">
                                                                                                    {voucher.discountType ===
                                                                                                    'percentage'
                                                                                                        ? `Giảm ${voucher.discount}%`
                                                                                                        : `Giảm ${DisplayPriceInVND(
                                                                                                              voucher.discount
                                                                                                          )}`}
                                                                                                </div>
                                                                                                {voucher.maxDiscount && (
                                                                                                    <p className="text-rose-400 font-medium">
                                                                                                        Tối
                                                                                                        đa{' '}
                                                                                                        {DisplayPriceInVND(
                                                                                                            voucher.maxDiscount
                                                                                                        )}
                                                                                                    </p>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <p className="">
                                                                                            {
                                                                                                voucher.name
                                                                                            }
                                                                                        </p>
                                                                                        <div className="">
                                                                                            <p className="flex gap-1">
                                                                                                Đơn
                                                                                                tối
                                                                                                thiểu:{' '}
                                                                                                <p className="font-medium text-rose-300">
                                                                                                    {DisplayPriceInVND(
                                                                                                        voucher.minOrder ||
                                                                                                            voucher.minOrderValue ||
                                                                                                            0
                                                                                                    )}
                                                                                                </p>
                                                                                            </p>
                                                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                                                <svg
                                                                                                    className="w-3 h-3 mb-[2px]"
                                                                                                    fill="none"
                                                                                                    stroke="currentColor"
                                                                                                    viewBox="0 0 24 24"
                                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                                >
                                                                                                    <path
                                                                                                        strokeLinecap="round"
                                                                                                        strokeLinejoin="round"
                                                                                                        strokeWidth={
                                                                                                            2
                                                                                                        }
                                                                                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                                                    />
                                                                                                </svg>
                                                                                                <span>
                                                                                                    Bắt
                                                                                                    đầu
                                                                                                    từ:{' '}
                                                                                                    {
                                                                                                        voucher.startDate
                                                                                                    }
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* No Vouchers Message */}
                                        {availableVouchers.active?.length ===
                                            0 &&
                                            availableVouchers.upcoming
                                                ?.length === 0 && (
                                                <p className="text-sm  text-center py-4">
                                                    Không có mã giảm giá khả
                                                    dụng
                                                </p>
                                            )}
                                    </div>
                                )}
                                {userPoints > 0 && (
                                    <div className="border-t border-gray-200 pt-4">
                                        <div className="flex sm:items-center sm:flex-row flex-col gap-3 justify-between">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="usePoints"
                                                    checked={usePoints}
                                                    onChange={(e) => {
                                                        setUsePoints(
                                                            e.target.checked
                                                        );
                                                        if (!e.target.checked) {
                                                            setPointsToUse(0);
                                                        } else {
                                                            setPointsToUse(
                                                                maxPointsToUse
                                                            );
                                                        }
                                                    }}
                                                    className="sm:h-4 sm:w-4 w-3 h-3 rounded border-gray-300 text-primary-2 focus:ring-primary-2 cursor-pointer"
                                                />
                                                <label
                                                    htmlFor="usePoints"
                                                    className="sm:text-sm font-medium px-2 cursor-pointer hover:opacity-80"
                                                >
                                                    Sử dụng điểm thưởng
                                                </label>
                                            </div>
                                            <div className="sm:text-sm text-xs flex flex-col sm:items-end gap-1 select-none">
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <span>Có sẵn:</span>
                                                    <span className="font-bold text-primary">
                                                        {userPoints.toLocaleString()}
                                                    </span>
                                                    <span>điểm (~</span>
                                                    <span className="font-bold text-primary">
                                                        {DisplayPriceInVND(
                                                            userPoints *
                                                                pointsValue
                                                        )}
                                                    </span>
                                                    <span>)</span>
                                                </div>
                                                <p className="text-xs italic">
                                                    Bạn chỉ được dùng tối đa 20%
                                                    giá trị đơn hàng
                                                </p>
                                            </div>
                                        </div>
                                        {usePoints && (
                                            <div className="pt-3 sm:text-sm text-xs">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={maxPointsToUse}
                                                        value={pointsToUse}
                                                        onChange={(e) =>
                                                            setPointsToUse(
                                                                parseInt(
                                                                    e.target
                                                                        .value
                                                                )
                                                            )
                                                        }
                                                        className="h-2 w-full rounded-lg appearance-none bg-gray-200"
                                                    />
                                                </div>
                                                <div className="flex items-center sm:justify-normal justify-between py-1 gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={
                                                                pointsToUse ===
                                                                0
                                                                    ? ''
                                                                    : pointsToUse
                                                            }
                                                            onChange={(e) => {
                                                                const rawValue =
                                                                    e.target
                                                                        .value;
                                                                if (
                                                                    rawValue ===
                                                                    ''
                                                                ) {
                                                                    setPointsToUse(
                                                                        0
                                                                    );
                                                                    return;
                                                                }
                                                                if (
                                                                    /^\d+$/.test(
                                                                        rawValue
                                                                    )
                                                                ) {
                                                                    const value =
                                                                        parseInt(
                                                                            rawValue,
                                                                            10
                                                                        );
                                                                    if (
                                                                        !isNaN(
                                                                            value
                                                                        )
                                                                    ) {
                                                                        setPointsToUse(
                                                                            Math.min(
                                                                                Math.max(
                                                                                    0,
                                                                                    value
                                                                                ),
                                                                                maxPointsToUse
                                                                            )
                                                                        );
                                                                    }
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                const value =
                                                                    parseInt(
                                                                        e.target
                                                                            .value
                                                                    ) || 0;
                                                                setPointsToUse(
                                                                    Math.min(
                                                                        Math.max(
                                                                            0,
                                                                            value
                                                                        ),
                                                                        maxPointsToUse
                                                                    )
                                                                );
                                                            }}
                                                            className="sm:w-24 w-20 font-medium text-right bg-black/15"
                                                            aria-label="Số điểm sử dụng"
                                                            placeholder="0"
                                                        />
                                                        <span className="flex gap-1">
                                                            điểm (tối đa:{' '}
                                                            <p className="font-semibold text-primary">
                                                                {maxPointsToUse.toLocaleString()}
                                                            </p>
                                                            )
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setPointsToUse(
                                                                maxPointsToUse
                                                            )
                                                        }
                                                        disabled={
                                                            pointsToUse ===
                                                            maxPointsToUse
                                                        }
                                                        className={`px-2 py-1 font-semibold text-xs rounded-lg transition-colors ${
                                                            pointsToUse ===
                                                            maxPointsToUse
                                                                ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                                                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                        }`}
                                                    >
                                                        Dùng tối đa
                                                    </button>
                                                </div>
                                                <div className="mt-[6px] font-semibold flex gap-1 text-xs sm:text-sm">
                                                    Giảm:{' '}
                                                    <p className="text-primary font-bold">
                                                        {DisplayPriceInVND(
                                                            pointsToUse *
                                                                pointsValue
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <Divider />
                            <div className="flex justify-between sm:text-sm text-xs">
                                <p>Tạm tính:</p>
                                <p>{DisplayPriceInVND(filteredTotalPrice)}</p>
                            </div>

                            {selectedVouchers && voucherDiscount > 0 && (
                                <div className="flex justify-between sm:text-sm text-xs">
                                    <p className="">Giảm giá:</p>
                                    <p className="text-primary font-semibold">
                                        -{DisplayPriceInVND(voucherDiscount)}
                                    </p>
                                </div>
                            )}

                            {usePoints && pointsToUse > 0 && (
                                <div className="flex justify-between sm:text-sm text-xs text-primary">
                                    <p className="flex">
                                        Điểm tích lũy (
                                        <span className="font-semibold px-1">
                                            {pointsToUse}
                                        </span>
                                        điểm):
                                    </p>
                                    <p className="font-semibold">
                                        -
                                        {DisplayPriceInVND(
                                            pointsToUse * pointsValue
                                        )}
                                    </p>
                                </div>
                            )}
                            <div
                                className="font-semibold flex items-center justify-between gap-4 border-t border-border pt-3
                            mt-2 text-foreground"
                            >
                                <p className="font-bold sm:text-base text-sm">Tổng cộng:</p>
                                <p className="text-primary font-bold sm:text-xl text-lg">
                                    {DisplayPriceInVND(finalTotal)}
                                </p>
                            </div>
                        </div>

                        <div className="w-full flex flex-col gap-3 sm:text-sm text-xs mb-3">
                            {usePoints && pointsToUse > 0 && (
                                <div className="liquid-glass p-3 rounded-xl border border-border/60">
                                    <p className="text-foreground flex">
                                        Sử dụng{' '}
                                        <span className="font-bold px-1 text-primary">
                                            {pointsToUse.toLocaleString()}
                                        </span>
                                        điểm cho đơn hàng này.
                                    </p>
                                    <p className="text-muted-foreground mt-1 flex gap-1">
                                        Điểm còn lại:
                                        <span className="font-bold text-foreground">
                                            {(
                                                userPoints - pointsToUse
                                            ).toLocaleString()}
                                        </span>
                                        điểm
                                    </p>
                                </div>
                            )}

                            {/* Best Voucher Suggestion */}
                            {showBestVoucherSuggestion && bestVoucher && (
                                <BestVoucherSuggestion
                                    bestVoucher={bestVoucher}
                                    selectedVouchers={selectedVouchers}
                                    setSelectedVouchers={setSelectedVouchers}
                                    onDismiss={() =>
                                        setShowBestVoucherSuggestion(false)
                                    }
                                />
                            )}

                            <GlareHover
                                glareColor="#ffffff"
                                glareOpacity={0.3}
                                glareAngle={-30}
                                glareSize={300}
                                transitionDuration={800}
                                playOnce={false}
                            >
                                <Button
                                    className="py-2 px-4 rounded shadow-md font-semibold text-white hover:bg-transparent w-full"
                                    onClick={handleOnlinePayment}
                                >
                                    {loading ? (
                                        <Loading />
                                    ) : (
                                        'Thanh toán online'
                                    )}
                                </Button>
                            </GlareHover>

                            {orderType !== 'pre_order' && (
                                <GlareHover
                                    glareColor="#ffffff"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                >
                                    <Button
                                        className="py-2 px-4 font-semibold text-white hover:bg-transparent rounded transition-all w-full"
                                        onClick={handleCashOnDelivery}
                                    >
                                        Thanh toán tiền mặt
                                    </Button>
                                </GlareHover>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {showConfirmModal.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
                    <div className="p-6 rounded-2xl shadow-xl max-w-md w-full liquid-glass border border-border">
                        <h3 className="sm:text-lg text-base font-bold mb-4 text-primary">
                            Xác nhận đặt hàng
                        </h3>
                        <p className=" mb-6 text-sm">
                            Bạn có chắc chắn muốn đặt hàng với phương thức{' '}
                            {showConfirmModal.type === 'cash'
                                ? 'thanh toán tiền mặt'
                                : 'thanh toán online'}{' '}
                            không?
                        </p>
                        <div className="flex justify-end gap-4 text-sm">
                            <div>
                                <GlareHover
                                    background="transparent"
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                    className="flex-1"
                                >
                                    <Button
                                        className="bg-white/40 hover:bg-white/50 text-white"
                                        onClick={
                                            {
                                                cash: confirmCashOnDelivery,
                                                online: executeOnlinePayment,
                                            }[showConfirmModal.type] ||
                                            (() => {})
                                        }
                                        disabled={loading}
                                    >
                                        {loading ? <Loading /> : 'Xác nhận'}
                                    </Button>
                                </GlareHover>
                            </div>

                            <div>
                                <GlareHover
                                    glareOpacity={0.3}
                                    glareAngle={-30}
                                    glareSize={300}
                                    transitionDuration={800}
                                    playOnce={false}
                                    className="flex-1"
                                >
                                    <Button
                                        className="hover:bg-transparent text-white"
                                        onClick={() =>
                                            setShowConfirmModal({
                                                show: false,
                                                type: '',
                                            })
                                        }
                                    >
                                        Hủy
                                    </Button>
                                </GlareHover>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default CheckoutPage;
