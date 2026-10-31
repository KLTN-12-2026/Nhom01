import type React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import GlareHover from '../GlareHover';
import { FaFacebookSquare } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import toast from 'react-hot-toast';
import fetchUserDetails from '@/utils/fetchUserDetails';
import { setUserDetails } from '@/store/userSlice';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '../Loading';
import { useGoogleLogin } from '@react-oauth/google';
import { FaGoogle } from 'react-icons/fa';

export function LoginForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'form'>) {
    const [data, setData] = useState({
        email: '',
        password: '',
    });

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData((prev) => ({ ...prev, [name]: value }));
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        const validTLDs = [
            'com',
            'net',
            'org',
            'io',
            'co',
            'ai',
            'vn',
            'com.vn',
            'edu.vn',
            'gov.vn',
        ];
        if (!emailRegex.test(email)) return false;
        const domain = email.split('@')[1];
        const domainParts = domain.split('.');
        
        const isPartValid = validTLDs.some((tld) => {
            const tldParts = tld.split('.');
            const domainTLDPart = domainParts.slice(-tldParts.length).join('.');
            return domainTLDPart === tld;
        });

        if (!isPartValid) return false;
        if (
            email.includes('..') ||
            email.startsWith('.') ||
            email.endsWith('.') ||
            email.split('@')[0].endsWith('.')
        )
            return false;
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!data.email && !data.password) {
            toast.error('Vui lòng nhập đầy đủ thông tin.');
            return;
        }
        if (!data.email) {
            toast.error('Vui lòng nhập email');
            return;
        } else if (!validateEmail(data.email)) {
            toast.error('Vui lòng nhập địa chỉ email hợp lệ');
            return;
        }
        if (!data.password) {
            toast.error('Vui lòng nhập mật khẩu');
            return;
        }

        try {
            setLoading(true);
            const response = await Axios({ ...SummaryApi.login, data });

            if (response.data.error) {
                toast.error(response.data.message);
            }

            if (response.data.success) {
                toast.success(response.data.message);
                localStorage.setItem(
                    'accesstoken',
                    response.data.data.accessToken
                );
                localStorage.setItem(
                    'refreshToken',
                    response.data.data.refreshToken
                );

                const userDetails = await fetchUserDetails();
                dispatch(setUserDetails(userDetails.data));
                setData({ email: '', password: '' });
                navigate('/');
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    // Google OAuth — dùng useGoogleLogin (implicit flow) + custom button
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                setGoogleLoading(true);
                const response = await Axios({
                    ...SummaryApi.google_login,
                    data: { accessToken: tokenResponse.access_token },
                });

                if (response.data.error) {
                    toast.error(response.data.message);
                    return;
                }

                if (response.data.success) {
                    toast.success(response.data.message);
                    localStorage.setItem(
                        'accesstoken',
                        response.data.data.accessToken
                    );
                    localStorage.setItem(
                        'refreshToken',
                        response.data.data.refreshToken
                    );
                    const userDetails = await fetchUserDetails();
                    dispatch(setUserDetails(userDetails.data));
                    navigate('/');
                }
            } catch (error) {
                AxiosToastError(error);
            } finally {
                setGoogleLoading(false);
            }
        },
        onError: () => {
            toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.');
            setGoogleLoading(false);
        },
        flow: 'implicit',
    });

    return (
        <form
            className={cn(
                'flex flex-col gap-6 font-semibold text-foreground',
                className
            )}
            {...props}
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl">Đăng Nhập Vào Tài Khoản</h1>
                <p className="text-balance text-sm">
                    Nhập email của bạn bên dưới để đăng nhập vào tài khoản
                </p>
            </div>
            <div className="grid gap-6 font-bold">
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoFocus
                        placeholder="m@example.com"
                        onChange={handleChange}
                        value={data.email}
                        className="h-11 border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background/80 shadow-2xs"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Nhập mật khẩu"
                            onChange={handleChange}
                            value={data.password}
                            className="h-11 pr-10 border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl bg-background/80 shadow-2xs"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex items-center justify-between font-semibold text-highlight">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="remember"
                            className="rounded border-border cursor-pointer accent-primary"
                        />
                        <Label
                            htmlFor="remember"
                            className="text-sm cursor-pointer hover:opacity-80"
                        >
                            Ghi nhớ đăng nhập
                        </Label>
                    </div>
                    <Link
                        to={'/forgot-password'}
                        className="p-0 h-auto text-sm hover:opacity-80 cursor-pointer"
                    >
                        Quên mật khẩu?
                    </Link>
                </div>

                <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-11 font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    {loading ? <Loading /> : 'Đăng nhập'}
                </Button>

                <>
                    <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border/80">
                        <span className="relative z-10 bg-background px-3 py-0.5 rounded-md text-muted-foreground text-xs uppercase font-medium">
                            Hoặc đăng nhập với
                        </span>
                    </div>

                    <div className="text-foreground">
                        {/* Google — custom button */}
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 h-11 border border-border/80 hover:bg-muted text-foreground rounded-xl shadow-2xs cursor-pointer font-medium"
                            onClick={() => {
                                setGoogleLoading(true);
                                googleLogin();
                            }}
                            disabled={googleLoading}
                        >
                            {googleLoading ? (
                                <Loading />
                            ) : (
                                <>
                                    <FaGoogle className="text-red-500" />
                                    Google
                                </>
                            )}
                        </Button>
                    </div>
                </>
            </div>
            <div className="text-center text-sm">
                Bạn chưa có tài khoản?{' '}
                <Link
                    to={'/register'}
                    className="p-0 h-auto text-sm hover:opacity-80 cursor-pointer text-highlight"
                >
                    Đăng ký ngay.
                </Link>
            </div>
        </form>
    );
}
