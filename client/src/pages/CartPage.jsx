import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import AddToCartButton from '../components/AddToCartButton';
import DisplayTableCart from '../components/DisplayTableCart';
import { IoClose } from 'react-icons/io5';
import { FaLongArrowAltLeft, FaRegArrowAltCircleLeft } from 'react-icons/fa';
import NoData from '../components/NoData';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import {
    handleAddItemCart,
    removeFromCart,
    removeSelectedItemsFromCart,
} from '../store/cartProduct';
import toast from 'react-hot-toast';
import { useGlobalContext } from '../provider/GlobalProvider';
import ConfirmBox from '../components/ConfirmBox';
import Loading from '../components/Loading';
import { valideURLConvert } from '../utils/valideURLConvert';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';

const CartPage = () => {
    const { cart } = useSelector((state) => state.cartItem);
    const [selectedItems, setSelectedItems] = useState([]);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const location = useLocation();
    const { fetchCartItem } = useGlobalContext();
    const [openConfirmBoxDelete, setOpenConfirmBoxDelete] = useState(false);
    const [loading, setLoading] = useState(false);
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchCartItems = async () => {
            // Không gọi API nếu user chưa đăng nhập
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken) return;

            try {
                const response = await Axios({
                    url: SummaryApi.get_cart_item.url,
                    method: SummaryApi.get_cart_item.method,
                });
                if (response.data.success) {
                    dispatch(handleAddItemCart(response.data.data));
                } else {
                    toast.error('Lỗi khi tải giỏ hàng');
                }
            } catch (error) {
                toast.error('Lỗi khi tải giỏ hàng: ' + error.message);
            }
        };

        fetchCartItems();

        const { state } = location;
        if (state?.selectedProductId && cart) {
            const productToSelect = cart.find(
                (item) => item.productId._id === state.selectedProductId
            );
            if (
                productToSelect &&
                !selectedItems.includes(productToSelect._id)
            ) {
                setSelectedItems((prev) => [...prev, productToSelect._id]);
            }
        }
    }, [dispatch, location]);

    const toggleSelect = (id) => {
        setSelectedItems((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedItems.length === cart.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(cart.map((i) => i._id));
        }
    };

    const totalPrice = cart
        .filter((item) => selectedItems.includes(item._id))
        .reduce((acc, item) => {
            const basePrice = pricewithDiscount(
                item.productId?.price || 0,
                item.productId?.discount || 0
            );
            const optionsPrice =
                item.selectedOptions?.reduce(
                    (sum, opt) => sum + (opt.priceModifier || 0),
                    0
                ) || 0;
            return acc + (basePrice + optionsPrice) * (item.quantity || 1);
        }, 0);

    const originalTotalPrice = cart
        .filter((item) => selectedItems.includes(item._id))
        .reduce(
            (acc, item) =>
                acc + (item.productId?.price || 0) * (item.quantity || 1),
            0
        );

    const hasDiscount = cart
        .filter((item) => selectedItems.includes(item._id))
        .some((item) => item.productId?.discount > 0);

    const handleRemoveItem = async (id) => {
        try {
            const response = await Axios({
                url: SummaryApi.delete_cart_item.url,
                method: SummaryApi.delete_cart_item.method,
                data: { _id: id },
            });
            if (response.data.success) {
                dispatch(removeFromCart(id));
                await fetchCartItem();
                toast.success('Đã xóa sản phẩm');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi xóa sản phẩm: ' + error.message);
        }
    };

    const handleRemoveSelectedItems = async () => {
        try {
            for (const id of selectedItems) {
                await Axios({
                    url: SummaryApi.delete_cart_item.url,
                    method: SummaryApi.delete_cart_item.method,
                    data: { _id: id },
                });
            }
            dispatch(removeSelectedItemsFromCart(selectedItems));
            setSelectedItems([]);
            await fetchCartItem();
            toast.success('Đã xóa các sản phẩm được chọn');
            setOpenConfirmBoxDelete(false);
        } catch (error) {
            toast.error('Lỗi khi xóa sản phẩm: ' + error.message);
        }
    };

    const goToCheckout = () => {
        setLoading(true);
        try {
            if (selectedItems.length === 0) {
                toast.error('Vui lòng chọn sản phẩm.');
                return;
            }
            navigate('/checkout', { state: { selectedItems } });
        } catch (error) {
            toast.error(
                'Lỗi khi chuyển đến trang thanh toán: ' + error.message
            );
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: '',
            accessorKey: 'checkbox',
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedItems.includes(row.original._id)}
                    onChange={() => toggleSelect(row.original._id)}
                    className=""
                />
            ),
            meta: { className: 'sm:w-fit max-w-[35px]' },
        },
        {
            header: 'Sản phẩm',
            accessorKey: 'productId.name',
            cell: ({ row }) => (
                <div className="flex items-center gap-2 sm:gap-4 sm:h-auto h-auto py-2">
                    <img
                        onClick={() => {
                            const product = row.original.productId;
                            const url = `/product/${valideURLConvert(
                                product.name
                            )}-${product._id}`;
                            navigate(url);
                            scrollToTop();
                        }}
                        src={row.original.productId?.image?.[0] || ''}
                        alt={row.original.productId?.name || ''}
                        className="sm:w-16 w-10 h-16 flex-shrink-0 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                        onError={(e) => {
                            e.target.src = '/placeholder-image.jpg';
                        }}
                    />
                    <div className="flex flex-col gap-1 w-full">
                        <p className="font-semibold w-full line-clamp-2">
                            {row.original.productId?.name ||
                                'Tên không xác định'}
                        </p>
                        {/* Display Options */}
                        {row.original.selectedOptions &&
                            row.original.selectedOptions.length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    {row.original.selectedOptions.map(
                                        (opt, idx) => (
                                            <span key={idx} className="block">
                                                {opt.optionName}:{' '}
                                                {opt.choiceName}
                                                {opt.priceModifier > 0 &&
                                                    ` (+${DisplayPriceInVND(
                                                        opt.priceModifier
                                                    )})`}
                                            </span>
                                        )
                                    )}
                                </div>
                            )}
                        {/* Display Notes */}
                        {row.original.notes && (
                            <p className="text-xs text-muted-foreground italic">
                                Ghi chú: {row.original.notes}
                            </p>
                        )}
                    </div>
                </div>
            ),
            meta: { className: 'text-left max-w-48' },
        },
        {
            header: 'Đơn vị',
            accessorKey: 'productId.unit',
            cell: ({ row }) => (
                <p className="font-semibold w-full line-clamp-1">
                    {row.original.productId?.unit || ''}
                </p>
            ),
            meta: { className: 'text-center max-w-24 hidden sm:table-cell' },
        },
        {
            header: 'Số lượng',
            accessorKey: 'quantity',
            cell: ({ row }) => (
                <div className="flex items-center justify-center mx-auto">
                    <AddToCartButton data={row.original.productId} />
                </div>
            ),
            meta: { className: 'sm:max-w-24 lg:max-w-16' },
        },
        {
            header: 'Giá',
            accessorKey: 'price',
            cell: ({ row }) => (
                <div className="lg:flex items-end gap-2 justify-center">
                    {row.original.productId?.discount > 0 && (
                        <p className="text-[10px] sm:text-base line-through">
                            {DisplayPriceInVND(
                                row.original.productId?.price || 0
                            )}
                        </p>
                    )}
                    <p className="text-[11px] sm:text-base font-bold text-rose-400">
                        {DisplayPriceInVND(
                            pricewithDiscount(
                                row.original.productId?.price || 0,
                                row.original.productId?.discount || 0
                            )
                        )}
                    </p>
                </div>
            ),
            meta: { className: 'max-w-28' },
        },
        {
            header: '',
            accessorKey: 'action',
            cell: ({ row }) => (
                <button
                    onClick={() => handleRemoveItem(row.original._id)}
                    className="bg-rose-600 px-[6px] py-[2px] rounded-md text-secondary-200 hover:opacity-80
                shadow-md"
                >
                    <IoClose size={16} />
                </button>
            ),
            meta: { className: 'text-center hidden sm:table-cell' },
        },
    ];

    return (
        <section className="container mx-auto min-h-[80vh] px-4 py-6 text-foreground">
            {/* Header */}
            <Card className="py-5 px-6 mb-6 flex flex-row items-center justify-between gap-4 border-border/80 bg-card rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                    <span
                        onClick={() => navigate('/')}
                        className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors sm:hidden block"
                    >
                        <FaRegArrowAltCircleLeft size={24} />
                    </span>
                    <CardHeader className="p-0">
                        <CardTitle className="text-xl sm:text-2xl text-highlight font-bold uppercase tracking-wide">
                            Giỏ hàng của bạn
                        </CardTitle>
                    </CardHeader>
                </div>
            </Card>

            {cart.length === 0 ? (
                <div className="flex flex-col gap-4 items-center justify-center py-16">
                    <NoData />
                    <Button
                        onClick={() => navigate('/')}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-xs"
                    >
                        Mua sắm ngay!
                    </Button>
                </div>
            ) : (
                <div className="liquid-glass border border-border/70 rounded-2xl p-4 sm:p-6 shadow-xs">
                    <DisplayTableCart data={cart} column={columns} />

                    <div
                        className="flex justify-between items-center mt-6 px-5 py-4 liquid-glass-2 border border-border/60 shadow-xs text-sm rounded-xl"
                    >
                        <div>
                            <p className="font-bold text-foreground">
                                Tổng cộng ({selectedItems.length} sản phẩm đã
                                chọn):
                            </p>
                            {hasDiscount > 0 && (
                                <p className="line-through text-xs text-muted-foreground">
                                    {DisplayPriceInVND(originalTotalPrice)}
                                </p>
                            )}
                        </div>
                        <p className="text-base sm:text-xl font-bold text-primary">
                            {DisplayPriceInVND(totalPrice)}
                        </p>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                        <div className="flex items-center gap-6 w-full sm:w-auto">
                            <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                                <input
                                    type="checkbox"
                                    checked={
                                        selectedItems.length === cart.length &&
                                        cart.length > 0
                                    }
                                    onChange={selectAll}
                                    className="accent-primary w-4 h-4 rounded cursor-pointer"
                                />
                                <span>Chọn tất cả</span>
                            </label>
                            {selectedItems.length > 0 && (
                                <button
                                    onClick={() =>
                                        setOpenConfirmBoxDelete(true)
                                    }
                                    className="text-destructive hover:underline font-semibold text-xs sm:text-sm"
                                >
                                    Xóa ({selectedItems.length})
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <Button
                                variant="outline"
                                className="rounded-xl font-semibold hidden sm:inline-flex"
                                onClick={() => navigate('/')}
                            >
                                Tiếp tục mua sắm
                            </Button>
                            <Button
                                onClick={goToCheckout}
                                disabled={selectedItems.length === 0}
                                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl px-6 shadow-xs hover:shadow-md transition-all duration-200"
                            >
                                {loading ? <Loading /> : 'Đặt hàng'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {openConfirmBoxDelete && (
                <ConfirmBox
                    confirm={handleRemoveSelectedItems}
                    cancel={() => setOpenConfirmBoxDelete(false)}
                    close={() => setOpenConfirmBoxDelete(false)}
                    title="Xóa sản phẩm"
                    message="Bạn có chắc chắn muốn xóa sản phẩm này?"
                    confirmText="Xác nhận"
                    cancelText="Hủy"
                />
            )}
        </section>
    );
};

export default CartPage;
