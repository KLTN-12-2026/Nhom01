import ReviewModel from "../models/review.model.js";
import ProductModel from "../models/product.model.js";
import UserModel from "../models/user.model.js";
import OrderModel from "../models/order.model.js";
import TableOrderModel from "../models/tableOrder.model.js";

// Customer creates a review
export async function createReview(request, response) {
    try {
        const userId = request.userId;
        const { productId, rating, comment, orderId } = request.body;

        if (!productId || !rating || !comment) {
            return response.status(400).json({
                message: "Vui lòng cung cấp đầy đủ thông tin đánh giá (món ăn, số sao, nhận xét)",
                error: true,
                success: false
            });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
            return response.status(404).json({
                message: "Không tìm thấy món ăn",
                error: true,
                success: false
            });
        }

        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return response.status(400).json({
                message: "Số sao đánh giá phải từ 1 đến 5",
                error: true,
                success: false
            });
        }

        const newReview = await ReviewModel.create({
            userId,
            productId,
            orderId: orderId || null,
            rating: numRating,
            comment: comment.trim()
        });

        const populatedReview = await ReviewModel.findById(newReview._id)
            .populate('userId', 'name avatar');

        return response.status(201).json({
            message: "Cảm ơn bạn đã gửi đánh giá!",
            error: false,
            success: true,
            data: populatedReview
        });
    } catch (error) {
        console.error("Error creating review:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi gửi đánh giá",
            error: true,
            success: false
        });
    }
}

// Get reviews for a single product (Public)
export async function getProductReviews(request, response) {
    try {
        const { productId } = request.params;

        const reviews = await ReviewModel.find({ productId })
            .sort({ createdAt: -1 })
            .populate('userId', 'name avatar')
            .populate('reply.repliedBy', 'name role');

        const totalReviews = reviews.length;
        let averageRating = 0;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        if (totalReviews > 0) {
            const sum = reviews.reduce((acc, r) => {
                const roundedStar = Math.round(r.rating);
                if (breakdown[roundedStar] !== undefined) {
                    breakdown[roundedStar] += 1;
                }
                return acc + r.rating;
            }, 0);
            averageRating = Number((sum / totalReviews).toFixed(1));
        }

        return response.status(200).json({
            message: "Lấy đánh giá thành công",
            error: false,
            success: true,
            data: {
                reviews,
                totalReviews,
                averageRating,
                breakdown
            }
        });
    } catch (error) {
        console.error("Error getting product reviews:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi lấy đánh giá",
            error: true,
            success: false
        });
    }
}

// Manager gets all reviews
export async function getAllReviews(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || user.role !== 'MANAGER') {
            return response.status(403).json({
                message: "Chỉ quản lý mới có quyền truy cập trang này",
                error: true,
                success: false
            });
        }

        const { rating, replied, search } = request.query;
        let query = {};

        if (rating && !isNaN(Number(rating))) {
            query.rating = Number(rating);
        }

        if (replied === 'true') {
            query['reply.comment'] = { $ne: null };
        } else if (replied === 'false') {
            query['reply.comment'] = null;
        }

        const reviews = await ReviewModel.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'name email avatar')
            .populate('productId', 'name image price')
            .populate('reply.repliedBy', 'name role');

        let filteredReviews = reviews;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredReviews = reviews.filter(r => 
                (r.comment && r.comment.toLowerCase().includes(searchLower)) ||
                (r.userId?.name && r.userId.name.toLowerCase().includes(searchLower)) ||
                (r.productId?.name && r.productId.name.toLowerCase().includes(searchLower))
            );
        }

        return response.status(200).json({
            message: "Lấy danh sách đánh giá thành công",
            error: false,
            success: true,
            data: filteredReviews
        });
    } catch (error) {
        console.error("Error getting all reviews:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi lấy danh sách đánh giá",
            error: true,
            success: false
        });
    }
}

// Manager replies to a review
export async function replyToReview(request, response) {
    try {
        const userId = request.userId;
        const user = await UserModel.findById(userId);

        if (!user || user.role !== 'MANAGER') {
            return response.status(403).json({
                message: "Chỉ quản lý mới có quyền phản hồi đánh giá",
                error: true,
                success: false
            });
        }

        const { id } = request.params;
        const { comment } = request.body;

        if (!comment || !comment.trim()) {
            return response.status(400).json({
                message: "Vui lòng nhập nội dung phản hồi",
                error: true,
                success: false
            });
        }

        const review = await ReviewModel.findById(id);
        if (!review) {
            return response.status(404).json({
                message: "Không tìm thấy đánh giá",
                error: true,
                success: false
            });
        }

        review.reply = {
            comment: comment.trim(),
            repliedBy: userId,
            repliedAt: new Date()
        };

        await review.save();

        const updatedReview = await ReviewModel.findById(id)
            .populate('userId', 'name avatar')
            .populate('productId', 'name image')
            .populate('reply.repliedBy', 'name role');

        return response.status(200).json({
            message: "Đã phản hồi đánh giá của khách hàng",
            error: false,
            success: true,
            data: updatedReview
        });
    } catch (error) {
        console.error("Error replying to review:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi phản hồi đánh giá",
            error: true,
            success: false
        });
    }
}

// Customer checks if they can review a product
export async function checkCanReview(request, response) {
    try {
        const userId = request.userId;
        const { productId } = request.params;

        // Check if user has already reviewed
        const existingReview = await ReviewModel.findOne({ userId, productId });

        // Check if user has ordered this product
        const hasOrder = await OrderModel.findOne({
            userId,
            productId,
            payment_status: { $in: ['Đã thanh toán', 'Thanh toán khi giao hàng'] }
        });

        return response.status(200).json({
            message: "Kiểm tra quyền đánh giá thành công",
            error: false,
            success: true,
            data: {
                hasReviewed: Boolean(existingReview),
                hasOrdered: Boolean(hasOrder),
                canReview: !existingReview
            }
        });
    } catch (error) {
        console.error("Error checking can review:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi kiểm tra quyền đánh giá",
            error: true,
            success: false
        });
    }
}

// Get user's own reviews
export async function getMyReviews(request, response) {
    try {
        const userId = request.userId;

        const reviews = await ReviewModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('productId', 'name image price')
            .populate('reply.repliedBy', 'name role');

        return response.status(200).json({
            message: "Lấy đánh giá của bạn thành công",
            error: false,
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error("Error getting user reviews:", error);
        return response.status(500).json({
            message: error.message || "Lỗi khi lấy đánh giá",
            error: true,
            success: false
        });
    }
}
