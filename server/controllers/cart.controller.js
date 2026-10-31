import UserModel from "../models/user.model.js";
import CartProductModel from './../models/cartProduct.model.js';

export const addToCartItemController = async (request, response) => {
    try {
        const userId = request.userId
        const { productId, notes, selectedOptions } = request.body

        if (!productId) {
            return response.status(402).json({
                message: "Vui lòng cung cấp productId",
                error: true,
                success: false
            })
        }

        // Check if item exists with SAME options
        // Note: Deep comparison of selectedOptions would be ideal, but for now we might just create new entry
        // or check exact match. For simplicity in restaurant ordering, we often allow multiple entries of same product
        // if they have different notes/options.
        // Let's modify to allow duplicates if options/notes differ, or just always add new line item for simplicity?
        // "Tech Shop" logic was single item per product. Restaurant logic usually requires separate lines for "Coke (No Ice)" vs "Coke (Less Ice)".

        // Strategy: Always create new cart item for restaurant mode to support different customizations
        // OR: Check if an item with exact same productId, notes AND selectedOptions exists.

        // For now, let's keep it simple: If options/notes are provided, treat as unique item.
        // If no options/notes, fallback to old logic?
        // Actually, best to just allow multiple entries for same product in restaurant context.
        // But to avoid breaking existing "Tech Shop" flow completely if used mixed:

        // Let's try to find an existing item with same ProductID AND same Options/Notes
        // Converting objects to string for comparison is a quick hack for deep equality of simple objects
        const optionsString = JSON.stringify(selectedOptions || []);
        const notesString = notes || "";

        // Find all cart items for this user and product
        const existingItems = await CartProductModel.find({
            userId: userId,
            productId: productId
        });

        let existingItemMatch = null;
        for (const item of existingItems) {
            const itemOptionsString = JSON.stringify(item.selectedOptions || []);
            const itemNotesString = item.notes || "";
            if (itemOptionsString === optionsString && itemNotesString === notesString) {
                existingItemMatch = item;
                break;
            }
        }

        if (existingItemMatch) {
            return response.status(400).json({
                message: "Sản phẩm với tùy chọn này đã có trong giỏ hàng",
                error: true,
                success: false
            })
        }

        const cartItem = new CartProductModel({
            quantity: 1,
            userId: userId,
            productId: productId,
            notes: notes,
            selectedOptions: selectedOptions
        })
        const save = await cartItem.save()

        const updateCartUser = await UserModel.updateOne({ _id: userId }, {
            $push: {
                shopping_cart: save._id
            }
        })

        return response.json({
            data: save,
            message: "Sản phẩm đã được thêm vào giỏ hàng",
            error: false,
            success: true
        })


    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const getCartItemController = async (request, response) => {
    try {
        const userId = request.userId

        const cartItem = await CartProductModel.find({
            userId: userId
        }).populate('productId')

        return response.json({
            data: cartItem,
            error: false,
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const updateCartItemQtyController = async (request, response) => {
    try {
        const userId = request.userId
        const { _id, qty, notes, selectedOptions } = request.body

        if (!_id || !qty) {
            return response.status(400).json({
                message: "Vui lòng cung cấp _id, qty",
                error: true,
                success: false
            })
        }

        const updateFields = { quantity: qty };
        if (notes !== undefined) updateFields.notes = notes;
        if (selectedOptions !== undefined) updateFields.selectedOptions = selectedOptions;

        const updateCartitem = await CartProductModel.updateOne({
            _id: _id,
            userId: userId
        }, updateFields)

        return response.json({
            message: "Cập nhật giỏ hàng",
            success: true,
            error: false,
            data: updateCartitem
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

export const deleteCartItemQtyController = async (request, response) => {
    try {
        const userId = request.userId // middleware
        const { _id } = request.body

        if (!_id) {
            return response.status(400).json({
                message: "Vui lòng cung cấp _id",
                error: true,
                success: false
            })
        }

        const deleteCartItem = await CartProductModel.deleteOne({ _id: _id, userId: userId })

        // Cũng cần xóa reference từ User.shopping_cart
        await UserModel.updateOne(
            { _id: userId },
            { $pull: { shopping_cart: _id } }
        )

        return response.json({
            message: "Sản phẩm đã được xóa",
            error: false,
            success: true,
            data: deleteCartItem
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}

// API để clear cart sau thanh toán (toàn bộ hoặc các sản phẩm được chọn)
export const clearCartController = async (request, response) => {
    try {
        const userId = request.userId
        const { selectedProductIds } = request.body // Danh sách productId được chọn (optional)

        let deleteResult, userUpdateResult;

        if (selectedProductIds && selectedProductIds.length > 0) {
            // Tìm cart items cần xóa
            const cartItemsToDelete = await CartProductModel.find({
                userId: userId,
                productId: { $in: selectedProductIds }
            });
            const cartItemIds = cartItemsToDelete.map(item => item._id);

            // Xóa cart items được chọn
            deleteResult = await CartProductModel.deleteMany({
                userId: userId,
                productId: { $in: selectedProductIds }
            });

            // Xóa references từ User.shopping_cart
            userUpdateResult = await UserModel.updateOne(
                { _id: userId },
                { $pull: { shopping_cart: { $in: cartItemIds } } }
            );
        } else {
            // Xóa tất cả cart items của user (logic cũ)
            deleteResult = await CartProductModel.deleteMany({ userId: userId });

            userUpdateResult = await UserModel.updateOne(
                { _id: userId },
                { $set: { shopping_cart: [] } }
            );
        }

        return response.json({
            message: selectedProductIds && selectedProductIds.length > 0
                ? "Đã xóa các sản phẩm được chọn"
                : "Giỏ hàng đã được xóa",
            error: false,
            success: true,
            data: { deletedCount: deleteResult.deletedCount }
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false
        })
    }
}