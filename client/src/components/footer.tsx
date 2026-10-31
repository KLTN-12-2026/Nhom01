'use client';

import { useEffect, useState } from 'react';
import {
    Instagram,
    Twitter,
    Youtube,
    MessageCircle,
    Phone,
    Mail,
    MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterContent {
    tagline: string;
    copyright: string;
}

const defaultContent: FooterContent = {
    tagline:
        'Trải nghiệm ẩm thực đẳng cấp với những món ăn được chế biến từ nguyên liệu tươi ngon nhất. Phục vụ tận tâm, chất lượng đảm bảo.',
    copyright: '© 2025 — RestoHub Restaurant',
};

export function Footer() {
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
        <section className="liquid-glass-menu">
            {/* Footer */}
            <footer className="border-t border-white/10 pb-20 md:pb-10">
                <div className="container mx-auto px-4 py-10">
                    <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
                        {/* Brand */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xl font-semibold text-orange-400">
                                    🍽️ RestoHub Restaurant
                                </span>
                            </div>
                            <p className="max-w-sm text-sm">
                                {content.tagline}
                            </p>

                            {/* Contact Info */}
                            <div className="space-y-2 text-sm pt-2">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-orange-400" />
                                    <span>+84 123 456 789</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-orange-400" />
                                    <span>contact@restohub.vn</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-orange-400" />
                                    <span>123 Duy Tân, TP. Đà Nẵng</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-2">
                            {/* Quick Links */}
                            <div>
                                <h5 className="mb-2 text-xs font-semibold uppercase tracking-widest text-orange-400">
                                    Liên Kết
                                </h5>
                                <ul className="space-y-2 text-sm">
                                    <li>
                                        <Link
                                            to="/products"
                                            className="hover:text-orange-400 transition-colors"
                                        >
                                            Thực Đơn
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/booking"
                                            className="hover:text-orange-400 transition-colors"
                                        >
                                            Đặt Bàn
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/booking-with-preorder"
                                            className="hover:text-orange-400 transition-colors"
                                        >
                                            Đặt Bàn & Món
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/about"
                                            className="hover:text-orange-400 transition-colors"
                                        >
                                            Về Chúng Tôi
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Social Media */}
                            <div>
                                <h5 className="mb-2 text-xs font-semibold uppercase tracking-widest text-orange-400">
                                    Mạng Xã Hội
                                </h5>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Instagram className="h-4 w-4" />
                                        <a
                                            href="https://instagram.com/restohub"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-orange-400 transition-colors"
                                            aria-label="Follow RestoHub on Instagram"
                                        >
                                            Instagram
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Twitter className="h-4 w-4" />
                                        <a
                                            href="https://twitter.com/restohub"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-orange-400 transition-colors"
                                            aria-label="Follow RestoHub on Twitter"
                                        >
                                            X/Twitter
                                        </a>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Youtube className="h-4 w-4" />
                                        <a
                                            href="https://youtube.com/@restohub"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-orange-400 transition-colors"
                                            aria-label="Subscribe to RestoHub on YouTube"
                                        >
                                            YouTube
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div
                        className="mt-8 flex flex-col items-center justify-between gap-4 border-t
                    border-orange-400 dark:border-white/50 pt-6 text-xs sm:flex-row"
                    >
                        <p>{content.copyright}</p>
                        <div className="flex items-center gap-6">
                            <Link
                                to="/privacy"
                                className="hover:text-orange-400 transition-colors"
                            >
                                Chính Sách Bảo Mật
                            </Link>
                            <Link
                                to="/terms"
                                className="hover:text-orange-400 transition-colors"
                            >
                                Điều Khoản Sử Dụng
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </section>
    );
}
