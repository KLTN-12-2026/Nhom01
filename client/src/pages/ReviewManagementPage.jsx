import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Star,
    MessageSquare,
    Reply,
    RefreshCw,
    Search,
    CornerDownRight,
    X,
    Filter
} from 'lucide-react';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import { formatTime } from '../utils/shiftTime';

export default function ReviewManagementPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [starFilter, setStarFilter] = useState('');
    const [repliedFilter, setRepliedFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [replyingId, setReplyingId] = useState(null);
    const [replyComment, setReplyComment] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    // Quick templates for manager reply
    const replyTemplates = [
        'Cảm ơn quý khách đã tin tưởng và ủng hộ nhà hàng! Rất mong được đón tiếp bạn trong những lần tiếp theo ❤️',
        'Nhà hàng rất vui vì bạn hài lòng với hương vị món ăn! Chúc bạn và gia đình có những trải nghiệm ẩm thực tuyệt vời.',
        'Nhà hàng chân thành cảm ơn ý kiến đóng góp quý báu của bạn và sẽ nhanh chóng hoàn thiện để phục vụ tốt hơn nữa!'
    ];

    const fetchAllReviews = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (starFilter) params.rating = starFilter;
            if (repliedFilter) params.replied = repliedFilter;
            if (searchTerm) params.search = searchTerm;

            const res = await Axios({
                ...SummaryApi.get_all_reviews,
                params
            });

            if (res.data.success) {
                setReviews(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching all reviews:', error);
            toast.error('Không thể tải danh sách đánh giá');
        } finally {
            setLoading(false);
        }
    }, [starFilter, repliedFilter, searchTerm]);

    useEffect(() => {
        fetchAllReviews();
    }, [fetchAllReviews]);

    const handleSendReply = async (reviewId) => {
        if (!replyComment.trim()) {
            toast.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        try {
            setSubmittingReply(true);
            const res = await Axios({
                url: SummaryApi.reply_review.url.replace(':id', reviewId),
                method: SummaryApi.reply_review.method,
                data: { comment: replyComment.trim() }
            });

            if (res.data.success) {
                toast.success('Đã gửi câu trả lời phản hồi khách hàng thành công!');
                setReplyingId(null);
                setReplyComment('');
                fetchAllReviews();
            }
        } catch (error) {
            console.error('Error replying to review:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi gửi phản hồi');
        } finally {
            setSubmittingReply(false);
        }
    };

    const totalReviews = reviews.length;
    const pendingReplies = reviews.filter((r) => !r.reply?.comment).length;
    const avgRating =
        totalReviews > 0
            ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
            : '5.0';

    const hasActiveFilters = Boolean(starFilter || repliedFilter || searchTerm);
    const clearFilters = () => {
        setStarFilter('');
        setRepliedFilter('');
        setSearchTerm('');
    };

    return (
        <section className="container mx-auto grid gap-6 max-w-6xl pb-10">
            {/* Header */}
            <Card className="p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-border/80 shadow-xs bg-card rounded-xl">
                <CardHeader className="p-0 space-y-1">
                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-foreground">
                        <span className="p-2 rounded-xl bg-amber-400/10 text-amber-500">
                            <Star className="h-6 w-6 fill-amber-400" />
                        </span>
                        Quản Lý & Phản Hồi Đánh Giá Khách Hàng
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                        Theo dõi phản hồi thực khách, đánh giá chất lượng món ăn và gửi câu trả lời hiển thị công khai
                    </CardDescription>
                </CardHeader>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAllReviews}
                        disabled={loading}
                        className="h-9 text-xs font-semibold flex items-center gap-1.5 rounded-xl cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`} />
                        Làm mới
                    </Button>
                </div>
            </Card>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-shadow hover:shadow-sm">
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">
                            Tổng đánh giá
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {totalReviews}
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Từ các đơn hàng đã phục vụ
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MessageSquare size={22} />
                    </div>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-shadow hover:shadow-sm">
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">
                            Điểm hài lòng TB
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1.5 tracking-tight">
                            {avgRating} <Star size={20} className="fill-amber-400 text-amber-400 shrink-0" />
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Thang điểm 5 sao
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Star size={22} className="fill-amber-400" />
                    </div>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6 flex items-center justify-between shadow-xs transition-shadow hover:shadow-sm">
                    <div className="space-y-1 min-w-0 pr-2">
                        <div className="text-[11px] sm:text-xs text-muted-foreground uppercase font-bold tracking-wider">
                            Chờ phản hồi
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                            {pendingReplies}
                        </div>
                        <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                            Cần gửi lời cảm ơn / giải đáp
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                        <Reply size={22} />
                    </div>
                </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3.5 sm:p-4 rounded-xl border border-border/80 shadow-xs">
                {/* Star Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                        <Filter size={13} /> Lọc sao:
                    </span>
                    {['', '5', '4', '3', '2', '1'].map((star) => {
                        const isActive = starFilter === star;
                        return (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setStarFilter(star)}
                                className={`inline-flex items-center gap-1 rounded-full text-xs h-7 px-3 font-semibold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-border/70'
                                }`}
                            >
                                {star === '' ? (
                                    'Tất cả'
                                ) : (
                                    <>
                                        <span>{star}</span>
                                        <Star
                                            size={11}
                                            className={isActive ? 'fill-current' : 'fill-amber-400 text-amber-400'}
                                        />
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Status & Search */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <select
                        value={repliedFilter}
                        onChange={(e) => setRepliedFilter(e.target.value)}
                        className="h-8.5 rounded-xl border border-input bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                        <option value="">Trạng thái phản hồi (Tất cả)</option>
                        <option value="false">Chờ phản hồi ({pendingReplies})</option>
                        <option value="true">Đã phản hồi</option>
                    </select>

                    <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm món / khách..."
                            className="pl-8 pr-7 h-8.5 text-xs w-full sm:w-56 rounded-xl"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                        >
                            Đặt lại
                        </Button>
                    )}
                </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <Card className="py-16 px-4 text-center text-muted-foreground border-dashed rounded-xl bg-card/50">
                        <div className="w-14 h-14 rounded-xl bg-muted/60 text-muted-foreground/60 flex items-center justify-center mx-auto mb-3">
                            <MessageSquare size={26} />
                        </div>
                        <p className="text-sm font-bold text-foreground">
                            {hasActiveFilters
                                ? 'Không tìm thấy đánh giá nào phù hợp với bộ lọc'
                                : 'Chưa có đánh giá nào từ khách hàng'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            {hasActiveFilters
                                ? 'Thử thay đổi số sao hoặc từ khóa tìm kiếm để xem các đánh giá khác.'
                                : 'Khi khách hàng hoàn tất đơn hàng và gửi đánh giá, các phản hồi sẽ hiển thị tại đây.'}
                        </p>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-4 text-xs rounded-xl cursor-pointer"
                            >
                                Xóa bộ lọc
                            </Button>
                        )}
                    </Card>
                ) : (
                    reviews.map((rev) => {
                        const isReplying = replyingId === rev._id;
                        const hasReply = Boolean(rev.reply?.comment);

                        return (
                            <Card key={rev._id} className="p-5 sm:p-6 space-y-4 border-border/80 shadow-xs hover:shadow-sm transition-shadow bg-card rounded-xl overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {rev.productId?.image?.[0] ? (
                                            <img
                                                src={rev.productId.image[0]}
                                                alt={rev.productId?.name}
                                                className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0">
                                                🍲
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-sm text-foreground truncate">
                                                {rev.productId?.name || 'Món ăn'}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star
                                                            key={s}
                                                            size={13}
                                                            className={
                                                                s <= rev.rating
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-muted-foreground/30'
                                                            }
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold text-amber-600">
                                                    ({rev.rating} sao)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right shrink-0">
                                        <div className="text-xs font-bold text-foreground">
                                            Khách hàng: {rev.userId?.name || 'Khách vãng lai'}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                            {formatTime(rev.createdAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Review content */}
                                <div className="text-sm text-foreground/90 leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/40 break-words whitespace-pre-wrap">
                                    "{rev.comment}"
                                </div>

                                {/* Existing reply if any */}
                                {hasReply && (
                                    <div className="p-3.5 sm:p-4 rounded-xl bg-orange-500/10 border-l-4 border-l-orange-500 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between font-bold text-orange-600">
                                            <span className="flex items-center gap-1.5">
                                                <CornerDownRight size={14} className="shrink-0" /> Phản hồi từ Nhà hàng ({rev.reply.repliedBy?.name || 'Quản lý'})
                                            </span>
                                            <span className="font-normal text-muted-foreground text-[11px] shrink-0">
                                                {formatTime(rev.reply.repliedAt)}
                                            </span>
                                        </div>
                                        <p className="text-foreground/90 leading-relaxed pl-5 break-words whitespace-pre-wrap">
                                            {rev.reply.comment}
                                        </p>
                                    </div>
                                )}

                                {/* Reply action button / form */}
                                {!isReplying ? (
                                    <div className="flex justify-end pt-1">
                                        <Button
                                            size="sm"
                                            variant={hasReply ? 'outline' : 'default'}
                                            onClick={() => {
                                                setReplyingId(rev._id);
                                                setReplyComment(rev.reply?.comment || '');
                                            }}
                                            className={`text-xs h-8 flex items-center gap-1.5 font-bold rounded-xl cursor-pointer ${
                                                !hasReply ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs' : ''
                                            }`}
                                        >
                                            <Reply size={14} />
                                            {hasReply ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá này'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3 pt-3 border-t border-border animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <label className="text-xs font-bold text-muted-foreground">
                                                Nội dung phản hồi hiển thị công khai:
                                            </label>
                                            <span className="text-[11px] text-muted-foreground">
                                                Nhấn mẫu bên dưới để điền nhanh
                                            </span>
                                        </div>

                                        {/* Quick templates */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {replyTemplates.map((t, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    title={t}
                                                    onClick={() => setReplyComment(t)}
                                                    className="text-[11px] bg-muted/60 hover:bg-muted text-foreground px-2.5 py-1 rounded-lg border border-border/80 font-medium text-left max-w-full sm:max-w-md truncate transition-colors cursor-pointer"
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>

                                        <Textarea
                                            value={replyComment}
                                            onChange={(e) => setReplyComment(e.target.value)}
                                            placeholder="Cảm ơn bạn đã phản hồi! Nhà hàng rất vui vì bạn thích món ăn..."
                                            rows={3}
                                            className="text-xs rounded-xl focus:ring-2 focus:ring-orange-500/20"
                                        />

                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setReplyingId(null);
                                                    setReplyComment('');
                                                }}
                                                className="text-xs h-8 font-semibold rounded-xl cursor-pointer"
                                            >
                                                Hủy
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={submittingReply}
                                                onClick={() => handleSendReply(rev._id)}
                                                className="text-xs h-8 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                                            >
                                                {submittingReply ? 'Đang lưu…' : 'Gửi phản hồi'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>
        </section>
    );
}
