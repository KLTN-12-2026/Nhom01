import React, { useEffect, useState } from 'react';
import { TypeAnimation } from 'react-type-animation';
import { IoSearch } from 'react-icons/io5';
import { GiReturnArrow } from 'react-icons/gi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useMobile from '../hooks/useMobile';

const Search = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSearchPage, setIsSearchPage] = useState(false);
    const [isMobile] = useMobile();
    const params = useLocation();
    const searchText = params.search.slice(3);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const isSearch = location.pathname === '/search';
        setIsSearchPage(isSearch);
    }, [location]);

    const redirectToSearchPage = () => {
        navigate('/search');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleOnChange = (e) => {
        const value = e.target.value;
        const url = `/search?q=${value}`;
        setIsTyping(true);
        navigate(url);
        setTimeout(() => {
            setIsTyping(false);
        }, 200);
    };

    return (
        <search className="relative z-10 cursor-pointer max-w-2xl container mx-auto">
            <div
                className="md:px-6 px-3 h-10 sm:h-12 rounded-full border border-border/70 overflow-hidden
                flex items-center text-sm text-foreground liquid-glass shadow-xs group focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-200"
            >
                <div className="shrink-0 flex items-center justify-center">
                    {isMobile && isSearchPage ? (
                        <Link
                            to={'/'}
                            className="flex justify-center items-center h-8 w-8 text-foreground/70 hover:text-primary rounded-full"
                        >
                            <GiReturnArrow size={16} />
                        </Link>
                    ) : (
                        <div className="flex justify-center items-center h-full px-2 text-muted-foreground group-focus-within:text-primary transition-colors">
                            <IoSearch size={18} />
                        </div>
                    )}
                </div>
                <div className="w-full h-full outline-none flex items-center">
                    {!isSearchPage ? (
                        // Not in Search Page
                        <div
                            onClick={redirectToSearchPage}
                            className="w-full h-full flex items-center font-medium text-muted-foreground"
                        >
                            <TypeAnimation
                                sequence={[
                                    'Tìm kiếm "thịt bò..."',
                                    1000,
                                    'Tìm kiếm "hải sản..."',
                                    1000,
                                    'Tìm kiếm "lẩu nấm..."',
                                    1000,
                                    'Tìm kiếm "món khai vị..."',
                                    1000,
                                    'Tìm kiếm "combo gia đình..."',
                                    1000,
                                ]}
                                wrapper="span"
                                speed={60}
                                repeat={Infinity}
                            />
                        </div>
                    ) : (
                        // Search Page
                        <div className="relative w-full h-full outline-none flex items-center">
                            <input
                                type="text"
                                placeholder="Bạn muốn tìm món ăn gì hôm nay?"
                                autoFocus={true}
                                className="w-full h-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm font-medium"
                                defaultValue={searchText}
                                onChange={handleOnChange}
                                spellCheck={false}
                            />
                            {isTyping && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </search>
    );
};

export default Search;
