import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGlobalContext } from '../provider/GlobalProvider';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '../utils/AxiosToastError';
import { FaMinus, FaPlus } from 'react-icons/fa6';
import Loading from './Loading';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Star, ShoppingCart } from 'lucide-react';
import { updateCartItemQuantity, removeFromCart } from '../store/cartProduct';

const AddToCartButton = ({ data }) => {
    const { fetchCartItem, updateCartItem, deleteCartItem } =
        useGlobalContext();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const cartItem = useSelector((state) => state.cartItem.cart);
    const [isAvailableCart, setIsAvailableCart] = useState(false);
    const [qty, setQty] = useState(0);
    const [cartItemDetails, setCartItemsDetails] = useState(null);
    const user = useSelector((state) => state.user);
    const navigate = useNavigate();

    const handleADDTocart = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || !user._id) {
            navigate('/login');
            return;
        }

        // Kiểm tra số lượng tồn kho
        if (data?.stock <= 0) {
            toast.error('Sản phẩm đã hết hàng');
            return;
        }

        try {
            setLoading(true);

            const response = await Axios({
                ...SummaryApi.add_to_cart,
                data: {
                    productId: data?._id,
                },
            });

            const { data: responseData } = response;

            if (responseData.success) {
                toast.success(responseData.message);
                if (fetchCartItem) {
                    await fetchCartItem();
                }
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra sản phẩm trong giỏ hàng
    useEffect(() => {
        if (!data?._id) {
            setIsAvailableCart(false);
            setQty(0);
            setCartItemsDetails(null);
            return;
        }

        const validCartItems = cartItem?.filter((item) => item?.productId?._id);
        const checkingItem = validCartItems?.some(
            (item) => item.productId?._id === data._id
        );
        setIsAvailableCart(!!checkingItem);

        const product = validCartItems?.find(
            (item) => item.productId?._id === data._id
        );
        setCartItemsDetails(product || null);
        setQty(product?.quantity || 0);
    }, [data, cartItem]);

    const increaseQty = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!cartItemDetails?._id || qty < 0) {
            toast.error('Sản phẩm không hợp lệ');
            return;
        }

        // Kiểm tra số lượng tồn kho
        if (qty >= (data?.stock || 0)) {
            toast.error('Đã đạt số lượng tối đa trong kho');
            return;
        }

        // Optimistic update - update local state immediately
        const newQty = qty + 1;
        dispatch(
            updateCartItemQuantity({
                itemId: cartItemDetails._id,
                newQuantity: newQty,
            })
        );
        setQty(newQty);

        // Then sync with server
        const response = await updateCartItem(cartItemDetails._id, newQty);

        if (!response.success) {
            // Rollback on error
            dispatch(
                updateCartItemQuantity({
                    itemId: cartItemDetails._id,
                    newQuantity: qty,
                })
            );
            setQty(qty);
        }
    };

    const decreaseQty = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!cartItemDetails?._id || qty <= 0) {
            toast.error('Sản phẩm không hợp lệ');
            return;
        }

        if (qty === 1) {
            // Optimistic delete - remove from local state immediately
            dispatch(removeFromCart(cartItemDetails._id));
            setIsAvailableCart(false);
            setQty(0);
            setCartItemsDetails(null);

            // Then sync with server
            const response = await deleteCartItem(cartItemDetails._id);

            if (!response.success) {
                // Rollback on error - need to refetch the cart to restore state
                await fetchCartItem();
            }
        } else {
            // Optimistic update - update local state immediately
            const newQty = qty - 1;
            dispatch(
                updateCartItemQuantity({
                    itemId: cartItemDetails._id,
                    newQuantity: newQty,
                })
            );
            setQty(newQty);

            // Then sync with server
            const response = await updateCartItem(cartItemDetails._id, newQty);

            if (!response.success) {
                // Rollback on error
                dispatch(
                    updateCartItemQuantity({
                        itemId: cartItemDetails._id,
                        newQuantity: qty,
                    })
                );
                setQty(qty);
            }
        }
    };

    return (
        <div className="w-full text-foreground">
            {isAvailableCart && cartItemDetails ? (
                <div
                    className="flex items-center justify-between w-full border border-border/80 rounded-xl overflow-hidden liquid-glass shadow-xs h-10"
                >
                    <Button
                        onClick={decreaseQty}
                        variant="ghost"
                        size="icon"
                        className="h-full w-10 shrink-0 text-foreground hover:bg-muted/80 rounded-none cursor-pointer"
                        disabled={loading}
                    >
                        <FaMinus size={12} />
                    </Button>

                    <span className="flex-1 text-center text-sm font-bold text-foreground">
                        {qty}
                    </span>

                    <Button
                        onClick={increaseQty}
                        variant="ghost"
                        size="icon"
                        className="h-full w-10 shrink-0 text-foreground hover:bg-muted/80 rounded-none cursor-pointer"
                        disabled={loading}
                    >
                        <FaPlus size={12} />
                    </Button>
                </div>
            ) : (
                <Button
                    onClick={handleADDTocart}
                    className="w-full h-10 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
                    disabled={loading || !data?._id || data?.stock <= 0}
                >
                    {loading ? (
                        <Loading />
                    ) : (
                        <span className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold">
                            <ShoppingCart className="w-4 h-4 shrink-0" />
                            <span>
                                {data?.stock <= 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                            </span>
                        </span>
                    )}
                </Button>
            )}
        </div>
    );
};

export default AddToCartButton;
