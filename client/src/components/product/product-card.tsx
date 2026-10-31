'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Star, ShoppingCart } from 'lucide-react';
import { pricewithDiscount } from '../../utils/PriceWithDiscount';
import { DisplayPriceInVND } from '../../utils/DisplayPriceInVND';
import { MdAccessTime } from 'react-icons/md';
import { Link } from 'react-router-dom';
import AddToCartButton from '../AddToCartButton';

interface Product {
    _id: string;
    name: string;
    image: string[];
    unit: string;
    discount: number;
    price: number;
    stock: number;
}

interface ProductCardProps {
    data: Product;
}

export function ProductCard({ data }: ProductCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const url = `/product/${data.name.toLowerCase().replace(/\s+/g, '-')}-${
        data._id
    }`;

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Link
            to={url}
            onClick={scrollToTop}
            className="group block h-full select-none"
        >
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{
                    y: -4,
                    transition: { duration: 0.2 },
                }}
                className="h-full"
            >
                <Card
                    className="h-full rounded-2xl bg-card border border-border/70 hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="relative w-full aspect-square sm:aspect-[4/3] overflow-hidden bg-muted/30 shrink-0">
                        <img
                            src={data.image[0]}
                            alt={data.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {data.discount > 0 && (
                            <div className="absolute top-2.5 left-2.5 z-10">
                                <Badge className="bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs shadow-xs border-0">
                                    -{data.discount}%
                                </Badge>
                            </div>
                        )}
                    </div>

                    <CardContent className="p-3.5 flex flex-col flex-1 justify-between gap-3 text-foreground">
                        <div className="space-y-1.5">
                            <h3
                                title={data.name}
                                className="font-semibold text-sm sm:text-base leading-snug line-clamp-2 h-10 sm:h-11 text-foreground group-hover:text-primary transition-colors"
                            >
                                {data.name}
                            </h3>

                            <div className="flex items-baseline gap-2 pt-1">
                                <span className="text-primary font-bold text-base sm:text-lg">
                                    {DisplayPriceInVND(
                                        pricewithDiscount(
                                            data.price,
                                            data.discount
                                        )
                                    )}
                                </span>
                                {data.discount > 0 && (
                                    <span className="text-muted-foreground line-through text-xs sm:text-sm">
                                        {DisplayPriceInVND(data.price)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="w-full pt-1">
                            <AddToCartButton data={data} />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </Link>
    );
}

export default ProductCard;
