import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { valideURLConvert } from '../utils/valideURLConvert';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import AxiosToastError from '../utils/AxiosToastError';
import { FaArrowUp, FaSort, FaChevronDown } from 'react-icons/fa';
import CardLoading from '../components/CardLoading';
import { IoFilter } from 'react-icons/io5';
import ProductCard from '@/components/product/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// In-memory cache for instant category and filter switching (0ms delay)
const clientProductCache = new Map();
const getCacheKey = (catId, subCatId, sort, min, max, targetPage = 1) =>
    `${catId || ''}_${subCatId || ''}_${sort || 'newest'}_${min || ''}_${max || ''}_p${targetPage}`;

const ProductListPage = () => {
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [showScrollToTop, setShowScrollToTop] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [debouncedPriceRange, setDebouncedPriceRange] = useState({ min: '', max: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [isFiltering] = useState(false);
    const [loading, setLoading] = useState(false);

    const observer = useRef();
    const params = useParams();
    const AllCategory = useSelector((state) => state.product.allCategory);
    const AllSubCategory = useSelector((state) => state.product.allSubCategory);
    const [displayCategory, setDisplayCategory] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState({});

    const category = params?.category?.split('-');
    const categoryId = category?.slice(-1)[0];
    const categoryInfo = AllCategory.find((cat) => cat._id === categoryId);
    const categoryName = categoryInfo ? categoryInfo.name : '';
    const [showSidebar, setShowSidebar] = useState(false);

    const subCategory = params?.subCategory?.split('-');
    const subCategoryId = subCategory?.slice(-1)[0];

    const lastProductRef = useCallback(
        (node) => {
            if (loading || loadingMore) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    setPage((prevPage) => prevPage + 1);
                }
            });
            if (node) observer.current.observe(node);
        },
        [loading, loadingMore, hasMore]
    );

    // Handle price range input changes
    const handlePriceChange = (e) => {
        const { name, value } = e.target;

        // Only allow numbers or empty string
        if (value === '' || /^\d*$/.test(value)) {
            setPriceRange((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    // Handle price range validation before fetching
    const validatePriceRange = useCallback(() => {
        const min = priceRange.min ? parseInt(priceRange.min, 10) : null;
        const max = priceRange.max ? parseInt(priceRange.max, 10) : null;

        if (min !== null && max !== null && min > max) {
            return false;
        }
        return true;
    }, [priceRange.min, priceRange.max]);

    // Only debounce typing in price input fields
    useEffect(() => {
        const timer = setTimeout(() => {
            if (priceRange.min && priceRange.max && !validatePriceRange()) {
                AxiosToastError({
                    message: 'Giá tối thiểu không được lớn hơn giá tối đa',
                });
                return;
            }
            setDebouncedPriceRange(priceRange);
        }, 350);

        return () => clearTimeout(timer);
    }, [priceRange.min, priceRange.max, validatePriceRange]);

    // Hàm fetchProductData với hỗ trợ silent revalidation và pagination
    const fetchProductData = useCallback(
        async (targetPage = 1, showFullLoading = false) => {
            if (!categoryId) return;

            if (showFullLoading) {
                setLoading(true);
            } else if (targetPage > 1) {
                setLoadingMore(true);
            }

            try {
                const hasSubCategory =
                    subCategoryId && subCategoryId.trim() !== '';

                let response;

                if (hasSubCategory) {
                    const requestData = {
                        categoryId,
                        subCategoryId,
                        page: targetPage,
                        limit: 12,
                        sort: sortBy,
                    };

                    const minPrice = debouncedPriceRange.min?.trim();
                    const maxPrice = debouncedPriceRange.max?.trim();

                    if (minPrice) {
                        requestData.minPrice = parseInt(minPrice, 10);
                    }
                    if (maxPrice) {
                        requestData.maxPrice = parseInt(maxPrice, 10);
                    }

                    response = await Axios({
                        ...SummaryApi.get_product_by_category_and_sub_category,
                        data: requestData,
                    });
                } else {
                    const requestData = {
                        id: [categoryId],
                    };

                    response = await Axios({
                        ...SummaryApi.get_product_by_category,
                        data: requestData,
                    });
                }

                const { data: responseData } = response;

                if (responseData?.success) {
                    const incomingData = responseData.data || [];
                    const count =
                        responseData.totalCount || incomingData.length || 0;
                    const more = hasSubCategory
                        ? incomingData.length === 12
                        : false;

                    if (targetPage === 1) {
                        setData(incomingData);
                        setTotalCount(count);
                        setHasMore(more);

                        // Save page 1 in memory cache
                        const cacheKey = getCacheKey(
                            categoryId,
                            subCategoryId,
                            sortBy,
                            debouncedPriceRange.min,
                            debouncedPriceRange.max,
                            1
                        );
                        clientProductCache.set(cacheKey, {
                            data: incomingData,
                            totalCount: count,
                            hasMore: more,
                        });
                    } else {
                        setData((prev) => [...prev, ...incomingData]);
                        setTotalCount(count);
                        setHasMore(more);
                    }
                } else {
                    const errorMessage = responseData?.message?.trim();
                    if (errorMessage) {
                        AxiosToastError({ message: errorMessage });
                    }
                }
            } catch (error) {
                const errorMessage =
                    error.response?.data?.message?.trim() ||
                    error.message?.trim();

                if (errorMessage) {
                    AxiosToastError({
                        message: errorMessage || 'Đã xảy ra lỗi không xác định',
                    });
                }
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [
            categoryId,
            subCategoryId,
            sortBy,
            debouncedPriceRange.min,
            debouncedPriceRange.max,
        ]
    );

    // Chuyển đổi danh mục / sắp xếp / lọc giá: NGAY LẬP TỨC kiểm tra cache để render 0ms
    useEffect(() => {
        setPage(1);
        if (!categoryId) return;

        const cacheKey = getCacheKey(
            categoryId,
            subCategoryId,
            sortBy,
            debouncedPriceRange.min,
            debouncedPriceRange.max,
            1
        );

        const cached = clientProductCache.get(cacheKey);
        if (cached) {
            // Tức thì hiển thị dữ liệu đã cache (0ms delay!)
            setData(cached.data);
            setTotalCount(cached.totalCount);
            setHasMore(cached.hasMore);
            setLoading(false);
            // Đồng bộ dữ liệu mới ngầm (không hiển thị màn hình chờ)
            fetchProductData(1, false);
        } else {
            // Chưa có trong cache: hiển thị loading và tải ngay lập tức (không delay setTimeout)
            setData([]);
            setLoading(true);
            setHasMore(true);
            fetchProductData(1, true);
        }
    }, [
        categoryId,
        subCategoryId,
        sortBy,
        debouncedPriceRange.min,
        debouncedPriceRange.max,
        fetchProductData,
    ]);

    // Load thêm sản phẩm khi page thay đổi (> 1)
    useEffect(() => {
        if (page > 1) {
            fetchProductData(page, false);
        }
    }, [page, fetchProductData]);

    // Hàm prefetch danh mục ngầm
    const prefetchCategory = useCallback(async (catId) => {
        if (!catId) return;
        const key = getCacheKey(catId, '', 'newest', '', '', 1);
        if (clientProductCache.has(key)) return;

        try {
            const response = await Axios({
                ...SummaryApi.get_product_by_category,
                data: { id: [catId] },
            });
            if (response.data?.success) {
                const incomingData = response.data.data || [];
                clientProductCache.set(key, {
                    data: incomingData,
                    totalCount: incomingData.length,
                    hasMore: false,
                });
            }
        } catch {
            // Ignore prefetch error
        }
    }, []);

    // Hàm prefetch danh mục con ngầm
    const prefetchSubCategory = useCallback(async (catId, subCatId) => {
        if (!catId || !subCatId) return;
        const key = getCacheKey(catId, subCatId, 'newest', '', '', 1);
        if (clientProductCache.has(key)) return;

        try {
            const response = await Axios({
                ...SummaryApi.get_product_by_category_and_sub_category,
                data: {
                    categoryId: catId,
                    subCategoryId: subCatId,
                    page: 1,
                    limit: 12,
                    sort: 'newest',
                },
            });
            if (response.data?.success) {
                const incomingData = response.data.data || [];
                clientProductCache.set(key, {
                    data: incomingData,
                    totalCount: response.data.totalCount || incomingData.length,
                    hasMore: incomingData.length === 12,
                });
            }
        } catch {
            // Ignore prefetch error
        }
    }, []);

    // Tự động prefetch các danh mục còn lại trong nền
    useEffect(() => {
        if (displayCategory && displayCategory.length > 0) {
            const timer = setTimeout(() => {
                displayCategory.forEach((cat) => {
                    if (cat._id !== categoryId) {
                        prefetchCategory(cat._id);
                    }
                });
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [displayCategory, categoryId, prefetchCategory]);

    // Xử lý cuộn để hiển thị nút "Lên đầu trang"
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollToTop(window.pageYOffset > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cập nhật danh mục hiển thị
    useEffect(() => {
        setDisplayCategory(AllCategory);
    }, [AllCategory]);

    // Tự động mở danh mục phụ khi danh mục được active
    useEffect(() => {
        if (categoryId) {
            setExpandedCategories((prev) => ({
                ...prev,
                [categoryId]: true,
            }));
        }
    }, [categoryId]);

    // Xử lý thay đổi sắp xếp
    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    // Xử lý lỗi hình ảnh
    const handleImageError = (e) => {
        e.target.onerror = null;
        e.target.src = '/placeholder-category.jpg';
    };

    // Cuộn lên đầu trang
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Toggle hiển thị danh mục phụ
    const toggleCategory = (categoryId) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    return (
        <section className="min-h-screen py-6">
            <div className="container w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Mobile Toggle Button */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="lg:hidden flex items-center justify-between w-full p-4 bg-card border border-border/80 rounded-2xl shadow-xs text-foreground font-semibold text-sm"
                    >
                        <span className="font-medium text-highlight">
                            Danh mục sản phẩm
                        </span>
                        <FaChevronDown
                            className={`transition-transform text-muted-foreground ${
                                showSidebar ? 'transform rotate-180' : ''
                            }`}
                        />
                    </button>

                    {/* Category Sidebar */}
                    <div
                        className={`${
                            showSidebar ? 'block' : 'hidden'
                        } lg:block w-full lg:w-72 flex-shrink-0`}
                    >
                        <div className="bg-card border border-border/80 rounded-2xl shadow-xs lg:sticky lg:top-24 p-3">
                            <h3 className="font-bold text-base text-highlight hidden lg:block px-3 py-2 border-b border-border/60 mb-2">
                                Danh mục
                            </h3>
                            <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto p-1 custom-scrollbar">
                                {/* Categories List with nested SubCategories */}
                                {displayCategory.map((s) => {
                                    const link = `/${valideURLConvert(
                                        s.name
                                    )}-${s._id}`;

                                    // Lấy danh sách subcategories cho category này
                                    const categorySubCategories =
                                        AllSubCategory.filter((subCat) => {
                                            return subCat.category.some(
                                                (cat) => cat._id === s._id
                                            );
                                        });

                                    const hasSubCategories =
                                        categorySubCategories.length > 0;
                                    const isExpanded =
                                        expandedCategories[s._id];

                                    return (
                                        <div key={s._id}>
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    to={link}
                                                    onMouseEnter={() =>
                                                        prefetchCategory(s._id)
                                                    }
                                                    className={`flex items-center gap-3 p-2 rounded-xl transition-all flex-1 ${
                                                        categoryId === s._id
                                                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                                            : 'hover:bg-muted text-foreground'
                                                    }`}
                                                    onClick={() =>
                                                        setShowSidebar(false)
                                                    }
                                                >
                                                    <img
                                                        src={
                                                            s.image ||
                                                            '/placeholder-category.jpg'
                                                        }
                                                        alt={s.name}
                                                        onError={
                                                            handleImageError
                                                        }
                                                        className="w-8 h-8 lg:w-9 lg:h-9 object-cover rounded-lg border border-border/70 flex-shrink-0"
                                                    />
                                                    <span className="text-xs sm:text-sm font-medium line-clamp-1">
                                                        {s.name}
                                                    </span>
                                                </Link>

                                                {/* Toggle button cho subcategories */}
                                                {hasSubCategories && (
                                                    <button
                                                        onClick={() =>
                                                            toggleCategory(
                                                                s._id
                                                            )
                                                        }
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                                        aria-label={
                                                            isExpanded
                                                                ? 'Thu gọn'
                                                                : 'Mở rộng'
                                                        }
                                                    >
                                                        <FaChevronDown
                                                            className={`transition-transform ${
                                                                isExpanded
                                                                    ? 'transform rotate-180'
                                                                    : ''
                                                            }`}
                                                            size={12}
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            {/* SubCategories - hiển thị ngay dưới category */}
                                            {hasSubCategories && isExpanded && (
                                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-border/70 pl-2">
                                                    {categorySubCategories.map(
                                                        (subCat) => {
                                                            const subLink = `/${valideURLConvert(
                                                                s.name
                                                            )}-${
                                                                s._id
                                                            }/${valideURLConvert(
                                                                subCat.name
                                                            )}-${subCat._id}`;
                                                            return (
                                                                <Link
                                                                    key={
                                                                        subCat._id
                                                                    }
                                                                    to={subLink}
                                                                    onMouseEnter={() =>
                                                                        prefetchSubCategory(
                                                                            s._id,
                                                                            subCat._id
                                                                        )
                                                                    }
                                                                    className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-all ${
                                                                        subCategoryId ===
                                                                        subCat._id
                                                                            ? 'bg-primary/15 text-primary font-semibold'
                                                                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                                                    }`}
                                                                    onClick={() =>
                                                                        setShowSidebar(
                                                                            false
                                                                        )
                                                                    }
                                                                >
                                                                    <img
                                                                        src={
                                                                            subCat.image ||
                                                                            '/placeholder-category.jpg'
                                                                        }
                                                                        alt={
                                                                            subCat.name
                                                                        }
                                                                        onError={
                                                                            handleImageError
                                                                        }
                                                                        className="w-6 h-6 object-cover rounded-md border border-border/60 flex-shrink-0"
                                                                    />
                                                                    <span className="text-xs font-medium line-clamp-1">
                                                                        {
                                                                            subCat.name
                                                                        }
                                                                    </span>
                                                                </Link>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="w-full bg-card border border-border/80 shadow-xs rounded-2xl overflow-hidden flex flex-col">
                        <div className="px-4 py-4 sm:px-6 bg-card border-b border-border/80 text-foreground">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <h1 className="text-ellipsis uppercase flex gap-2 items-baseline text-highlight font-display text-base sm:text-lg">
                                    {categoryName || 'Tất cả sản phẩm'}
                                    <span className="text-xs sm:text-sm text-muted-foreground font-normal lowercase">
                                        ({totalCount} sản phẩm)
                                    </span>
                                </h1>

                                {/* Filter */}
                                <div className="flex flex-row gap-2 w-full sm:w-auto text-xs sm:text-sm">
                                    <button
                                        onClick={() =>
                                            setShowFilters(!showFilters)
                                        }
                                        className="h-9 sm:h-10 px-4 flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-foreground transition-all shadow-xs"
                                    >
                                        <IoFilter className="text-primary text-sm" />
                                        <span className="font-medium">Lọc</span>
                                    </button>

                                    <div className="h-9 sm:h-10 sm:w-44 w-full px-3 flex items-center gap-2 rounded-xl border border-border/80 bg-background/80 text-foreground shadow-xs">
                                        <select
                                            value={sortBy}
                                            onChange={handleSortChange}
                                            className="w-full bg-transparent text-xs sm:text-sm focus:outline-none cursor-pointer appearance-none text-foreground"
                                        >
                                            <option value="newest" className="bg-card text-foreground">
                                                Mới nhất
                                            </option>
                                            <option value="price_asc" className="bg-card text-foreground">
                                                Giá tăng dần
                                            </option>
                                            <option value="price_desc" className="bg-card text-foreground">
                                                Giá giảm dần
                                            </option>
                                            <option value="popular" className="bg-card text-foreground">
                                                Phổ biến
                                            </option>
                                        </select>
                                        <FaSort className="text-muted-foreground text-xs flex-shrink-0" />
                                    </div>
                                </div>
                            </div>

                            {showFilters && (
                                <div className="mt-4 p-4 rounded-xl border border-border/80 bg-background/60 shadow-xs sm:text-base text-sm">
                                    <div className="flex justify-between items-center mb-3 text-foreground">
                                        <h4 className="font-semibold text-sm">
                                            {isFiltering
                                                ? 'Đang lọc...'
                                                : 'Lọc theo khoảng giá'}
                                        </h4>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setPriceRange({
                                                    min: '',
                                                    max: '',
                                                });
                                                setSortBy('newest');
                                            }}
                                            className="text-xs font-medium border-primary/40 text-primary hover:bg-primary/10"
                                        >
                                            Đặt lại bộ lọc
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-foreground font-medium sm:text-sm text-xs">
                                        <div>
                                            <label className="block text-xs text-muted-foreground mb-1">
                                                Giá thấp nhất (đ)
                                            </label>
                                            <Input
                                                type="number"
                                                name="min"
                                                value={priceRange.min}
                                                onChange={handlePriceChange}
                                                placeholder="Từ 0đ"
                                                className="w-full rounded-xl border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 bg-background"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-muted-foreground mb-1">
                                                Giá cao nhất (đ)
                                            </label>
                                            <Input
                                                type="number"
                                                name="max"
                                                value={priceRange.max}
                                                onChange={handlePriceChange}
                                                placeholder="Đến"
                                                className="w-full rounded-xl border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 bg-background"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-6">
                                {Array(8)
                                    .fill(null)
                                    .map((_, index) => (
                                        <div
                                            key={index}
                                            className="w-full"
                                        >
                                            <CardLoading />
                                        </div>
                                    ))}
                            </div>
                        ) : data.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="text-muted-foreground mb-4">
                                    <svg
                                        className="sm:w-16 sm:h-16 h-12 w-12 mx-auto stroke-muted-foreground/60"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                                    Không tìm thấy sản phẩm
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-6">
                                {data.map((product, index) => (
                                    <div
                                        key={product._id}
                                        ref={
                                            index === data.length - 1
                                                ? lastProductRef
                                                : null
                                        }
                                        className="w-full"
                                    >
                                        <ProductCard data={product} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {loadingMore && (
                            <div className="flex justify-center p-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showScrollToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-24 sm:bottom-28 right-4 sm:right-8 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2
                    focus:ring-primary bg-primary text-primary-foreground shadow-lg rounded-full p-3 sm:p-3.5 z-50 flex items-center justify-center"
                    aria-label="Lên đầu trang"
                >
                    <FaArrowUp size={18} />
                </button>
            )}
        </section>
    );
};

export default React.memo(ProductListPage);
