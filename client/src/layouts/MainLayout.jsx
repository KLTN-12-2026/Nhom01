import { Footer } from '@/components/footer';
import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
    return (
        <>
            <Header />
            <main className="min-h-screen">
                <Outlet />
            </main>
            <Footer />
        </>
    );
}
