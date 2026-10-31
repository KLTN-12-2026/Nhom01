import React from 'react';
import { useSelector } from 'react-redux';
import CategoryWiseProductDisplay from './../components/CategoryWiseProductDisplay';
import { CategoryPanel } from '../components/home/category-panel';
import { LogoMarquee } from '../components/home/logo-marquee';
import { AppverseFooter } from '../components/home/appverse-footer';
import { HeroSection } from '../components/home/HeroSection';
import { FeaturesSection } from '../components/home/FeaturesSection';

const Home = () => {
    const categoryData = useSelector((state) => state.product.allCategory);

    return (
        <div className="relative min-h-screen">
            {/* Content - position relative để nổi lên trên background */}
            <div className="relative z-10">
                {/* Hero Section */}
                <HeroSection />

                {/* Features Section */}
                <FeaturesSection />

                {/* Category Panel */}
                <div className="py-8">
                    <CategoryPanel />
                </div>

                {/* Logo Marquee */}
                {/* <LogoMarquee /> */}

                {/* Display Category Product */}
                <section className="py-12">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                                Thực Đơn Của Chúng Tôi
                            </h2>
                            <p className="text-foreground/80 max-w-2xl mx-auto">
                                Khám phá các món ăn đa dạng, được chế biến từ
                                nguyên liệu tươi ngon
                            </p>
                        </div>

                        <div className="flex flex-col gap-12">
                            {categoryData?.map((c, index) => {
                                return (
                                    <CategoryWiseProductDisplay
                                        key={
                                            c?._id + 'CategoryWiseProduct' ||
                                            index
                                        }
                                        id={c?._id}
                                        name={c?.name}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </section>

                <AppverseFooter />
            </div>
        </div>
    );
};

export default Home;
