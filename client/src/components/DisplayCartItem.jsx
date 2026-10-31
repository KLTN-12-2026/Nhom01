import React from 'react';
import { useGlobalContext } from '../provider/GlobalProvider';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaCaretRight } from 'react-icons/fa';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { pricewithDiscount } from '../utils/PriceWithDiscount';
import AddToCartButton from './AddToCartButton';
import imageEmpty from '../assets/empty_cart.webp';
import Divider from './Divider';
import { valideURLConvert } from '../utils/valideURLConvert';
import GlareHover from './GlareHover';

const DisplayCartItem = ({ close }) => {
    const { notDiscountTotalPrice, totalPrice, totalQty } = useGlobalContext();
    const cartItem = useSelector((state) => state.cartItem.cart);
    const user = useSelector((state) => state.user);
    const navigate = useNavigate();

    const redirectToCheckoutPage = () => {
        if (user?._id) {
            navigate('/checkout');
            if (close) {
                close();
            }
            return;
        }
        toast('Please Login');
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section
            onClick={close}
            className="bg-neutral-800 fixed top-0 bottom-0 right-0 left-0 bg-opacity-60 z-50"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-card border-l border-border/80 shadow-2xl w-full max-w-md min-h-screen max-h-screen ml-auto p-4 sm:p-5 text-foreground flex flex-col"
            >
                <div className="flex items-center pb-3 gap-3 justify-between border-b border-border/60">
                    <h2 className="font-bold text-highlight font-display text-lg">
                        Giỏ hàng ({totalQty})
                    </h2>
                    <Link
                        to={'/cart'}
                        onClick={close}
                        className="flex items-center gap-1 text-primary hover:underline text-sm font-semibold"
                    >
                        Xem tất cả
                        <span>
                            <FaCaretRight className="text-xs" />
                        </span>
                    </Link>
                </div>

                <div
                    className={`${
                        cartItem[0]
                            ? 'flex-1 overflow-hidden'
                            : 'justify-center flex-1'
                    } flex flex-col pt-3`}
                >
                    {/* Display Items */}
                    {cartItem[0] ? (
                        <div className="flex flex-col h-full overflow-hidden">
                            {(notDiscountTotalPrice - totalPrice > 0) && (
                                <div className="flex items-center justify-between px-3.5 py-2 bg-primary/10 border border-primary/20 text-xs font-semibold rounded-xl text-primary mb-3">
                                    <p>Tiết kiệm được:</p>
                                    <p className="font-bold">
                                        {DisplayPriceInVND(
                                            notDiscountTotalPrice - totalPrice
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                                {cartItem.map((item, index) => {
                                    return (
                                        <div
                                            key={
                                                item?._id +
                                                    'cartItemDisplay' ||
                                                index
                                            }
                                            className="flex items-center gap-3 p-2.5 rounded-xl border border-border/70 bg-background/50"
                                        >
                                            <div className="w-16 h-16 min-w-16 rounded-xl border border-border/70 overflow-hidden flex-shrink-0">
                                                <img
                                                    src={
                                                        item?.productId
                                                            ?.image[0]
                                                    }
                                                    alt={item?.productId?.name}
                                                    onClick={() => {
                                                        const product =
                                                            item?.productId;
                                                        const url = `/product/${valideURLConvert(
                                                            product.name
                                                        )}-${product._id}`;
                                                        navigate(url);
                                                        close();
                                                        scrollToTop();
                                                    }}
                                                    className="object-cover w-full h-full cursor-pointer hover:scale-105 transition-transform"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 text-xs sm:text-sm flex flex-col gap-0.5">
                                                <p className="font-semibold text-foreground truncate">
                                                    {item?.productId?.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs">
                                                    {item?.productId?.unit}
                                                </p>
                                                <p className="font-bold text-primary">
                                                    {DisplayPriceInVND(
                                                        pricewithDiscount(
                                                            item?.productId
                                                                ?.price,
                                                            item?.productId
                                                                ?.discount
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <AddToCartButton
                                                    data={item?.productId}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-background/80 border border-border/70 p-3.5 rounded-xl mt-3 space-y-1.5 text-xs sm:text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tổng số lượng:</span>
                                    <span>{totalQty} món</span>
                                </div>
                                <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/60">
                                    <span>Tổng cộng:</span>
                                    <span className="text-primary text-base font-bold">
                                        {DisplayPriceInVND(totalPrice)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center gap-4 py-8">
                            <img
                                src={imageEmpty}
                                alt="Giỏ hàng trống"
                                className="w-40 h-40 object-contain opacity-60"
                            />
                            <p className="text-muted-foreground text-sm font-medium">
                                Giỏ hàng của bạn đang trống
                            </p>
                            <Link
                                onClick={close}
                                to={'/'}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-xs transition-all hover:scale-105 active:scale-95 text-sm"
                            >
                                Mua sắm ngay!
                            </Link>
                        </div>
                    )}
                </div>

                {cartItem[0] && (
                    <div
                        onClick={redirectToCheckoutPage}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 mt-3 font-semibold text-sm
                        rounded-xl flex items-center justify-between shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="font-bold text-base">{DisplayPriceInVND(totalPrice)}</div>
                        <button
                            className="flex items-center gap-1 font-semibold"
                        >
                            Thanh toán
                            <FaCaretRight className="text-sm" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DisplayCartItem;
