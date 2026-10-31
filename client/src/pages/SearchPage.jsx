import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Axios from './../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import CardLoading from './../components/CardLoading';
import { debounce } from 'lodash';
import InfiniteScroll from 'react-infinite-scroll-component';
import { FaArrowUp, FaFilter } from 'react-icons/fa6';
import AxiosToastError from '../utils/AxiosToastError';
import NoData from '../components/NoData';
import Search from '@/components/Search';
import ProductCard from '@/components/product/product-card';
import LiquidEther from '@/components/LiquidEther';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import { RiResetLeftFill } from 'react-icons/ri';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const SearchPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPage, setTotalPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [initialProducts, setInitialProducts] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [initialPage, setInitialPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        sortBy: 'newest',
        category: 'all',
    });
    const [categories, setCategories] = useState([]);
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    const params = useLocation();

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        // Only allow numbers or empty string for price inputs
        if (
            (name === 'minPrice' || name === 'maxPrice') &&
            value !== '' &&
            !/^\d*$/.test(value)
        ) {
            return;
        }
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Fetch initial products with filters
    const fetchInitialProducts = useCallback(async () => {
        try {
            if (initialPage === 1) {
                setLoadingInitial(true);
            }

            const requestData = {
                page: initialPage,
                limit: 12,
                ...(filters.minPrice && {
                    minPrice: parseInt(filters.minPrice),
                }),
                ...(filters.maxPrice && {
                    maxPrice: parseInt(filters.maxPrice),
                }),
                sort: filters.sortBy,
                category:
                    filters.category !== 'all' ? filters.category : undefined,
            };

            const response = await Axios({
                ...SummaryApi.get_initial_products,
                data: requestData,
            });

            if (response.data.success) {
                setInitialProducts((prev) =>
                    initialPage === 1
                        ? response.data.data
                        : [...prev, ...response.data.data]
                );
                setHasMore(response.data.data.length === 12);
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoadingInitial(false);
        }
    }, [initialPage, filters]);

    // Fetch categories
    const fetchCategories = useCallback(async () => {
        try {
            const response = await Axios({
                ...SummaryApi.get_category,
                method: 'get',
            });
            if (response.data.success) {
                setCategories(response.data.data || []);
            }
        } catch (error) {
            AxiosToastError(error);
        }
    }, []);

    // Update search function to include filters
    const searchProduct = useCallback(
        debounce(async (query, pageNum = 1, isLoadMore = false) => {
            try {
                setLoading(true);
                const requestData = {
                    page: pageNum,
                    limit: 12,
                    search: query,
                    ...(filters.minPrice && {
                        minPrice: parseInt(filters.minPrice),
                    }),
                    ...(filters.maxPrice && {
                        maxPrice: parseInt(filters.maxPrice),
                    }),
                    sort: filters.sortBy,
                    ...(filters.category &&
                        filters.category !== 'all' && {
                            category: filters.category,
                        }),
                };

                const response = await Axios({
                    ...SummaryApi.search_product,
                    data: requestData,
                });

                if (response.data.success) {
                    setData((prevData) =>
                        isLoadMore
                            ? [...prevData, ...(response.data.data || [])]
                            : response.data.data || []
                    );
                    setTotalPage(response.data.totalNoPage || 1);
                    setTotalCount(response.data.totalCount || 0);
                    setHasMore(pageNum < (response.data.totalNoPage || 1));
                }
            } catch (error) {
                AxiosToastError(error);
            } finally {
                setLoading(false);
            }
        }, 300),
        [filters]
    );

    // Reset all filters
    const resetFilters = () => {
        setFilters({
            minPrice: '',
            maxPrice: '',
            sortBy: 'newest',
            category: 'all',
        });
        setSearchQuery('');
        setPage(1);
        setInitialPage(1);
        setInitialProducts([]);
    };

    // Reset to first page when filters change
    useEffect(() => {
        if (searchQuery) {
            setPage(1);
            searchProduct(searchQuery, 1);
        } else {
            setInitialPage(1);
            setInitialProducts([]);
        }
    }, [filters]);

    // Fetch initial products when component mounts or when initialPage/filters change
    useEffect(() => {
        const fetchData = async () => {
            if (!searchQuery) {
                await fetchInitialProducts();
            }
        };
        fetchData();
    }, [initialPage, filters, searchQuery, fetchInitialProducts]);

    // Fetch categories
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    // Load more initial products
    const loadMoreInitialProducts = () => {
        if (hasMore && !loadingInitial) {
            setInitialPage((prev) => prev + 1);
        }
    };

    // Load more results
    const loadMore = () => {
        if (page < totalPage && !loading && searchQuery) {
            const nextPage = page + 1;
            setPage(nextPage);
            searchProduct(searchQuery, nextPage, true);
        }
    };

    // Handle scroll to load more
    const handleScroll = useCallback(() => {
        if (
            window.innerHeight + document.documentElement.scrollTop + 1 >=
                document.documentElement.scrollHeight - 100 &&
            !loading &&
            page < totalPage &&
            searchQuery
        ) {
            loadMore();
        }
    }, [loading, page, totalPage, searchQuery]);

    // Add scroll event listener
    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    // Add filter UI component
    const renderFilterControls = () => (
        <div className="mb-6 bg-card border border-border/80 text-foreground p-5 rounded-2xl mt-3 shadow-xs">
            <div className="flex items-center justify-between mb-4">
                <h2 className="uppercase text-highlight font-display font-bold text-sm sm:text-base">
                    Bộ lọc
                </h2>
                <button
                    onClick={resetFilters}
                    className="hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all text-xs font-medium border border-border/80 px-3 py-1.5 rounded-xl shadow-2xs"
                >
                    <RiResetLeftFill />
                    Đặt lại
                </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 text-foreground">
                <div className="flex items-center gap-2.5 sm:text-sm text-xs">
                    <Label htmlFor="minPrice">Giá từ</Label>
                    <Input
                        type="text"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        placeholder="Thấp nhất"
                        className="w-24 text-sm border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background"
                    />
                    <span>-</span>
                    <Input
                        type="text"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        placeholder="Cao nhất"
                        className="w-24 text-sm border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background"
                    />
                    <span className="text-muted-foreground">VNĐ</span>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                    <Label htmlFor="sortBy">Sắp xếp</Label>
                    <Select
                        value={filters.sortBy}
                        onValueChange={(value) =>
                            handleFilterChange({
                                target: { name: 'sortBy', value },
                            })
                        }
                    >
                        <SelectTrigger className="w-36 text-sm border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background">
                            <SelectValue placeholder="Sắp xếp" />
                        </SelectTrigger>

                        <SelectContent className="bg-popover border border-border rounded-xl shadow-lg cursor-pointer">
                            <SelectItem
                                value="newest"
                                className="cursor-pointer"
                            >
                                Mới nhất
                            </SelectItem>
                            <SelectItem value="price_asc">
                                Giá tăng dần
                            </SelectItem>
                            <SelectItem value="price_desc">
                                Giá giảm dần
                            </SelectItem>
                            <SelectItem value="name_asc">Tên A-Z</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                    <Label htmlFor="category">Danh mục</Label>
                    <Select
                        value={filters.category}
                        onValueChange={(value) =>
                            handleFilterChange({
                                target: { name: 'category', value },
                            })
                        }
                    >
                        <SelectTrigger className="w-44 text-sm border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background">
                            <SelectValue placeholder="Danh mục" />
                        </SelectTrigger>

                        <SelectContent className="bg-popover border border-border rounded-xl shadow-lg cursor-pointer">
                            <SelectItem value="all" className="cursor-pointer">
                                Tất cả
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category._id}
                                    value={category._id}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );

    // Extract search query from URL
    useEffect(() => {
        const query = new URLSearchParams(params.search).get('q') || '';
        setSearchQuery(query);
        if (query) {
            setPage(1);
            searchProduct(query, 1);
        } else {
            setData([]);
            setLoading(false);
        }
    }, [params.search]);

    // Cuộn lên đầu trang
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollToTop(window.pageYOffset > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="relative min-h-screen py-6">
            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="block md:hidden mx-auto max-w-xl mb-4">
                    <Search />
                </div>

                {/* Filter Controls */}
                <div className="mb-6">
                    <Button
                        onClick={() => setShowFilters(!showFilters)}
                        variant="outline"
                        className="flex items-center gap-2 px-4 py-2 w-full sm:w-auto rounded-xl border border-border/80 bg-card hover:bg-muted text-foreground shadow-xs"
                    >
                        <FaFilter className="text-primary text-xs" />
                        <span className="font-semibold text-xs sm:text-sm">Bộ lọc tìm kiếm</span>
                    </Button>
                    {showFilters && renderFilterControls()}
                </div>

                <div
                    className={`w-full mx-auto mb-4 ${
                        !loading && searchQuery && data.length > 0
                            ? 'block'
                            : 'hidden'
                    }`}
                >
                    {!loading && searchQuery && data.length > 0 && (
                        <p className="text-sm text-foreground">
                            Tìm thấy{' '}
                            <span className="font-bold text-highlight">
                                {totalCount}
                            </span>{' '}
                            kết quả cho "{searchQuery}"
                        </p>
                    )}
                </div>

                {/* Search Results */}
                {searchQuery ? (
                    loading && page === 1 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                            {Array(12)
                                .fill(null)
                                .map((_, index) => (
                                    <CardLoading key={index} />
                                ))}
                        </div>
                    ) : data.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 h-full">
                                {data.map((product) => (
                                    <ProductCard
                                        key={product._id}
                                        data={product}
                                    />
                                ))}
                            </div>
                            {loading && page > 1 && (
                                <div className="flex justify-center mt-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-foreground py-12 bg-card border border-border/80 rounded-2xl shadow-xs">
                            <h3 className="text-lg font-semibold mb-1">
                                Không tìm thấy sản phẩm
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Không có sản phẩm nào phù hợp với từ khóa "
                                <span className="font-semibold text-highlight">
                                    {searchQuery}
                                </span>
                                "
                            </p>
                        </div>
                    )
                ) : (
                    /* Initial products display */
                    <InfiniteScroll
                        dataLength={initialProducts.length}
                        next={loadMoreInitialProducts}
                        hasMore={hasMore}
                    >
                        <div className="rounded-2xl pb-6 bg-card border border-border/80 p-5 sm:p-6 mb-6 shadow-xs">
                            <h2 className="border-b border-border/60 pb-3 uppercase text-highlight font-display font-bold text-base sm:text-lg">
                                Sản phẩm nổi bật
                            </h2>
                            <div className="text-center text-foreground py-6 grid gap-1">
                                <h3 className="text-base sm:text-lg font-semibold">
                                    Nhập từ khóa để tìm kiếm
                                </h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Tìm kiếm sản phẩm theo tên, danh mục hoặc hương vị
                                </p>
                            </div>
                            {loadingInitial ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                                    {Array(6)
                                        .fill(null)
                                        .map((_, index) => (
                                            <CardLoading key={index} />
                                        ))}
                                </div>
                            ) : initialProducts.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 h-full">
                                    {initialProducts.map((product) => (
                                        <ProductCard
                                            key={product._id}
                                            data={product}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <NoData />
                            )}
                        </div>
                    </InfiniteScroll>
                )}

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
            </div>
        </div>
    );
};

export default SearchPage;
