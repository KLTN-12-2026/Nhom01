import React from 'react';
import { useGlobalContext } from '../provider/GlobalProvider';
import { FaCartShopping } from 'react-icons/fa6';
import { FaCaretRight } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { Link } from 'react-router-dom';

const CartMobileLink = () => {
    const { totalPrice, totalQty } = useGlobalContext();
    const cartItem = useSelector((state) => state.cartItem.cart);

    return (
        <>
            {cartItem[0] && (
                <Link to={'/cart'} className="sticky bottom-4 px-4 block md:hidden z-30">
                    <div
                        className="flex items-center justify-between gap-3 text-primary-foreground text-sm
                    px-5 py-3 rounded-2xl shadow-lg bg-primary hover:bg-primary/95 font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-foreground/20 rounded-xl">
                                <FaCartShopping size={16} />
                            </div>
                            <div className="text-xs sm:text-sm">
                                <p className="opacity-90">{totalQty} món</p>
                                <p className="font-bold text-sm sm:text-base">{DisplayPriceInVND(totalPrice)}</p>
                            </div>
                        </div>

                        <span className="flex items-center gap-1 font-semibold text-xs sm:text-sm">
                            <span>Xem giỏ hàng</span>
                            <FaCaretRight />
                        </span>
                    </div>
                </Link>
            )}
        </>
    );
};

export default CartMobileLink;
