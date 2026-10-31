import mongoose from "mongoose";

const cartProductSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.ObjectId,
        ref: "product",
    },
    quantity: {
        type: Number,
        default: 1,
    },
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "user",
    },
    notes: {
        type: String,
        default: ""
    },
    selectedOptions: [
        {
            optionName: String, // e.g., "Size"
            choiceName: String, // e.g., "L"
            priceModifier: Number // e.g., 5000
        }
    ]
}, {
    timestamps: true
})

const CartProductModel = mongoose.model("cartProduct", cartProductSchema)

export default CartProductModel