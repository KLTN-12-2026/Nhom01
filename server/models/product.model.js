import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    image: {
        type: Array,
        default: [],
    },
    category: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'category',
        }
    ],
    subCategory: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'subCategory',
        }
    ],
    unit: {
        type: String,
        default: "",
    },
    stock: {
        type: Number,
        default: 0,
    },
    price: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    description: {
        type: String,
        default: "",
    },
    more_details: {
        type: Object,
        default: {}
    },
    publish: {
        type: Boolean,
        default: true,
    },
    // Trạng thái món ăn
    status: {
        type: String,
        enum: ['available', 'out_of_stock', 'seasonal'],
        default: 'available'
    },
    // Thời gian chuẩn bị (phút)
    preparationTime: {
        type: Number,
        default: 15,
        min: 0
    },
    // Món nổi bật/đặc biệt
    isFeatured: {
        type: Boolean,
        default: false
    },
    // Tùy chọn món ăn (Size, Topping, etc.)
    options: [
        {
            name: { type: String, required: true }, // e.g., "Size", "Đường", "Đá"
            type: { type: String, enum: ['radio', 'checkbox'], default: 'radio' }, // radio = chọn 1, checkbox = chọn nhiều
            choices: [
                {
                    name: { type: String, required: true }, // e.g., "M", "L", "50%"
                    priceModifier: { type: Number, default: 0 }, // Giá cộng thêm
                    isDefault: { type: Boolean, default: false }
                }
            ]
        }
    ],
}, {
    timestamps: true
})

// Tạo text index cho name & description với trọng số (weights)
productSchema.index(
    { name: "text", description: "text" },
    { weights: { name: 10, description: 5 } } // name ưu tiên cao hơn
);

// Indexes tối ưu hóa truy vấn theo danh mục, giá và ngày tạo
productSchema.index({ category: 1 });
productSchema.index({ subCategory: 1 });
productSchema.index({ category: 1, subCategory: 1 });
productSchema.index({ publish: 1 });
productSchema.index({ price: 1 });
productSchema.index({ createdAt: -1 });

const ProductModel = mongoose.model("product", productSchema)

export default ProductModel