import React from 'react';
import UserMenu from '../components/UserMenu';
import { FaLongArrowAltLeft } from 'react-icons/fa';

const UserMenuMobile = () => {
    return (
        <section className="bg-background text-foreground min-h-screen w-full py-6 px-4">
            <div className="container mx-auto pb-4 flex items-start gap-3">
                <button
                    onClick={() => window.history.back()}
                    className="text-foreground hover:text-primary transition-colors p-1"
                    aria-label="Quay lại"
                >
                    <FaLongArrowAltLeft size={22} />
                </button>
                <div className="w-full">
                    <UserMenu />
                </div>
            </div>
        </section>
    );
};

export default UserMenuMobile;
