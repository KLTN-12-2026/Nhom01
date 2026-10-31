import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import {
    FiShoppingCart,
    FiLogOut,
    FiMinus,
    FiPlus,
    FiList,
} from 'react-icons/fi';
import { handleAddItemCart, clearCart } from '../store/cartProduct';

const TableMenuPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user);
    const cartItems = useSelector((state) => state.cartItem.cart);

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCart, setShowCart] = useState(false);
    const [showCurrentOrder, setShowCurrentOrder] = useState(false);
    const [tableInfo, setTableInfo] = useState(null);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Check if user is a table account
    useEffect(() => {
        // Give time for user data to load
        const timer = setTimeout(() => {
            setIsCheckingAuth(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isCheckingAuth) return; // Wait for auth check

        if (!user || user.role !== 'TABLE') {
            toast.error('Vui lòng quét mã QR tại bàn để đặt món');
            navigate('/');
            return;
        }

        // Get table session info
        fetchTableSession();
        // Get current order
        fetchCurrentOrder();
    }, [user, navigate, isCheckingAuth]);

    const fetchTableSession = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.getTableSession,
            });
            if (response.data.success) {
                setTableInfo(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching table session:', error);
        }
    };

    const fetchCurrentOrder = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_current_table_order,
            });
            if (response.data.success) {
                setCurrentOrder(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching current order:', error);
            // Don't show error toast as there might not be an order yet
        }
    };

    // In-memory cache for instant category switching (0ms delay)
    const tableProductCache = useRef(new Map());

    // Fetch categories
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_category,
            });
            if (response.data.success) {
                const cats = response.data.data || [];
                setCategories(cats);
                if (cats.length > 0) {
                    setSelectedCategory(cats[0]._id);
                    // Prefetch other categories in the background
                    setTimeout(() => {
                        cats.slice(1).forEach((c) => {
                            fetchCategoryProducts(c._id, true);
                        });
                    }, 200);
                }
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Không thể tải danh mục');
        } finally {
            setLoading(false);
        }
    };

    // Fetch products by category with cache support
    const fetchCategoryProducts = useCallback(async (catId, isSilent = false) => {
        if (!catId) return;

        if (!isSilent && !tableProductCache.current.has(catId)) {
            setLoading(true);
        }

        try {
            const response = await Axios({
                ...SummaryApi.get_product_by_category,
                data: {
                    id: catId,
                },
            });
            if (response.data.success) {
                const data = response.data.data || [];
                tableProductCache.current.set(catId, data);
                // Update products state if this is still the active category
                setSelectedCategory((currentCat) => {
                    if (currentCat === catId) {
                        setProducts(data);
                    }
                    return currentCat;
                });
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            if (!isSilent) {
                setLoading(false);
            }
        }
    }, []);

    // When selectedCategory changes, immediately use cached products (0ms) and background revalidate
    useEffect(() => {
        if (selectedCategory) {
            if (tableProductCache.current.has(selectedCategory)) {
                setProducts(tableProductCache.current.get(selectedCategory));
                fetchCategoryProducts(selectedCategory, true);
            } else {
                fetchCategoryProducts(selectedCategory, false);
            }
        }
    }, [selectedCategory, fetchCategoryProducts]);

    const handleAddToCart = async (product) => {
        try {
            const response = await Axios({
                ...SummaryApi.add_to_cart,
                data: {
                    productId: product._id,
                },
            });
            if (response.data.success) {
                toast.success('Đã thêm vào giỏ hàng');
                // Refresh cart
                fetchCart();
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Sản phẩm này đã được thêm vào giỏ hàng');
        }
    };

    const fetchCart = async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_cart_item,
            });
            if (response.data.success) {
                dispatch(handleAddItemCart(response.data.data));
            }
        } catch (error) {
            console.error('Error fetching cart:', error);
        }
    };

    const handleUpdateQuantity = async (cartItemId, newQty) => {
        if (newQty < 1) return;
        try {
            const response = await Axios({
                ...SummaryApi.update_cart_item_qty,
                data: {
                    _id: cartItemId,
                    qty: newQty,
                },
            });
            if (response.data.success) {
                fetchCart();
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            toast.error('Không thể cập nhật số lượng');
        }
    };

    const handleRemoveItem = async (cartItemId) => {
        try {
            const response = await Axios({
                ...SummaryApi.delete_cart_item,
                data: {
                    _id: cartItemId,
                },
            });
            if (response.data.success) {
                toast.success('Đã xóa khỏi giỏ hàng');
                fetchCart();
            }
        } catch (error) {
            console.error('Error removing item:', error);
            toast.error('Không thể xóa món');
        }
    };

    const handlePlaceOrder = async () => {
        if (cartItems.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        try {
            // Prepare items for table order
            const items = cartItems.map((item) => ({
                productId: item.productId._id,
                quantity: item.quantity,
            }));

            const response = await Axios({
                ...SummaryApi.add_items_to_table_order,
                data: {
                    items: items,
                    tableNumber: tableInfo?.tableNumber,
                },
            });

            if (response.data.success) {
                toast.success('Đã thêm món vào đơn!');
                dispatch(clearCart()); // Clear cart in Redux
                setShowCart(false);
                // Refresh current order
                fetchCurrentOrder();
                // Show current order
                setShowCurrentOrder(true);
            }
        } catch (error) {
            console.error('Error adding items to order:', error);
            toast.error(error.response?.data?.message || 'Không thể thêm món');
        }
    };

    const handleLogout = async () => {
        try {
            await Axios({
                ...SummaryApi.logoutTable,
            });
            toast.success('Đã đăng xuất');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const totalAmount = cartItems.reduce(
        (sum, item) => sum + (item.productId?.price || 0) * item.quantity,
        0
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-40 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {tableInfo?.tableNumber || 'Bàn'}
                        </h1>
                        <p className="text-sm opacity-90">
                            {tableInfo?.tableLocation || 'Nhà hàng lẩu'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowCurrentOrder(true)}
                            className="relative bg-white text-blue-500 p-3 rounded-full hover:bg-blue-50 transition-colors"
                            title="Xem đơn gọi món"
                        >
                            <FiList size={24} />
                            {currentOrder?.items?.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                    {currentOrder.items.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setShowCart(true)}
                            className="relative bg-white text-orange-500 p-3 rounded-full hover:bg-orange-50 transition-colors"
                            title="Giỏ hàng"
                        >
                            <FiShoppingCart size={24} />
                            {cartItems.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
                                    {cartItems.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-white text-orange-500 p-3 rounded-full hover:bg-orange-50 transition-colors"
                            title="Đăng xuất"
                        >
                            <FiLogOut size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Categories */}
            <div className="bg-white shadow-sm sticky top-[72px] z-30">
                <div className="max-w-7xl mx-auto overflow-x-auto">
                    <div className="flex gap-2 p-4">
                        {categories.map((category) => (
                            <button
                                key={category._id}
                                onClick={() =>
                                    setSelectedCategory(category._id)
                                }
                                className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                                    selectedCategory === category._id
                                        ? 'bg-orange-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="max-w-7xl mx-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <div
                            key={product._id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="aspect-square bg-gray-100">
                                {product.image && product.image[0] && (
                                    <img
                                        src={product.image[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">
                                    {product.name}
                                </h3>
                                <p className="text-orange-500 font-bold text-lg mb-2">
                                    {product.price?.toLocaleString('vi-VN')}đ
                                </p>
                                <button
                                    onClick={() => handleAddToCart(product)}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
                                >
                                    Thêm
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Sidebar */}
            {showCart && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                    onClick={() => setShowCart(false)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Cart Header */}
                            <div className="bg-orange-500 text-white p-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold">
                                        Giỏ hàng
                                    </h2>
                                    <button
                                        onClick={() => setShowCart(false)}
                                        className="text-2xl"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {cartItems.length === 0 ? (
                                    <p className="text-center text-gray-500 mt-8">
                                        Giỏ hàng trống
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {cartItems.map((item) => (
                                            <div
                                                key={item._id}
                                                className="flex gap-3 bg-gray-50 p-3 rounded-lg"
                                            >
                                                <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                    {item.productId
                                                        ?.image?.[0] && (
                                                        <img
                                                            src={
                                                                item.productId
                                                                    .image[0]
                                                            }
                                                            alt={
                                                                item.productId
                                                                    .name
                                                            }
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-800">
                                                        {item.productId?.name}
                                                    </h3>
                                                    <p className="text-orange-500 font-bold">
                                                        {item.productId?.price?.toLocaleString(
                                                            'vi-VN'
                                                        )}
                                                        đ
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateQuantity(
                                                                    item._id,
                                                                    item.quantity -
                                                                        1
                                                                )
                                                            }
                                                            className="bg-gray-500 text-white p-1 rounded"
                                                        >
                                                            <FiMinus />
                                                        </button>
                                                        <span className="font-semibold text-orange-500">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                handleUpdateQuantity(
                                                                    item._id,
                                                                    item.quantity +
                                                                        1
                                                                )
                                                            }
                                                            className="bg-gray-500 text-white p-1 rounded"
                                                        >
                                                            <FiPlus />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveItem(
                                                                    item._id
                                                                )
                                                            }
                                                            className="ml-auto text-red-500 text-sm"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cart Footer */}
                            {cartItems.length > 0 && (
                                <div className="border-t p-4 space-y-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span className="text-orange-700">
                                            Tổng cộng:
                                        </span>
                                        <span className="text-orange-500">
                                            {totalAmount.toLocaleString(
                                                'vi-VN'
                                            )}
                                            đ
                                        </span>
                                    </div>
                                    <button
                                        onClick={handlePlaceOrder}
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors"
                                    >
                                        Gọi món
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Current Order Sidebar */}
            {showCurrentOrder && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                    onClick={() => setShowCurrentOrder(false)}
                >
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col h-full">
                            {/* Order Header */}
                            <div className="bg-blue-500 text-white p-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold">
                                        Đơn gọi món của bạn
                                    </h2>
                                    <button
                                        onClick={() =>
                                            setShowCurrentOrder(false)
                                        }
                                        className="text-2xl"
                                    >
                                        &times;
                                    </button>
                                </div>
                                {currentOrder && (
                                    <p className="text-sm opacity-90 mt-1">
                                        Trạng thái:{' '}
                                        {currentOrder.status === 'pending'
                                            ? 'Đang chờ'
                                            : currentOrder.status ===
                                              'confirmed'
                                            ? 'Đã xác nhận'
                                            : currentOrder.status}
                                    </p>
                                )}
                            </div>

                            {/* Order Items */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {!currentOrder ||
                                !currentOrder.items ||
                                currentOrder.items.length === 0 ? (
                                    <div className="text-center text-gray-500 mt-8">
                                        <FiList
                                            size={48}
                                            className="mx-auto mb-4 opacity-50"
                                        />
                                        <p>Chưa có món nào trong đơn</p>
                                        <p className="text-sm mt-2">
                                            Hãy thêm món từ menu vào giỏ hàng và
                                            gọi món!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {currentOrder.items.map(
                                            (item, index) => (
                                                <div
                                                    key={index}
                                                    className="flex gap-3 bg-gray-50 p-3 rounded-lg"
                                                >
                                                    <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                                        {item.productId
                                                            ?.image?.[0] && (
                                                            <img
                                                                src={
                                                                    item
                                                                        .productId
                                                                        .image[0]
                                                                }
                                                                alt={
                                                                    item
                                                                        .productId
                                                                        .name
                                                                }
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-800">
                                                            {item.productId
                                                                ?.name ||
                                                                'Sản phẩm'}
                                                        </h3>
                                                        <p className="text-blue-500 font-bold">
                                                            {item.price?.toLocaleString(
                                                                'vi-VN'
                                                            )}
                                                            đ
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-sm text-gray-600">
                                                                Số lượng:{' '}
                                                                <span className="font-semibold">
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Thành tiền:{' '}
                                                            <span className="font-semibold text-gray-800">
                                                                {(
                                                                    (item.price ||
                                                                        0) *
                                                                    item.quantity
                                                                ).toLocaleString(
                                                                    'vi-VN'
                                                                )}
                                                                đ
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Order Footer */}
                            {currentOrder &&
                                currentOrder.items &&
                                currentOrder.items.length > 0 && (
                                    <div className="border-t p-4 space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Tổng số món:
                                                </span>
                                                <span className="font-semibold text-blue-800">
                                                    {currentOrder.items.length}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Tổng số lượng:
                                                </span>
                                                <span className="font-semibold text-blue-800">
                                                    {currentOrder.items.reduce(
                                                        (sum, item) =>
                                                            sum + item.quantity,
                                                        0
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="border-t pt-3">
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <span className="text-blue-800">
                                                    Tổng cộng:
                                                </span>
                                                <span className="text-blue-500">
                                                    {currentOrder.total?.toLocaleString(
                                                        'vi-VN'
                                                    )}
                                                    đ
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setShowCurrentOrder(false);
                                                navigate(
                                                    '/table-order-management'
                                                );
                                            }}
                                            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-semibold text-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md"
                                        >
                                            Thanh toán
                                        </button>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-800">
                                                <strong>Lưu ý:</strong> Đây là
                                                đơn gọi món tạm thời. Bạn có thể
                                                tiếp tục gọi thêm món từ menu.
                                            </p>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableMenuPage;
