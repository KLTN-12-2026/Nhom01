import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NoData from '../components/NoData';
import { useGlobalContext } from '../provider/GlobalProvider';
import toast from 'react-hot-toast';
import { DisplayPriceInVND } from '../utils/DisplayPriceInVND';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import GlareHover from '@/components/GlareHover';
import { Button } from '@/components/ui/button';
import ViewImage from '@/components/ViewImage';
import { Star, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';

const MyOrders = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const orders = useSelector((state) => state.orders.data || []);
    const { fetchOrder } = useGlobalContext();

    const [imageURL, setImageURL] = useState('');
    const [reviewingOrder, setReviewingOrder] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    const handleSendReview = async (e) => {
        e.preventDefault();
        if (!reviewingOrder?.productId) return;
        if (!comment.trim()) {
            toast.error('Vui lòng nhập nhận xét của bạn');
            return;
        }

        try {
            setSubmittingReview(true);
            const res = await Axios({
                ...SummaryApi.create_review,
                data: {
                    productId: reviewingOrder.productId,
                    orderId: reviewingOrder.orderId,
                    rating,
                    comment: comment.trim()
                }
            });

            if (res.data.success) {
                toast.success('Cảm ơn bạn đã gửi đánh giá món ăn!');
                setReviewingOrder(null);
                setComment('');
                setRating(5);
            }
        } catch (error) {
            console.error('Error reviewing order:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleBuyAgain = (productId) => {
        navigate(`/product/${productId}`);
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const loadOrders = async () => {
            const accessToken = localStorage.getItem('accesstoken');
            if (!accessToken) return;

            try {
                await dispatch(fetchOrder());
            } catch (error) {
                toast.error(
                    'Không thể tải danh sách đơn hàng: ' + error.message
                );
            }
        };
        loadOrders();
    }, [dispatch, fetchOrder]);

    return (
        <section className="container mx-auto px-4 py-6 max-w-5xl z-10">
            {/* Header */}
            <Card className="py-5 px-6 mb-6 flex flex-row items-center justify-between gap-4 border-border/80 bg-card rounded-2xl shadow-xs">
                <CardHeader className="p-0">
                    <CardTitle className="text-xl sm:text-2xl text-highlight font-bold uppercase tracking-wide">
                        Lịch sử mua hàng
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                        Quản lý các đơn hàng của bạn
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-4">
                {!orders.length ? (
                    <div className="flex flex-col gap-4 items-center justify-center py-16 liquid-glass rounded-2xl border border-border/60">
                        <NoData message="Chưa có đơn hàng nào" />
                        <Button
                            onClick={() => navigate('/')}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-xs"
                        >
                            Mua sắm ngay!
                        </Button>
                    </div>
                ) : (
                    orders.map((order, index) => (
                        <div
                            key={order._id || index}
                            className="liquid-glass border border-border/70 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col gap-3 text-sm"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-muted-foreground">
                                        Mã đơn:
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {order?.orderId || 'N/A'}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {order?.createdAt &&
                                        new Date(order.createdAt).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 py-2">
                                <img
                                    src={
                                        order?.product_details?.image?.[0] ||
                                        '/placeholder.jpg'
                                    }
                                    alt={
                                        order?.product_details?.name ||
                                        'Product Image'
                                    }
                                    className="border border-border/80 w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl shadow-xs cursor-pointer hover:opacity-85 transition-opacity shrink-0"
                                    onError={(e) => {
                                        e.target.src = '/placeholder.jpg';
                                    }}
                                    onClick={() =>
                                        setImageURL(
                                            order?.product_details?.image?.[0]
                                        )
                                    }
                                />
                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                    <p className="font-semibold text-foreground text-sm sm:text-base line-clamp-2">
                                        {order?.product_details?.name ||
                                            'Sản phẩm không xác định'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Số lượng: {order?.quantity || 1}
                                    </p>
                                    <p className="text-primary font-bold text-base sm:text-lg">
                                        {DisplayPriceInVND(order?.totalAmt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">Thanh toán:</span>
                                    <span
                                        className={`px-2.5 py-1 rounded-full font-semibold ${
                                            order?.payment_status === 'Đã thanh toán'
                                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                                : order?.payment_status === 'Đã hủy'
                                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        }`}
                                    >
                                        {order?.payment_status || 'Chưa xác định'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">Trạng thái bếp:</span>
                                    <span
                                        className={`px-2.5 py-1 rounded-full font-semibold ${
                                            order?.status === 'pending'
                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                : order?.status === 'processing'
                                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                                : order?.status === 'shipped'
                                                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                                                : order?.status === 'delivered'
                                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {order?.status === 'pending'
                                            ? '⏳ Chờ chế biến'
                                            : order?.status === 'processing'
                                            ? '🔥 Bếp đang nấu'
                                            : order?.status === 'shipped'
                                            ? '✅ Món đã nấu xong'
                                            : order?.status === 'delivered'
                                            ? '🍽️ Đã phục vụ'
                                            : 'Đang xử lý'}
                                    </span>
                                </div>
                            </div>

                            {order?.payment_status === 'Đã hủy' && order?.cancelReason && (
                                <div className="bg-destructive/10 border-l-4 border-destructive p-3 rounded-r-xl text-xs text-destructive">
                                    <span className="font-semibold">Lý do hủy:</span> {order.cancelReason}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50">
                                <Button
                                    onClick={() => {
                                        setReviewingOrder(order);
                                        setRating(5);
                                        setComment('');
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl text-xs font-semibold flex items-center gap-1.5 text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                >
                                    <Star size={13} className="fill-amber-400 text-amber-400" />
                                    Đánh giá món
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleBuyAgain(order?.productId || '');
                                        scrollToTop();
                                    }}
                                    size="sm"
                                    className="rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                                >
                                    Mua lại
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {imageURL && (
                <ViewImage url={imageURL} close={() => setImageURL('')} />
            )}

            {/* Customer Review Dialog */}
            {reviewingOrder && (
                <Dialog open={Boolean(reviewingOrder)} onOpenChange={(open) => !open && setReviewingOrder(null)}>
                    <DialogContent className="max-w-md p-6 rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-amber-400/15 text-amber-500">
                                    <Star className="fill-amber-400 h-5 w-5" />
                                </span>
                                Đánh Giá Món Ăn
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Chia sẻ cảm nhận của bạn về món: <strong className="text-foreground">{reviewingOrder.product_details?.name}</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSendReview} className="space-y-4 pt-2">
                            <div className="flex flex-col items-center justify-center gap-2 py-3 bg-muted/30 rounded-2xl border border-border">
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            type="button"
                                            key={s}
                                            onClick={() => setRating(s)}
                                            className="p-1 focus:outline-none transition-transform hover:scale-125"
                                        >
                                            <Star
                                                size={28}
                                                className={
                                                    s <= rating
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-gray-300 dark:text-gray-600'
                                                }
                                            />
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs font-bold text-amber-600">
                                    {rating === 5
                                        ? 'Tuyệt vời, hương vị xuất sắc (5 sao)'
                                        : rating === 4
                                        ? 'Rất ngon, hài lòng (4 sao)'
                                        : rating === 3
                                        ? 'Bình thường, tạm ổn (3 sao)'
                                        : rating === 2
                                        ? 'Chưa hợp khẩu vị (2 sao)'
                                        : 'Rất tệ, cần cải thiện (1 sao)'}
                                </div>
                            </div>

                            <Textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Hãy chia sẻ cảm nhận của bạn về hương vị món ăn, cách trình bày, độ nóng sốt..."
                                rows={4}
                                required
                                className="text-xs sm:text-sm rounded-xl"
                            />

                            <div className="flex justify-end gap-2 pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setReviewingOrder(null)}
                                    className="rounded-xl text-xs h-9 font-semibold"
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingReview}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs h-9 px-5 shadow-sm"
                                >
                                    {submittingReview ? 'Đang gửi…' : 'Gửi đánh giá ngay'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    );
};

export default MyOrders;
