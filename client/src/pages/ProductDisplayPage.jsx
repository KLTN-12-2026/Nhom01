import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Axios from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from './../utils/AxiosToastError';
import { DisplayPriceInVND } from './../utils/DisplayPriceInVND';
import { pricewithDiscount } from './../utils/PriceWithDiscount';
import { FaAngleRight, FaAngleLeft } from 'react-icons/fa6';
import Divider from './../components/Divider';
import AddToCartButton from './../components/AddToCartButton';
import image1 from '../assets/minute_delivery.png';
import image2 from '../assets/Best_Prices_Offers.png';
import image3 from '../assets/Secure_Payment.jpg';
import { useDispatch, useSelector } from 'react-redux';
import { valideURLConvert } from '../utils/valideURLConvert';
import CardProduct from '../components/CardProduct';
import toast from 'react-hot-toast';
import { handleAddItemCart } from '../store/cartProduct';
import Loading from '../components/Loading';
import ProductCard from '@/components/product/product-card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import ViewImage from '@/components/ViewImage';
import NoData from '@/components/NoData';
import ProductReviews from '../components/ProductReviews';

const ProductDisplayPage = () => {
    const params = useParams();
    let productId = params?.product?.split('-')?.slice(-1)[0];
    const [data, setData] = useState({
        name: '',
        image: [],
        description: '',
        unit: '',
        price: 0,
        discount: 0,
        stock: 0,
    });

    const [image, setImage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('detail');
    const imageContainer = useRef();
    const user = useSelector((state) => state.user);
    const cart = useSelector((state) => state.cartItem.cart);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const containerRef = useRef();
    const handleRedirectProductListPage = (id, cat) => {
        const url = `/${valideURLConvert(cat)}-${id}`;
        navigate(url);
    };

    const [imageURL, setImageURL] = useState('');

    const fetchProductDetails = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_product_details,
                data: {
                    productId: productId,
                },
            });

            const { data: responseData } = response;
            if (responseData.success) {
                setData(responseData.data);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductDetails();
    }, [params]);

    const handleScrollLeft = () => {
        imageContainer.current.scrollLeft -= 300;
    };

    const handleScrollRight = () => {
        imageContainer.current.scrollLeft += 300;
    };

    const fetchCart = async () => {
        // Không gọi API nếu user chưa đăng nhập
        if (!user?._id) return;

        try {
            const res = await Axios({ ...SummaryApi.get_cart_item });
            if (res.data.success) {
                dispatch(handleAddItemCart(res.data.data));
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    const [selectedOptions, setSelectedOptions] = useState([]);
    const [notes, setNotes] = useState('');

    const handleOptionChange = (
        optionName,
        choiceName,
        priceModifier,
        type
    ) => {
        if (type === 'radio') {
            setSelectedOptions((prev) => {
                const filtered = prev.filter(
                    (item) => item.optionName !== optionName
                );
                return [...filtered, { optionName, choiceName, priceModifier }];
            });
        } else {
            // Checkbox logic can be added here if needed
        }
    };

    const calculateTotalPrice = () => {
        let total = pricewithDiscount(data.price, data.discount);
        selectedOptions.forEach((opt) => {
            total += opt.priceModifier || 0;
        });
        return total;
    };

    const redirectToCartPage = async () => {
        if (!user?._id) {
            navigate('/login');
            return;
        }

        // Validate required options
        if (data.options && data.options.length > 0) {
            const missingOptions = data.options.filter(
                (opt) =>
                    opt.type === 'radio' &&
                    !selectedOptions.find((sel) => sel.optionName === opt.name)
            );
            if (missingOptions.length > 0) {
                toast.error(`Vui lòng chọn ${missingOptions[0].name}`);
                return;
            }
        }

        try {
            const response = await Axios({
                ...SummaryApi.add_to_cart,
                data: {
                    productId: productId,
                    notes: notes,
                    selectedOptions: selectedOptions,
                },
            });
            if (response.data.success) {
                toast.success('Đã thêm món vào giỏ hàng');
                await fetchCart();
                navigate('/cart');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    };

    // San pham tuong tu
    const [relatedProducts, setRelatedProducts] = useState([]);
    useEffect(() => {
        const fetchRelatedProducts = async () => {
            try {
                if (!data?.category?.length) return;

                // API lấy sản phẩm tương tự là public, không cần authentication
                const promises = data.category.map((cat) =>
                    Axios({
                        ...SummaryApi.get_product_by_category,
                        data: { id: cat?._id },
                    })
                );

                const responses = await Promise.all(promises);

                let merged = [];
                responses.forEach((res) => {
                    if (res.data.success) {
                        merged = [...merged, ...res.data.data];
                    }
                });

                const filtered = merged.filter((p) => p._id !== data._id);
                const unique = filtered.filter(
                    (value, index, self) =>
                        index === self.findIndex((p) => p._id === value._id)
                );

                setRelatedProducts(unique.slice(0, 8));
            } catch (error) {
                AxiosToastError(error);
            }
        };

        fetchRelatedProducts();
    }, [data]);

    return (
        <section className="container mx-auto px-4 py-8 lg:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 sm:gap-10 gap-6 lg:mt-4">
                <div>
                    <div
                        className="bg-card border border-border/80 rounded-2xl shadow-xs p-4 flex justify-center items-center
                    h-72 sm:h-[400px]"
                    >
                        <img
                            src={data.image[image]}
                            alt={data.name}
                            className="object-scale-down max-h-full rounded-xl cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setImageURL(data.image[image])}
                        />
                    </div>

                    <div className="flex items-center justify-center gap-2 my-4">
                        {data.image.map((img, index) => (
                            <button
                                key={img + index + 'point'}
                                onClick={() => setImage(index)}
                                className={`h-2.5 rounded-full transition-all ${
                                    index === image
                                        ? 'bg-primary w-6'
                                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2.5'
                                }`}
                                aria-label={`Ảnh ${index + 1}`}
                            />
                        ))}
                    </div>

                    <div className="container mx-auto">
                        <div className="relative mt-4 flex items-center">
                            <div
                                ref={imageContainer}
                                className="grid grid-flow-col auto-cols-[minmax(70px,70px)] sm:auto-cols-[minmax(85px,85px)]
                                    sm:gap-4 gap-2 overflow-x-auto scroll-smooth scrollbar-hide py-1"
                            >
                                {data.image.map((img, index) => (
                                    <div
                                        key={index}
                                        className={`rounded-xl cursor-pointer flex items-center overflow-hidden border-2 transition-all ${
                                            index === image
                                                ? 'border-primary ring-2 ring-primary/20 shadow-xs'
                                                : 'border-border/80 hover:border-primary/40'
                                        }`}
                                        onClick={() => setImage(index)}
                                    >
                                        <img
                                            src={img}
                                            className="object-cover sm:h-20 sm:w-20 w-[70px] h-[70px]"
                                        />
                                    </div>
                                ))}
                            </div>

                            {data.image.length > 6 && (
                                <>
                                    <div className="left-0 absolute hidden lg:block cursor-pointer text-foreground hover:opacity-80">
                                        <button
                                            onClick={handleScrollLeft}
                                            className="z-10 bg-card/90 hover:bg-card border border-border/80 shadow-md text-foreground text-sm
                                               p-2 rounded-full transition-transform hover:scale-105"
                                        >
                                            <FaAngleLeft size={16} />
                                        </button>
                                    </div>

                                    <div className="right-0 absolute hidden lg:block cursor-pointer text-foreground hover:opacity-80">
                                        <button
                                            onClick={handleScrollRight}
                                            className="z-10 bg-card/90 hover:bg-card border border-border/80 shadow-md text-foreground text-sm
                                               p-2 rounded-full transition-transform hover:scale-105"
                                        >
                                            <FaAngleRight size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* PC / Tablet */}
                    <div className="lg:flex flex-col gap-6 hidden">
                        <section className="container mt-8 bg-card border border-border/80 p-6 rounded-2xl shadow-xs">
                            <div className="flex items-center gap-6 border-b border-border/60">
                                <button
                                    onClick={() => setTab('detail')}
                                    className={`pb-3 font-semibold text-base px-2 border-b-2 transition-colors ${
                                        tab === 'detail'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Chi tiết
                                </button>
                                <button
                                    onClick={() => setTab('description')}
                                    className={`pb-3 font-semibold text-base px-2 border-b-2 transition-colors ${
                                        tab === 'description'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Mô tả
                                </button>
                                <button
                                    onClick={() => setTab('reviews')}
                                    className={`pb-3 font-semibold text-base px-2 border-b-2 transition-colors ${
                                        tab === 'reviews'
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Đánh giá
                                </button>
                            </div>

                            <div className="mt-6 px-2">
                                {tab === 'detail' && (
                                    <div className="text-foreground leading-relaxed break-words flex flex-col gap-3 text-sm">
                                        <div className="flex gap-4">
                                            <span className="font-semibold text-nowrap">
                                                Danh mục:{' '}
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {data?.category &&
                                                data.category.length > 0 ? (
                                                    data.category.map(
                                                        (cat, index) => (
                                                            <Link
                                                                ref={
                                                                    containerRef
                                                                }
                                                                key={
                                                                    cat._id ||
                                                                    index
                                                                }
                                                                onClick={() =>
                                                                    handleRedirectProductListPage(
                                                                        cat._id,
                                                                        cat.name
                                                                    )
                                                                }
                                                                className="hover:underline text-primary font-medium"
                                                            >
                                                                {cat.name}
                                                            </Link>
                                                        )
                                                    )
                                                ) : (
                                                    <span className="italic text-muted-foreground break-words">
                                                        Không có danh mục
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <span className="font-semibold">
                                                Số lượng còn lại:
                                            </span>
                                            {data.stock}
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-semibold">
                                                Đơn vị tính:
                                            </span>
                                            {data.unit}
                                        </div>
                                    </div>
                                )}
                                {tab === 'description' && (
                                    <div className="text-foreground leading-relaxed break-words space-y-2 text-sm">
                                        {data?.description &&
                                        data.description.trim() !== '' ? (
                                            data.description
                                                .split('\n')
                                                .map((line, index) => (
                                                    <div
                                                        key={index}
                                                        className="whitespace-pre-line"
                                                    >
                                                        {line.trim()}
                                                    </div>
                                                ))
                                        ) : (
                                            <span className="italic text-muted-foreground">
                                                Sản phẩm này hiện chưa có mô tả.
                                            </span>
                                        )}
                                    </div>
                                )}
                                {tab === 'reviews' && (
                                    <ProductReviews
                                        productId={data?._id || productId}
                                        productName={data?.name}
                                    />
                                )}
                            </div>
                        </section>

                        <div
                            className={`${
                                data?.more_details &&
                                Object.keys(data.more_details).length > 0
                                    ? 'flex'
                                    : 'hidden'
                            } bg-card border border-border/80 p-6 rounded-2xl shadow-xs flex-col gap-4`}
                        >
                            {data?.more_details &&
                                Object.keys(data.more_details).map(
                                    (element, index) => (
                                        <div key={element || index}>
                                            <p className="pb-1 font-semibold text-base text-foreground">
                                                {element}
                                            </p>
                                            <p className="text-sm text-muted-foreground break-words">
                                                {data.more_details[element]}
                                            </p>
                                        </div>
                                    )
                                )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:gap-4 gap-2 mt-6 text-foreground">
                    <h1 className="text-2xl lg:text-3xl font-display font-bold text-highlight">
                        {data.name}
                    </h1>
                    <p className="text-muted-foreground font-medium sm:text-base text-sm">
                        {data.unit}
                    </p>
                    <Divider />

                    <div className="flex items-center gap-6 sm:gap-8">
                        <p className="text-2xl sm:text-3xl font-bold text-primary">
                            {DisplayPriceInVND(
                                pricewithDiscount(data.price, data.discount)
                            )}
                        </p>
                        {data.discount > 0 && (
                            <div className="flex items-center gap-3 sm:text-lg text-sm">
                                <p className="line-through text-muted-foreground font-medium">
                                    {DisplayPriceInVND(data.price)}
                                </p>
                                <span
                                    className="bg-primary/10 border border-primary/30 text-primary font-semibold
                                px-2.5 py-0.5 rounded-full text-xs sm:text-sm"
                                >
                                    -{data.discount}%
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="w-fit">
                        {/* Options Section */}
                        {data.options && data.options.length > 0 && (
                            <div className="mb-6">
                                {data.options.map((option, idx) => (
                                    <div key={idx} className="mb-4">
                                        <h3 className="font-semibold mb-2 text-foreground text-sm">
                                            {option.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2.5">
                                            {option.choices.map(
                                                (choice, cIdx) => (
                                                    <label
                                                        key={cIdx}
                                                        className="cursor-pointer"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={option.name}
                                                            className="peer sr-only"
                                                            onChange={() =>
                                                                handleOptionChange(
                                                                    option.name,
                                                                    choice.name,
                                                                    choice.priceModifier,
                                                                    option.type
                                                                )
                                                            }
                                                            checked={selectedOptions.find(
                                                                (s) =>
                                                                    s.optionName ===
                                                                        option.name &&
                                                                    s.choiceName ===
                                                                        choice.name
                                                            )}
                                                        />
                                                        <div className="px-3.5 py-1.5 rounded-xl border border-border/80 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-foreground/80 font-medium transition-all text-xs sm:text-sm shadow-2xs">
                                                            {choice.name}{' '}
                                                            {choice.priceModifier >
                                                                0 &&
                                                                `(+${DisplayPriceInVND(
                                                                    choice.priceModifier
                                                                )})`}
                                                        </div>
                                                    </label>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes Section */}
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2 text-foreground text-sm">
                                Ghi chú cho món ăn
                            </h3>
                            <textarea
                                className="w-full p-3 rounded-xl bg-card border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 text-sm shadow-2xs"
                                rows="3"
                                placeholder="Ví dụ: Không hành, ít đá..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                        </div>

                        {data.stock === 0 ? (
                            <p className="md:text-2xl text-lg font-bold text-destructive my-2">
                                Hết hàng
                            </p>
                        ) : (
                            <div className="flex items-center justify-between gap-6 sm:gap-10 mt-2">
                                <div>
                                    <AddToCartButton data={data} />
                                </div>
                                <div>
                                    <GlareHover
                                        glareColor="#ffffff"
                                        glareOpacity={0.2}
                                        glareAngle={-30}
                                        glareSize={300}
                                        transitionDuration={800}
                                        playOnce={false}
                                    >
                                        <Button
                                            onClick={redirectToCartPage}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5
                                rounded-xl font-semibold shadow-xs text-center text-sm"
                                        >
                                            {loading ? <Loading /> : 'Mua ngay'}
                                        </Button>
                                    </GlareHover>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
                        <h2 className="font-semibold sm:text-base text-sm text-foreground">
                            Tại sao nên chọn RestoHub?{' '}
                        </h2>
                        <div className="sm:text-sm text-xs divide-y divide-border/60">
                            <div className="flex items-center gap-4 py-3">
                                <img
                                    src={image1}
                                    alt="superfast delivery"
                                    className="sm:w-16 sm:h-16 w-12 h-12 object-cover rounded-xl border border-border/60 flex-shrink-0"
                                />
                                <div className="flex flex-col gap-0.5">
                                    <div className="font-semibold text-foreground">
                                        Thức ăn tươi ngon
                                    </div>
                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                        Chất lượng sản phẩm đảm bảo, từ các nhà
                                        cung cấp uy tín.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 py-3">
                                <img
                                    src={image2}
                                    alt="Best prices offers"
                                    className="sm:w-16 sm:h-16 w-12 h-12 object-cover rounded-xl border border-border/60 flex-shrink-0"
                                />
                                <div className="flex flex-col gap-0.5">
                                    <div className="font-semibold text-foreground">
                                        Giá tốt & ưu đãi hấp dẫn
                                    </div>
                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                        Mua sắm với mức giá cạnh tranh cùng
                                        nhiều khuyến mãi trực tiếp.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 py-3">
                                <img
                                    src={image3}
                                    alt="Wide Assortment"
                                    className="sm:w-16 sm:h-16 w-12 h-12 object-cover rounded-xl border border-border/60 flex-shrink-0"
                                />
                                <div className="flex flex-col gap-0.5">
                                    <div className="font-semibold text-foreground">
                                        Thanh toán an toàn
                                    </div>
                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                        Hỗ trợ nhiều phương thức thanh toán bảo
                                        mật.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-6 lg:hidden">
                <section className="mt-8 bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
                    <div className="text-sm flex items-center gap-4 border-b border-border/60">
                        <button
                            onClick={() => setTab('detail')}
                            className={`pb-2.5 font-medium px-2 border-b-2 transition-colors ${
                                tab === 'detail'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground'
                            }`}
                        >
                            Chi tiết
                        </button>
                        <button
                            onClick={() => setTab('description')}
                            className={`pb-2.5 font-medium px-2 border-b-2 transition-colors ${
                                tab === 'description'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground'
                            }`}
                        >
                            Mô tả
                        </button>
                        <button
                            onClick={() => setTab('reviews')}
                            className={`pb-2.5 font-medium px-2 border-b-2 transition-colors ${
                                tab === 'reviews'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground'
                            }`}
                        >
                            Đánh giá
                        </button>
                    </div>

                    <div className="mt-4 px-1">
                        {tab === 'detail' && (
                            <div className="text-sm text-foreground leading-relaxed break-words flex flex-col gap-3">
                                <div className="flex gap-4">
                                    <span className="font-semibold text-nowrap">
                                        Danh mục:{' '}
                                    </span>
                                    <div className="flex flex-wrap">
                                        {data?.category &&
                                        data.category.length > 0 ? (
                                            data.category.map((cat, index) => (
                                                <Link
                                                    ref={containerRef}
                                                    key={cat._id || index}
                                                    onClick={() =>
                                                        handleRedirectProductListPage(
                                                            cat._id,
                                                            cat.name
                                                        )
                                                    }
                                                    className="hover:underline text-primary font-medium px-2"
                                                >
                                                    {cat.name}
                                                </Link>
                                            ))
                                        ) : (
                                            <span className="italic text-muted-foreground break-words">
                                                Không có danh mục
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="font-semibold">
                                        Số lượng còn lại:
                                    </span>
                                    {data.stock}
                                </div>
                                <div className="flex gap-4">
                                    <span className="font-semibold">
                                        Đơn vị tính:
                                    </span>
                                    {data.unit}
                                </div>
                            </div>
                        )}
                        {tab === 'description' && (
                            <div className="text-foreground leading-relaxed break-words space-y-2 text-sm">
                                {data?.description &&
                                data.description.trim() !== '' ? (
                                    data.description
                                        .split('\n')
                                        .map((line, index) => (
                                            <div
                                                key={index}
                                                className="whitespace-pre-line"
                                            >
                                                {line.trim()}
                                            </div>
                                        ))
                                ) : (
                                    <span className="italic text-muted-foreground">
                                        Sản phẩm này hiện chưa có mô tả.
                                    </span>
                                )}
                            </div>
                        )}
                        {tab === 'reviews' && (
                            <ProductReviews
                                productId={data?._id || productId}
                                productName={data?.name}
                            />
                        )}
                    </div>
                </section>

                <div
                    className={`${
                        data?.more_details &&
                        Object.keys(data.more_details).length > 0
                            ? 'flex'
                            : 'hidden'
                    } bg-card border border-border/80 p-4 rounded-2xl shadow-xs flex-col gap-4`}
                >
                    {data?.more_details &&
                        Object.keys(data.more_details).map((element, index) => (
                            <div key={element || index}>
                                <p className="pb-1 font-semibold text-sm text-foreground">
                                    {element}
                                </p>
                                <p className="text-xs text-muted-foreground break-words">
                                    {data.more_details[element]}
                                </p>
                            </div>
                        ))}
                </div>
            </div>

            <div
                className="sm:mt-10 mt-6 lg:mb-4 bg-card border border-border/80 sm:p-6 p-4 shadow-xs rounded-2xl
            flex flex-col gap-4"
            >
                <h2 className="sm:text-xl text-base font-bold text-highlight font-display">
                    Sản phẩm tương tự
                </h2>

                <div
                    className={`${
                        relatedProducts.length > 0
                            ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4 gap-[10px]'
                            : ''
                    } flex flex-wrap gap-2`}
                >
                    {relatedProducts.length > 0 ? (
                        relatedProducts.map((item) => (
                            <ProductCard key={item._id} data={item} />
                        ))
                    ) : (
                        <NoData message="Không có sản phẩm tương tự" />
                    )}
                </div>
            </div>

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}
        </section>
    );
};

export default ProductDisplayPage;
