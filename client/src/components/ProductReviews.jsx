import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Star, MessageSquare, Send, CheckCircle2, CornerDownRight, ThumbsUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/shiftTime';

export default function ProductReviews({ productId, productName }) {
    const user = useSelector((state) => state.user);
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0, breakdown: {} });
    const [loading, setLoading] = useState(false);

    // Write review form state
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchReviews = useCallback(async () => {
        if (!productId) return;
        try {
            setLoading(true);
            const res = await Axios({
                url: SummaryApi.get_product_reviews.url.replace(':productId', productId),
                method: SummaryApi.get_product_reviews.method
            });
            if (res.data.success) {
                setReviews(res.data.data.reviews || []);
                setStats({
                    totalReviews: res.data.data.totalReviews || 0,
                    averageRating: res.data.data.averageRating || 0,
                    breakdown: res.data.data.breakdown || {}
                });
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user?._id) {
            toast.error('Vui lòng đăng nhập để đánh giá món ăn');
            return;
        }

        if (!comment.trim()) {
            toast.error('Vui lòng nhập nhận xét của bạn');
            return;
        }

        try {
            setSubmitting(true);
            const res = await Axios({
                ...SummaryApi.create_review,
                data: {
                    productId,
                    rating,
                    comment: comment.trim()
                }
            });

            if (res.data.success) {
                toast.success('Cảm ơn bạn đã gửi đánh giá cho món ăn!');
                setComment('');
                setShowForm(false);
                fetchReviews();
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSubmitting(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'K';
        return name
            .split(' ')
            .map((w) => w[0])
            .slice(-2)
            .join('')
            .toUpperCase();
    };

    const ratingDescriptions = {
        5: 'Tuyệt vời, hương vị xuất sắc!',
        4: 'Rất ngon, hài lòng',
        3: 'Bình thường, tạm ổn',
        2: 'Chưa hợp khẩu vị',
        1: 'Cần cải thiện nhiều'
    };

    return (
        <div className="space-y-6 pt-2">
            {/* Rating Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 bg-card border border-border p-6 rounded-3xl shadow-sm items-center">
                <div className="sm:col-span-4 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-border pb-4 sm:pb-0">
                    <span className="text-5xl font-black text-orange-500 tracking-tight">
                        {stats.averageRating > 0 ? stats.averageRating : '5.0'}
                    </span>
                    <div className="flex items-center gap-1 my-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={18}
                                className={
                                    star <= Math.round(stats.averageRating || 5)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300 dark:text-gray-600'
                                }
                            />
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                        {stats.totalReviews > 0
                            ? `Dựa trên ${stats.totalReviews} lượt đánh giá thực tế`
                            : 'Chưa có đánh giá nào'}
                    </span>
                </div>

                <div className="sm:col-span-8 flex flex-col justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 className="font-bold text-sm text-foreground">
                                Cảm nhận của thực khách
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Các đánh giá từ khách hàng đã thưởng thức món ăn
                            </p>
                        </div>
                        {user?._id ? (
                            <Button
                                size="sm"
                                onClick={() => setShowForm(!showForm)}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold self-start sm:self-auto h-9 px-4 rounded-xl shadow-sm"
                            >
                                {showForm ? 'Đóng form' : 'Viết đánh giá món'}
                            </Button>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">
                                Đăng nhập tài khoản để viết nhận xét
                            </span>
                        )}
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                        {[5, 4, 3, 2, 1].map((s) => {
                            const count = stats.breakdown[s] || 0;
                            const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                            return (
                                <div key={s} className="flex items-center gap-2.5">
                                    <span className="w-10 flex items-center gap-1 font-semibold">
                                        {s} <Star size={12} className="fill-amber-400 text-amber-400" />
                                    </span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full transition-all duration-300"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="w-8 text-right text-[11px] font-bold text-foreground">
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Write Review Form */}
            {showForm && (
                <form
                    onSubmit={handleSubmitReview}
                    className="p-5 sm:p-6 rounded-3xl border border-orange-500/30 bg-orange-500/5 space-y-4 animate-in fade-in duration-200"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="font-bold text-sm text-foreground">
                            Đánh giá món ăn: <span className="text-orange-600 font-black">{productName}</span>
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            size={24}
                                            className={
                                                star <= (hoverRating || rating)
                                                    ? 'fill-amber-400 text-amber-400 transition-colors'
                                                    : 'text-gray-300 dark:text-gray-600 transition-colors'
                                            }
                                        />
                                    </button>
                                ))}
                            </div>
                            <span className="text-xs font-bold text-amber-600 ml-1">
                                ({hoverRating || rating} ⭐ - {ratingDescriptions[hoverRating || rating]})
                            </span>
                        </div>
                    </div>

                    <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Hãy chia sẻ cảm nhận của bạn về hương vị món ăn, cách trình bày, độ nóng sốt..."
                        rows={3}
                        required
                        className="text-xs sm:text-sm bg-background rounded-xl border border-input focus:ring-2 focus:ring-orange-500"
                    />

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowForm(false)}
                            className="rounded-xl text-xs h-9"
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs h-9 px-5 shadow-sm"
                        >
                            {submitting ? 'Đang gửi…' : 'Gửi đánh giá ngay'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Reviews List */}
            <div className="space-y-3.5">
                {reviews.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border p-6">
                        <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-bold text-foreground">Chưa có đánh giá nào cho món ăn này.</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Hãy là người đầu tiên thưởng thức và chia sẻ cảm nhận của bạn!
                        </p>
                    </div>
                ) : (
                    reviews.map((rev) => (
                        <div
                            key={rev._id}
                            className="p-5 rounded-2xl border border-border bg-card space-y-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {rev.userId?.avatar ? (
                                        <img
                                            src={rev.userId.avatar}
                                            alt={rev.userId?.name || 'Khách hàng'}
                                            className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                                            {getInitials(rev.userId?.name)}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-sm text-foreground">
                                            {rev.userId?.name || 'Khách hàng'}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        size={12}
                                                        className={
                                                            star <= rev.rating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-gray-300 dark:text-gray-600'
                                                        }
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                · {formatTime(rev.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-1">
                                {rev.comment}
                            </p>

                            {/* Manager's Reply */}
                            {rev.reply?.comment && (
                                <div className="ml-4 sm:ml-8 mt-2 p-3.5 rounded-2xl bg-orange-500/10 border-l-4 border-l-orange-500 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-orange-600">
                                        <CornerDownRight size={13} />
                                        <span>Phản hồi từ Nhà hàng ({rev.reply.repliedBy?.name || 'Quản lý'})</span>
                                        {rev.reply.repliedAt && (
                                            <span className="font-normal text-[11px] text-muted-foreground">
                                                · {formatTime(rev.reply.repliedAt)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-foreground/90 pl-4 leading-relaxed">
                                        {rev.reply.comment}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}