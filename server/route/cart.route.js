import { Router } from "express";
import auth from "../middleware/auth.js";
import {
    addToCartItemController,
    deleteCartItemQtyController,
    getCartItemController,
    updateCartItemQtyController,
    clearCartController
} from "../controllers/cart.controller.js";

const cartRouter = Router()

cartRouter.post('/add-to-cart-item', auth, addToCartItemController)
cartRouter.get('/get-cart-item', auth, getCartItemController)
cartRouter.put('/update-cart-item', auth, updateCartItemQtyController)
cartRouter.delete('/delete-cart-item', auth, deleteCartItemQtyController)
cartRouter.delete('/clear-cart', auth, clearCartController)

export default cartRouter