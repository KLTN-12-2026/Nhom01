import type React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useRef, useState } from 'react';
import GlareHover from '../GlareHover';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Axios from '@/utils/Axios';
import SummaryApi from '@/common/SummaryApi';
import toast from 'react-hot-toast';
import AxiosToastError from '@/utils/AxiosToastError';
import Loading from '../Loading';

export function OtpVerificationForm({
    className,
    ...props
}: React.ComponentPropsWithoutRef<'form'>) {
    const [data, setData] = useState(['', '', '', '', '', '']);
    const navigate = useNavigate();
    const inputRef = useRef<(HTMLInputElement | null)[]>([]);
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!location?.state?.email) {
            navigate('/forgot-password');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!data.join('')) {
            toast.error('Vui lòng nhập mã OTP');
            return;
        }

        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.forgot_password_otp_verification,
                data: {
                    otp: data.join(''),
                    email: location?.state?.email,
                },
            });

            if (response.data.error) {
                toast.error(response.data.message);
                return;
            }

            if (response.data.success) {
                toast.success(response.data.message);

                setData(['', '', '', '', '', '']);
                navigate('/reset-password', {
                    state: {
                        data: response.data,
                        email: location?.state?.email,
                    },
                });
            }
        } catch (error) {
            AxiosToastError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            className={cn(
                'flex flex-col gap-6 font-bold text-foreground',
                className
            )}
            {...props}
            onSubmit={handleSubmit}
        >
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Xác nhận OTP</h1>
                <p className="text-balance text-sm">
                    Nhập mã OTP đã được gửi đến email của bạn để tiếp tục quy
                    trình đặt lại mật khẩu.
                </p>
            </div>
            <div className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">Mã OTP</Label>
                    <div className="flex items-center justify-between gap-2">
                        {data.map((element, index) => {
                            return (
                                <Input
                                    key={'otp' + index}
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    id={`otp-${index}`}
                                    ref={(el) => {
                                        inputRef.current[index] = el;
                                    }}
                                    value={data[index]}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        const newData = [...data];
                                        newData[index] = value;
                                        setData(newData);

                                        if (value && index < 5) {
                                            inputRef.current[index + 1].focus();
                                        }
                                    }}
                                    maxLength={1}
                                    className="h-12 w-11 sm:w-12 text-highlight font-bold text-lg border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl
                                    bg-background no-spinner text-center shadow-2xs"
                                />
                            );
                        })}
                    </div>
                </div>

                <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full h-11 font-semibold rounded-xl shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    {loading ? <Loading /> : 'Xác nhận OTP'}
                </Button>
            </div>
            <div className="text-center text-sm">
                Nhớ mật khẩu?{' '}
                <Link
                    to={'/login'}
                    className="p-0 h-auto text-sm hover:text-opacity-80 font-medium cursor-pointer text-highlight"
                >
                    Quay lại đăng nhập.
                </Link>
            </div>
        </form>
    );
}
