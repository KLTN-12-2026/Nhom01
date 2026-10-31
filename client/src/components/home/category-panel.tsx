// @ts-nocheck
import { useSelector } from 'react-redux';
import { Button } from '../ui/button';
import LazyVideo from './lazy-video';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { valideURLConvert } from '../../utils/valideURLConvert';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { useDispatch } from 'react-redux';
import { setAllCategory } from '@/store/productSlice';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import toast from 'react-hot-toast';

export function CategoryPanel() {
    const loadingCategory = useSelector(
        (state) => state.product.loadingCategory
    );
    const categoryData = useSelector((state) => state.product.allCategory);
    const navigate = useNavigate();
    const containerRef = useRef();

    const firstCategory = categoryData?.[0];

    const handleRedirectProductListPage = (id, cat) => {
        const url = `/${valideURLConvert(cat)}-${id}`;
        navigate(url);
    };

    const handleExploreClick = () => {
        handleRedirectProductListPage(firstCategory._id, firstCategory.name);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const buttonNew = (
        <Button
            onClick={() => {
                handleExploreClick();
                scrollToTop();
            }}
            className="rounded-full bg-background px-6 text-highlight font-bold hover:bg-background/80 transition-all"
        >
            Khám phá ngay
        </Button>
    );

    return (
        <section className="relative isolate overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center justify-center py-14 sm:py-20">
                    <div className="mb-5 flex items-center gap-2">
                        <img
                            src={logo}
                            alt="RestoHub logo"
                            width={30}
                            height={30}
                        />
                        <p className="text-sm uppercase tracking-[0.25em] text-highlight font-extrabold">
                            RestoHub Restaurant
                        </p>
                    </div>
                    <h1 className="mt-3 text-center text-baseColor text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl uppercase grid gap-2">
                        <span className="block">Ẩm thực</span>
                        <span className="block text-highlight">tinh hoa</span>
                        <span className="block">Hương vị đẳng cấp</span>
                    </h1>
                    <div className="mt-6">{buttonNew}</div>

                    {/* Categories with navigation */}
                    <div className="mt-10 relative w-full">
                        {categoryData?.length > 0 && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                                <button
                                    onClick={() => {
                                        if (containerRef.current) {
                                            containerRef.current.scrollBy({
                                                left: -300,
                                                behavior: 'smooth',
                                            });
                                        }
                                    }}
                                    className="bg-foreground/20 backdrop-blur-sm p-2 rounded-full hover:bg-foreground/50 transition-colors"
                                    aria-label="Previous categories"
                                >
                                    <ChevronLeft className="w-6 h-6 text-highlight_2" />
                                </button>
                            </div>
                        )}

                        <div
                            ref={containerRef}
                            className="flex overflow-x-auto scrollbar-hide space-x-4 py-2 px-2"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                            }}
                        >
                            {loadingCategory ? (
                                <div className="flex space-x-4">
                                    {Array(5)
                                        .fill(0)
                                        .map((_, i) => (
                                            <div
                                                key={i}
                                                className="h-64 w-64 flex-shrink-0 bg-gray-800 rounded-2xl animate-pulse"
                                            ></div>
                                        ))}
                                </div>
                            ) : (
                                <div className="flex space-x-4">
                                    {categoryData?.map((category, i) => {
                                        const gradients = [
                                            'from-[#0f172a] via-[#14532d] to-[#052e16]',
                                            'from-[#1e1b4b] via-[#1e40af] to-[#1e3a8a]',
                                            'from-[#431407] via-[#9a3412] to-[#7c2d12]',
                                            'from-[#1e1b4b] via-[#4338ca] to-[#312e81]',
                                            'from-[#4c0519] via-[#9f1239] to-[#831843]',
                                        ];

                                        return (
                                            <div
                                                key={category._id || i}
                                                className="flex-shrink-0 w-64 cursor-pointer"
                                                onClick={() =>
                                                    handleRedirectProductListPage(
                                                        category._id,
                                                        category.name
                                                    )
                                                }
                                            >
                                                <PhoneCard
                                                    title={category.name}
                                                    sub={
                                                        category.description ||
                                                        'Khám phá ngay'
                                                    }
                                                    tone="calm"
                                                    gradient={
                                                        gradients[
                                                            i % gradients.length
                                                        ]
                                                    }
                                                    videoSrc={category.video}
                                                    imageSrc={category.image}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {categoryData?.length > 0 && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                                <button
                                    onClick={() => {
                                        if (containerRef.current) {
                                            containerRef.current.scrollBy({
                                                left: 300,
                                                behavior: 'smooth',
                                            });
                                        }
                                    }}
                                    className="bg-foreground/20 backdrop-blur-sm p-2 rounded-full hover:bg-foreground/50 transition-colors"
                                    aria-label="Next categories"
                                >
                                    <ChevronRight className="w-6 h-6 text-highlight_2" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function PhoneCard({
    title = '8°',
    sub = 'Clear night. Great for render farm runs.',
    tone = 'calm',
    gradient = 'from-[#0f172a] via-[#14532d] to-[#052e16]',
    imageSrc,
}: {
    title?: string;
    sub?: string;
    tone?: string;
    gradient?: string;
    imageSrc?: string;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-[28px] p-[2px] transition-all duration-700 ease-out"
        >
            <div className="relative aspect-[9/19] w-full overflow-hidden rounded-2xl group">
                <img
                    src={imageSrc}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
                <div
                    className={`absolute rounded-2xl inset-0 bg-gradient-to-b from-black/80 to-white/10 transition-all duration-500 ${
                        isHovered
                            ? 'border-4 border-orange-500/80 dark:border-orange-400 bg-gradient-to-b from-black/50 to-cyan-500/30 transition-opacity duration-500 shadow-[0_0_25px_rgba(132,204,22,0.45)]'
                            : 'border border-transparent'
                    }`}
                />
            </div>
            <div className="absolute inset-0 flex flex-col justify-start p-6">
                <h3 className="text-xl font-bold text-orange-400">{title}</h3>
                <p className="text-sm font-semibold text-white">{sub}</p>
            </div>
        </div>
    );
}
