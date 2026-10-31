import UserModel from "../models/user.model.js";

export const admin = async (request, response, next) => {
    try {
        if (!request.userId) {
            return response.status(401).json({
                message: "Yêu cầu xác thực",
                error: true,
                success: false
            });
        }

        const user = await UserModel.findById(request.userId);

        if (!user) {
            return response.status(401).json({
                message: "Người dùng không tồn tại",
                error: true,
                success: false
            });
        }

        if (user.role !== "MANAGER") {
            return response.status(403).json({
                message: "Bạn không có quyền truy cập",
                error: true,
                success: false
            });
        }

        return next();
    } catch (error) {
        return response.status(500).json({
            message: "Không thể xác minh quyền truy cập",
            error: true,
            success: false
        });
    }
};
