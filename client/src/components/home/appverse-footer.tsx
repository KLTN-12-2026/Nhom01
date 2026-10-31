'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import GradientText from '../GradientText';

interface FooterContent {
    tagline: string;
    copyright: string;
}

const defaultContent: FooterContent = {
    tagline:
        'Trải nghiệm ẩm thực đẳng cấp với những món ăn được chế biến từ nguyên liệu tươi ngon nhất.',
    copyright: '© 2025 — RestoHub Restaurant',
};

export function AppverseFooter() {
    const [content, setContent] = useState<FooterContent>(defaultContent);

    useEffect(() => {
        const savedContent = localStorage.getItem('restaurant-content');
        if (savedContent) {
            try {
                const parsed = JSON.parse(savedContent);
                if (parsed.footer) {
                    setContent(parsed.footer);
                }
            } catch (error) {
                console.error('Error parsing saved content:', error);
            }
        }
    }, []);

    return (
        <section className="">
            <div className="container mx-auto px-4 py-8 sm:py-10">
                <Card className="relative overflow-hidden rounded-3xl liquid-glass p-6 sm:p-10">
                    <div className="relative grid items-center gap-8 md:grid-cols-2">
                        <div>
                            <p className="mb-2 text-xs tracking-widest text-orange-600 font-extrabold uppercase">
                                Món Đặc Biệt Trong Tuần
                            </p>
                            <h3 className="text-2xl font-bold leading-tight text-foreground/80 sm:text-3xl uppercase">
                                Combo Gia Đình Cao Cấp – Trọn Vẹn Hương Vị
                            </h3>
                            <p className="mt-2 max-w-prose text-sm text-foreground font-semibold">
                                Thưởng thức bữa ăn trọn vẹn với combo 4-6 người,
                                bao gồm các món chính, khai vị và tráng miệng
                                hấp dẫn. Giảm giá đặc biệt 20% khi đặt trước!
                            </p>
                        </div>

                        <div className="mx-auto w-full max-w-[320px]">
                            <div className="relative rounded-[28px] liquid-glass p-2 shadow-2xl">
                                <div className="relative aspect-[9/19] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900 via-amber-800 to-orange-900">
                                    <img
                                        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=800&fit=crop"
                                        className="absolute inset-0 h-full w-full object-cover opacity-60"
                                        alt="Featured combo dish"
                                    />
                                    <div className="relative p-3">
                                        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/20" />
                                        <div className="space-y-2 px-1">
                                            <GradientText
                                                colors={[
                                                    '#FF7F32',
                                                    '#FF6A13',
                                                    '#FF4500',
                                                    '#FFA500',
                                                    '#FFFFFF',
                                                    '#FF6347',
                                                    '#FF4500',
                                                    '#FFB84D',
                                                    '#FF7F50',
                                                    '#FF9966',
                                                ]}
                                                animationSpeed={5.5}
                                                showBorder={false}
                                                className="custom-class text-4xl font-extrabold"
                                            >
                                                Combo Gia Đình
                                            </GradientText>
                                            <p className="text-xs text-white text-justify">
                                                Phở Bò Đặc Biệt, Bún Chả Hà Nội,
                                                Nem Rán, Salad Tươi & Chè Thập
                                                Cẩm. Phục vụ 4-6 người.
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white font-bold">
                                                    -20%
                                                </div>
                                                <div className="inline-flex items-center rounded-full bg-lime-500 px-2 py-0.5 text-[10px] uppercase tracking-wider text-black font-bold">
                                                    Hot Deal
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </section>
    );
}
