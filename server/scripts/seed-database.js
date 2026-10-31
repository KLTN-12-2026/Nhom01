import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import bcryptjs from "bcryptjs";

// Ensure SRV DNS records for MongoDB Atlas resolve properly on Windows networks
dns.setServers(['8.8.8.8', '1.1.1.1']);
import { generateTableQRCode } from "../utils/qrCodeGenerator.js";

import UserModel from "../models/user.model.js";
import CategoryModel from "../models/category.model.js";
import SubCategoryModel from "../models/subCategory.model.js";
import ProductModel from "../models/product.model.js";
import TableModel from "../models/table.model.js";
import BookingModel from "../models/booking.model.js";
import VoucherModel from "../models/voucher.model.js";
import OrderModel from "../models/order.model.js";
import TableOrderModel from "../models/tableOrder.model.js";
import ShiftModel from "../models/shift.model.js";
import AttendanceModel from "../models/attendance.model.js";
import PerformanceModel from "../models/performance.model.js";
import SupportChat from "../models/supportChat.model.js";
import CartProductModel from "../models/cartProduct.model.js";

dotenv.config();

if (!process.env.MONGODB_URL) {
    console.error("❌ Vui lòng cung cấp MONGODB_URL trong tệp .env");
    process.exit(1);
}

const getFallbackUri = (srvUri) => {
    if (srvUri.includes("mongodb+srv://") && srvUri.includes("cluster0.ipthm6l.mongodb.net")) {
        const authPart = srvUri.split("mongodb+srv://")[1].split("@")[0];
        const dbPart = srvUri.split("/")[3]?.split("?")[0] || "RestoHub";
        return `mongodb://${authPart}@ac-pxbhq9v-shard-00-00.ipthm6l.mongodb.net:27017,ac-pxbhq9v-shard-00-01.ipthm6l.mongodb.net:27017,ac-pxbhq9v-shard-00-02.ipthm6l.mongodb.net:27017/${dbPart}?ssl=true&replicaSet=atlas-a0rm7d-shard-0&authSource=admin&retryWrites=true&w=majority`;
    }
    return srvUri;
};

const seedDatabase = async () => {
    try {
        console.log("Connecting to MongoDB...");
        try {
            await mongoose.connect(process.env.MONGODB_URL);
        } catch (connErr) {
            console.warn("⚠️ MONGODB_URL connection failed:", connErr.message);
            console.log("Trying fallback connection string...");
            const fallbackUri = getFallbackUri(process.env.MONGODB_URL);
            if (fallbackUri !== process.env.MONGODB_URL) {
                console.log("Attempting fallback URI connection...");
                await mongoose.connect(fallbackUri);
            } else {
                throw connErr;
            }
        }
        console.log("✅ Connected to MongoDB");

        // 1. CLEAR COLLECTIONS
        console.log("\n--- Cleaning up existing test data ---");
        
        const deleteUsersResult = await UserModel.deleteMany({});
        console.log(`Deleted ${deleteUsersResult.deletedCount} users`);

        const deleteCategoriesResult = await CategoryModel.deleteMany({});
        console.log(`Deleted ${deleteCategoriesResult.deletedCount} categories`);

        const deleteSubCategoriesResult = await SubCategoryModel.deleteMany({});
        console.log(`Deleted ${deleteSubCategoriesResult.deletedCount} subcategories`);

        const deleteProductsResult = await ProductModel.deleteMany({});
        console.log(`Deleted ${deleteProductsResult.deletedCount} products`);

        const deleteTablesResult = await TableModel.deleteMany({});
        console.log(`Deleted ${deleteTablesResult.deletedCount} tables`);

        const deleteBookingsResult = await BookingModel.deleteMany({});
        console.log(`Deleted ${deleteBookingsResult.deletedCount} bookings`);

        const deleteVouchersResult = await VoucherModel.deleteMany({});
        console.log(`Deleted ${deleteVouchersResult.deletedCount} vouchers`);

        const deleteOrdersResult = await OrderModel.deleteMany({});
        console.log(`Deleted ${deleteOrdersResult.deletedCount} orders`);

        const deleteTableOrdersResult = await TableOrderModel.deleteMany({});
        console.log(`Deleted ${deleteTableOrdersResult.deletedCount} table orders`);

        const deleteShiftsResult = await ShiftModel.deleteMany({});
        console.log(`Deleted ${deleteShiftsResult.deletedCount} shifts`);

        const deleteAttendancesResult = await AttendanceModel.deleteMany({});
        console.log(`Deleted ${deleteAttendancesResult.deletedCount} attendances`);

        const deletePerformancesResult = await PerformanceModel.deleteMany({});
        console.log(`Deleted ${deletePerformancesResult.deletedCount} performances`);

        const deleteChatsResult = await SupportChat.deleteMany({});
        console.log(`Deleted ${deleteChatsResult.deletedCount} support chats`);

        const deleteCartsResult = await CartProductModel.deleteMany({});
        console.log(`Deleted ${deleteCartsResult.deletedCount} cart items`);

        // 2. SEED USERS
        console.log("\n--- Seeding Users ---");
        const salt = bcryptjs.genSaltSync(10);
        const hashedPassword = bcryptjs.hashSync("password123", salt);

        const usersData = [
            {
                name: "Admin User",
                email: "admin@restaurant.com",
                password: hashedPassword,
                role: "MANAGER",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Manager User",
                email: "manager@restaurant.com",
                password: hashedPassword,
                role: "MANAGER",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Waiter Binh",
                email: "waiter1@restaurant.com",
                password: hashedPassword,
                role: "WAITER",
                employeeId: "EMP-WAITER-001",
                hireDate: new Date("2026-01-15"),
                position: "Phục vụ bàn",
                employeeStatus: "active",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Waiter Dung",
                email: "waiter2@restaurant.com",
                password: hashedPassword,
                role: "WAITER",
                employeeId: "EMP-WAITER-002",
                hireDate: new Date("2026-02-10"),
                position: "Phục vụ bàn",
                employeeStatus: "active",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Chef Minh",
                email: "chef1@restaurant.com",
                password: hashedPassword,
                role: "CHEF",
                employeeId: "EMP-CHEF-001",
                hireDate: new Date("2025-10-01"),
                position: "Bếp trưởng",
                employeeStatus: "active",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Chef Lan",
                email: "chef2@restaurant.com",
                password: hashedPassword,
                role: "CHEF",
                employeeId: "EMP-CHEF-002",
                hireDate: new Date("2026-03-01"),
                position: "Phụ bếp",
                employeeStatus: "active",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Cashier Hoa",
                email: "cashier@restaurant.com",
                password: hashedPassword,
                role: "CASHIER",
                employeeId: "EMP-CASHIER-001",
                hireDate: new Date("2026-01-20"),
                position: "Thu ngân",
                employeeStatus: "active",
                verify_email: true,
                status: "Active"
            },
            {
                name: "Nguyễn Văn Khách",
                email: "customer1@gmail.com",
                password: hashedPassword,
                role: "USER",
                mobile: "0912345678",
                verify_email: true,
                status: "Active",
                rewardsPoint: 120
            },
            {
                name: "Trần Thị Khách",
                email: "customer2@gmail.com",
                password: hashedPassword,
                role: "USER",
                mobile: "0987654321",
                verify_email: true,
                status: "Active",
                rewardsPoint: 45
            },
            {
                name: "Lê Hoàng Anh",
                email: "customer3@gmail.com",
                password: hashedPassword,
                role: "USER",
                mobile: "0909090909",
                verify_email: true,
                status: "Active",
                rewardsPoint: 350
            }
        ];

        const usersDataWithGoogle = usersData.map((user, idx) => ({
            ...user,
            googleId: `google-mock-user-${idx}-${Date.now()}`
        }));

        const seededUsers = await UserModel.insertMany(usersDataWithGoogle);
        console.log(`✅ Seeded ${seededUsers.length} users successfully`);

        const adminUser = seededUsers.find(u => u.email === "admin@restaurant.com");
        const waiter1 = seededUsers.find(u => u.name === "Waiter Binh");
        const waiter2 = seededUsers.find(u => u.name === "Waiter Dung");
        const chef1 = seededUsers.find(u => u.name === "Chef Minh");
        const chef2 = seededUsers.find(u => u.name === "Chef Lan");
        const customer1 = seededUsers.find(u => u.email === "customer1@gmail.com");
        const customer2 = seededUsers.find(u => u.email === "customer2@gmail.com");
        const customer3 = seededUsers.find(u => u.email === "customer3@gmail.com");

        // 3. SEED CATEGORIES
        console.log("\n--- Seeding Categories ---");
        const categoriesData = [
            {
                name: "Khai vị",
                description: "Các món khai vị nhẹ nhàng, kích thích vị giác trước bữa ăn chính.",
                image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80"
            },
            {
                name: "Món chính",
                description: "Các món ăn chính đậm đà bản sắc ẩm thực Việt và các món lẩu nóng hổi.",
                image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"
            },
            {
                name: "Đồ uống",
                description: "Nước giải khát, nước ép, sinh tố tươi mát và các loại bia hảo hạng.",
                image: "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80"
            },
            {
                name: "Tráng miệng",
                description: "Các món bánh ngọt, kem và trái cây tươi mát kết thúc bữa tiệc hoàn hảo.",
                image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80"
            }
        ];

        const seededCategories = await CategoryModel.insertMany(categoriesData);
        console.log(`✅ Seeded ${seededCategories.length} categories successfully`);

        const catAppetizer = seededCategories.find(c => c.name === "Khai vị");
        const catMain = seededCategories.find(c => c.name === "Món chính");
        const catDrinks = seededCategories.find(c => c.name === "Đồ uống");
        const catDessert = seededCategories.find(c => c.name === "Tráng miệng");

        // 4. SEED SUB-CATEGORIES
        console.log("\n--- Seeding SubCategories ---");
        const subCategoriesData = [
            {
                name: "Súp & Salad",
                image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
                category: [catAppetizer._id]
            },
            {
                name: "Gỏi & Cuốn",
                image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
                category: [catAppetizer._id]
            },
            {
                name: "Món Lẩu",
                image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
                category: [catMain._id]
            },
            {
                name: "Món Nướng & Rán",
                image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
                category: [catMain._id]
            },
            {
                name: "Cơm & Mì",
                image: "https://images.unsplash.com/photo-1603133872878-685f588827c5?auto=format&fit=crop&w=600&q=80",
                category: [catMain._id]
            },
            {
                name: "Nước ngọt & Trà",
                image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80",
                category: [catDrinks._id]
            },
            {
                name: "Bia",
                image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80",
                category: [catDrinks._id]
            },
            {
                name: "Bánh & Kem",
                image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
                category: [catDessert._id]
            },
            {
                name: "Trái cây",
                image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80",
                category: [catDessert._id]
            }
        ];

        const seededSubCategories = await SubCategoryModel.insertMany(subCategoriesData);
        console.log(`✅ Seeded ${seededSubCategories.length} subcategories successfully`);

        const subSoupSalad = seededSubCategories.find(s => s.name === "Súp & Salad");
        const subGoiCuon = seededSubCategories.find(s => s.name === "Gỏi & Cuốn");
        const subLau = seededSubCategories.find(s => s.name === "Món Lẩu");
        const subNuongRan = seededSubCategories.find(s => s.name === "Món Nướng & Rán");
        const subComMi = seededSubCategories.find(s => s.name === "Cơm & Mì");
        const subNuocTra = seededSubCategories.find(s => s.name === "Nước ngọt & Trà");
        const subBia = seededSubCategories.find(s => s.name === "Bia");
        const subBanhKem = seededSubCategories.find(s => s.name === "Bánh & Kem");
        const subTraiCay = seededSubCategories.find(s => s.name === "Trái cây");

        // 5. SEED PRODUCTS
        console.log("\n--- Seeding Products ---");
        const productsData = [
            // Khai vị - Súp & Salad
            {
                name: "Soup Hải Sản Tóc Tiên",
                image: ["https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80"],
                category: [catAppetizer._id],
                subCategory: [subSoupSalad._id],
                unit: "Bát",
                stock: 90,
                price: 45000,
                discount: 0,
                description: "Súp hải sản nấu cùng nấm tuyết và tóc tiên đen, giàu dinh dưỡng, ấm bụng đầu bữa ăn.",
                preparationTime: 10,
                isFeatured: false
            },
            {
                name: "Salad Ức Gà Áp Chảo",
                image: ["https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"],
                category: [catAppetizer._id],
                subCategory: [subSoupSalad._id],
                unit: "Đĩa",
                stock: 75,
                price: 59000,
                discount: 10, // 10% off
                description: "Xà lách tươi trộn xốt Caesar kem béo ngậy ăn kèm ức gà áp chảo chín vàng mềm mọng nước.",
                preparationTime: 12,
                isFeatured: false
            },
            // Khai vị - Gỏi & Cuốn
            {
                name: "Gỏi Cuốn Tôm Thịt",
                image: ["https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80"],
                category: [catAppetizer._id],
                subCategory: [subGoiCuon._id],
                unit: "Đĩa",
                stock: 100,
                price: 35000,
                discount: 0,
                description: "Phần gỏi cuốn gồm 4 cuốn tôm thịt luộc, bún tươi, rau sống thơm nồng chấm cùng tương đậu phộng giã nhuyễn.",
                preparationTime: 8,
                isFeatured: true
            },
            // Món chính - Lẩu
            {
                name: "Lẩu Thái Hải Sản Thập Cẩm",
                image: ["https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80"],
                category: [catMain._id],
                subCategory: [subLau._id],
                unit: "Nồi",
                stock: 50,
                price: 380000,
                discount: 5,
                description: "Nước lẩu Thái chua cay chuẩn vị ăn cùng tôm, mực, ngao, cá viên, các loại nấm và rau ăn kèm tươi ngon.",
                preparationTime: 20,
                isFeatured: true,
                options: [
                    {
                        name: "Kích thước nồi lẩu",
                        type: "radio",
                        choices: [
                            { name: "Size M (2-3 người ăn)", priceModifier: 0, isDefault: true },
                            { name: "Size L (4-5 người ăn)", priceModifier: 120000, isDefault: false }
                        ]
                    },
                    {
                        name: "Cấp độ cay",
                        type: "radio",
                        choices: [
                            { name: "Không cay", priceModifier: 0, isDefault: false },
                            { name: "Cay vừa", priceModifier: 0, isDefault: true },
                            { name: "Cay nhiều", priceModifier: 0, isDefault: false }
                        ]
                    }
                ]
            },
            // Món chính - Nướng Rán
            {
                name: "Sườn Nướng BBQ Khổng Lồ",
                image: ["https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"],
                category: [catMain._id],
                subCategory: [subNuongRan._id],
                unit: "Đĩa",
                stock: 45,
                price: 249000,
                discount: 15,
                description: "Dẻ sườn heo bản lớn ướp xốt BBQ mật ong hảo hạng được nướng chậm giữ độ mềm mọng lý tưởng.",
                preparationTime: 25,
                isFeatured: true
            },
            // Món chính - Cơm & Mì
            {
                name: "Cơm Chiên Hải Sản Dương Châu",
                image: ["https://images.unsplash.com/photo-1603133872878-685f588827c5?auto=format&fit=crop&w=600&q=80"],
                category: [catMain._id],
                subCategory: [subComMi._id],
                unit: "Đĩa",
                stock: 120,
                price: 65000,
                discount: 0,
                description: "Hạt cơm đảo vàng tơi, giòn rụm xen kẽ lạp xưởng, tôm, mực xắt hạt lựu, cà rốt và đậu Hà Lan.",
                preparationTime: 12,
                isFeatured: false
            },
            {
                name: "Mì Xào Giòn Hải Sản",
                image: ["https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80"],
                category: [catMain._id],
                subCategory: [subComMi._id],
                unit: "Đĩa",
                stock: 80,
                price: 75000,
                discount: 0,
                description: "Vắt mì trứng được rán giòn phồng, phủ nước xốt sền sệt đậm đà của tôm, mực, bông cải xanh và nấm rơm.",
                preparationTime: 15,
                isFeatured: false
            },
            // Đồ uống - Nước ngọt & Trà
            {
                name: "Trà Đào Sả Cam Tươi",
                image: ["https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80"],
                category: [catDrinks._id],
                subCategory: [subNuocTra._id],
                unit: "Ly",
                stock: 150,
                price: 29000,
                discount: 0,
                description: "Trà đào thơm dịu hòa cùng nước cam tươi chua ngọt, hương sả ấm nồng và 3 miếng đào ngâm giòn ngọt.",
                preparationTime: 5,
                isFeatured: true,
                options: [
                    {
                        name: "Mức đường",
                        type: "radio",
                        choices: [
                            { name: "100% Đường", priceModifier: 0, isDefault: true },
                            { name: "70% Đường", priceModifier: 0, isDefault: false },
                            { name: "50% Đường", priceModifier: 0, isDefault: false }
                        ]
                    },
                    {
                        name: "Mức đá",
                        type: "radio",
                        choices: [
                            { name: "Đầy đá", priceModifier: 0, isDefault: true },
                            { name: "Ít đá", priceModifier: 0, isDefault: false },
                            { name: "Không đá", priceModifier: 0, isDefault: false }
                        ]
                    }
                ]
            },
            {
                name: "Cà Phê Sữa Đá Sài Gòn",
                image: ["https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80"],
                category: [catDrinks._id],
                subCategory: [subNuocTra._id],
                unit: "Ly",
                stock: 200,
                price: 25000,
                discount: 0,
                description: "Hạt cà phê Robusta rang xay pha phin truyền thống thơm nồng kết hợp sữa đặc béo ngậy.",
                preparationTime: 5,
                isFeatured: false
            },
            // Đồ uống - Bia
            {
                name: "Bia Heineken Lon",
                image: ["https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80"],
                category: [catDrinks._id],
                subCategory: [subBia._id],
                unit: "Lon",
                stock: 300,
                price: 22000,
                discount: 0,
                description: "Thương hiệu bia Premium cao cấp ướp lạnh, lý tưởng khi đi kèm các món nướng và lẩu.",
                preparationTime: 1,
                isFeatured: false
            },
            // Tráng miệng - Bánh & Kem
            {
                name: "Bánh Flan Caramel Mịn Màng",
                image: ["https://images.unsplash.com/photo-1528975604071-b4daaf779a4a?auto=format&fit=crop&w=600&q=80"],
                category: [catDessert._id],
                subCategory: [subBanhKem._id],
                unit: "Cái",
                stock: 110,
                price: 18000,
                discount: 0,
                description: "Bánh đúc từ sữa tươi và trứng gà ta siêu mịn, rưới xốt caramel đắng ngọt dễ chịu.",
                preparationTime: 2,
                isFeatured: false
            },
            {
                name: "Kem Trái Dừa Côn Đảo",
                image: ["https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80"],
                category: [catDessert._id],
                subCategory: [subBanhKem._id],
                unit: "Quả",
                stock: 60,
                price: 39000,
                discount: 0,
                description: "Kem dừa mát lạnh đựng trong quả dừa xiêm, rắc thêm cơm dừa sợi, lạc rang và sữa đặc thơm bùi.",
                preparationTime: 7,
                isFeatured: true
            },
            // Tráng miệng - Trái cây
            {
                name: "Đĩa Trái Cây Thập Cẩm Mùa Hè",
                image: ["https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80"],
                category: [catDessert._id],
                subCategory: [subTraiCay._id],
                unit: "Đĩa",
                stock: 50,
                price: 79000,
                discount: 0,
                description: "Các loại quả tươi thái miếng theo mùa gồm dưa hấu, xoài cát, dứa ngọt, thanh long chấm kèm muối ớt Tây Ninh.",
                preparationTime: 8,
                isFeatured: false
            }
        ];

        const seededProducts = await ProductModel.insertMany(productsData);
        console.log(`✅ Seeded ${seededProducts.length} products successfully`);

        const pSoup = seededProducts.find(p => p.name.includes("Soup"));
        const pGoiCuon = seededProducts.find(p => p.name.includes("Gỏi Cuốn"));
        const pLau = seededProducts.find(p => p.name.includes("Lẩu Thái"));
        const pSuon = seededProducts.find(p => p.name.includes("Sườn Nướng"));
        const pCom = seededProducts.find(p => p.name.includes("Cơm Chiên"));
        const pMi = seededProducts.find(p => p.name.includes("Mì Xào"));
        const pTraDao = seededProducts.find(p => p.name.includes("Trà Đào"));
        const pCafe = seededProducts.find(p => p.name.includes("Cà Phê"));
        const pBeer = seededProducts.find(p => p.name.includes("Bia Heineken"));
        const pFlan = seededProducts.find(p => p.name.includes("Bánh Flan"));
        const pKemDua = seededProducts.find(p => p.name.includes("Kem Trái Dừa"));

        // 6. SEED TABLES & AUTO-CREATE TABLE ACCOUNTS WITH QR CODES
        console.log("\n--- Seeding Tables & Table Accounts ---");
        const tablesData = [
            { tableNumber: "A01", capacity: 4, status: "available", location: "Tầng trệt", description: "Cạnh cửa sổ đón ánh sáng" },
            { tableNumber: "A02", capacity: 4, status: "occupied", location: "Tầng trệt", description: "Khu vực trung tâm" },
            { tableNumber: "A03", capacity: 2, status: "available", location: "Tầng trệt", description: "Thích hợp cho cặp đôi" },
            { tableNumber: "B01", capacity: 6, status: "reserved", location: "Tầng 1", description: "Bàn góc yên tĩnh" },
            { tableNumber: "B02", capacity: 8, status: "available", location: "Tầng 1", description: "Thích hợp họp nhóm/gia đình" },
            { tableNumber: "VIP01", capacity: 10, status: "available", location: "Phòng VIP", description: "Phòng lạnh VIP, khép kín tinh tế" },
            { tableNumber: "VIP02", capacity: 12, status: "occupied", location: "Phòng VIP", description: "Phòng hội nghị VIP có tivi máy chiếu" }
        ];

        const seededTables = [];

        for (const tbl of tablesData) {
            // Save table definition first
            const tableObj = new TableModel(tbl);
            const savedTable = await tableObj.save();

            // Create linked table account
            const tableEmail = `table_${savedTable.tableNumber.toLowerCase()}@internal.restaurant.com`;
            const tableUserObj = new UserModel({
                name: `Bàn ${savedTable.tableNumber}`,
                email: tableEmail,
                password: hashedPassword, // default "password123"
                role: "TABLE",
                linkedTableId: savedTable._id,
                verify_email: true,
                status: "Active",
                googleId: `google-mock-table-${savedTable.tableNumber}-${Date.now()}`
            });

            const savedTableUser = await tableUserObj.save();

            // Generate QR Code token & image using utility
            let qrToken = "";
            let qrImage = "";
            try {
                const qrResult = await generateTableQRCode(savedTable._id, savedTable.tableNumber);
                qrToken = qrResult.token;
                qrImage = qrResult.qrCodeImage;
            } catch (err) {
                console.log(`⚠️ Warning: QR Code generation failed for ${savedTable.tableNumber}, using mockup values.`);
                qrToken = `mock_token_${savedTable.tableNumber}_${Date.now()}`;
                qrImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            }

            // Update Table model with refs
            savedTable.tableAccountId = savedTableUser._id;
            savedTable.qrCodeToken = qrToken;
            savedTable.qrCode = qrImage;
            const finalizedTable = await savedTable.save();
            
            seededTables.push(finalizedTable);
            console.log(`Created Table: ${finalizedTable.tableNumber} | Account ID: ${savedTableUser._id}`);
        }
        console.log(`✅ Seeded ${seededTables.length} tables and table-users successfully`);

        const tA01 = seededTables.find(t => t.tableNumber === "A01");
        const tA02 = seededTables.find(t => t.tableNumber === "A02");
        const tA03 = seededTables.find(t => t.tableNumber === "A03");
        const tB01 = seededTables.find(t => t.tableNumber === "B01");
        const tVIP01 = seededTables.find(t => t.tableNumber === "VIP01");
        const tVIP02 = seededTables.find(t => t.tableNumber === "VIP02");

        // 7. SEED BOOKINGS
        console.log("\n--- Seeding Bookings ---");
        const now = new Date();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const bookingsData = [
            {
                customerName: "Nguyễn Văn Khách",
                phone: "0912345678",
                email: "customer1@gmail.com",
                tableId: tA01._id,
                numberOfGuests: 3,
                bookingDate: now,
                bookingTime: "19:00",
                status: "confirmed",
                specialRequests: "Cần 1 ghế ăn cho trẻ em",
                userId: customer1._id,
                createdBy: "customer"
            },
            {
                customerName: "Trần Thị Khách",
                phone: "0987654321",
                email: "customer2@gmail.com",
                tableId: tB01._id,
                numberOfGuests: 5,
                bookingDate: tomorrow,
                bookingTime: "18:30",
                status: "pending",
                specialRequests: "Kỷ niệm ngày cưới, chuẩn bị giùm một bình nến nhỏ",
                userId: customer2._id,
                createdBy: "customer"
            },
            {
                customerName: "Lê Hoàng Anh",
                phone: "0909090909",
                email: "customer3@gmail.com",
                tableId: tVIP01._id,
                numberOfGuests: 8,
                bookingDate: yesterday,
                bookingTime: "12:00",
                status: "completed",
                specialRequests: "Không hành lá trong các món súp",
                userId: customer3._id,
                createdBy: "admin",
                depositAmount: 500000,
                depositPaid: true
            }
        ];

        const seededBookings = await BookingModel.insertMany(bookingsData);
        console.log(`✅ Seeded ${seededBookings.length} bookings successfully`);

        // 8. SEED VOUCHERS
        console.log("\n--- Seeding Vouchers ---");
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

        const vouchersData = [
            {
                code: "WELCOME10",
                name: "Giảm 10% Bạn Mới",
                description: "Giảm ngay 10% giá trị đơn hàng cho khách hàng đăng ký tài khoản lần đầu tiên.",
                discountType: "percentage",
                discountValue: 10,
                minOrderValue: 100000,
                maxDiscount: 50000,
                startDate: yesterday,
                endDate: nextMonth,
                usageLimit: 500,
                usageCount: 20,
                isActive: true,
                isFirstTimeCustomer: true,
                applyForAllProducts: true
            },
            {
                code: "GIAM50K",
                name: "Tri Ân Khách Hàng 50k",
                description: "Giảm trực tiếp 50.000đ cho đơn hàng có hóa đơn trị giá từ 250.000đ trở lên.",
                discountType: "fixed",
                discountValue: 50000,
                minOrderValue: 250000,
                startDate: yesterday,
                endDate: nextMonth,
                usageLimit: 200,
                usageCount: 15,
                isActive: true,
                isFirstTimeCustomer: false,
                applyForAllProducts: true
            },
            {
                code: "VIPLAU100",
                name: "Ưu Đãi Lẩu Thái 100K",
                description: "Giảm ngay 100.000đ khi đặt món Lẩu Thái Hải Sản Thập Cẩm.",
                discountType: "fixed",
                discountValue: 100000,
                minOrderValue: 350000,
                startDate: yesterday,
                endDate: nextMonth,
                usageLimit: 100,
                usageCount: 5,
                isActive: true,
                isFirstTimeCustomer: false,
                applyForAllProducts: false,
                products: [pLau._id]
            },
            {
                code: "EXPIRED15",
                name: "Hết Hạn Mùa Đông",
                description: "Mã giảm giá đã hết hiệu lực áp dụng.",
                discountType: "percentage",
                discountValue: 15,
                minOrderValue: 150000,
                startDate: lastYear,
                endDate: yesterday,
                isActive: false,
                applyForAllProducts: true
            }
        ];

        const seededVouchers = await VoucherModel.insertMany(vouchersData);
        console.log(`✅ Seeded ${seededVouchers.length} vouchers successfully`);

        // 9. SEED SHIFTS
        console.log("\n--- Seeding Shifts ---");
        const todayDate = new Date();
        todayDate.setHours(0,0,0,0);

        const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        yesterdayDate.setHours(0,0,0,0);

        const shiftsData = [
            {
                shiftType: "morning",
                date: todayDate,
                startTime: "06:00",
                endTime: "14:00",
                maxStaff: 5,
                status: "scheduled",
                createdBy: adminUser._id,
                assignedStaff: [
                    { userId: waiter1._id, role: "WAITER", confirmed: true },
                    { userId: chef1._id, role: "CHEF", confirmed: true }
                ]
            },
            {
                shiftType: "afternoon",
                date: todayDate,
                startTime: "14:00",
                endTime: "22:00",
                maxStaff: 5,
                status: "scheduled",
                createdBy: adminUser._id,
                assignedStaff: [
                    { userId: waiter2._id, role: "WAITER", confirmed: true },
                    { userId: chef2._id, role: "CHEF", confirmed: false }
                ]
            },
            {
                shiftType: "morning",
                date: yesterdayDate,
                startTime: "06:00",
                endTime: "14:00",
                maxStaff: 5,
                status: "completed",
                createdBy: adminUser._id,
                assignedStaff: [
                    { userId: waiter1._id, role: "WAITER", confirmed: true },
                    { userId: chef1._id, role: "CHEF", confirmed: true }
                ]
            }
        ];

        const seededShifts = await ShiftModel.insertMany(shiftsData);
        console.log(`✅ Seeded ${seededShifts.length} shifts successfully`);

        const yesterdayShift = seededShifts.find(s => s.status === "completed");

        // 10. SEED ATTENDANCES
        console.log("\n--- Seeding Attendances ---");
        const yesterday6AM = new Date(yesterdayDate);
        yesterday6AM.setHours(6, 0, 0, 0);

        const yesterday6_15AM = new Date(yesterdayDate);
        yesterday6_15AM.setHours(6, 15, 0, 0);

        const yesterday2PM = new Date(yesterdayDate);
        yesterday2PM.setHours(14, 0, 0, 0);

        const attendancesData = [
            {
                userId: waiter1._id,
                shiftId: yesterdayShift._id,
                checkInTime: yesterday6AM,
                checkOutTime: yesterday2PM,
                workingHours: 8,
                status: "on_time",
                notes: "Hoàn thành ca tốt, năng nổ phục vụ khách hàng"
            },
            {
                userId: chef1._id,
                shiftId: yesterdayShift._id,
                checkInTime: yesterday6_15AM,
                checkOutTime: yesterday2PM,
                workingHours: 7.75,
                status: "late",
                notes: "Đi muộn 15 phút do hỏng xe"
            }
        ];

        const seededAttendances = await AttendanceModel.insertMany(attendancesData);
        console.log(`✅ Seeded ${seededAttendances.length} attendance records successfully`);

        // Update performance stats in users
        waiter1.performanceStats = {
            totalWorkingHours: 8,
            ordersHandled: 12,
            dishesCooked: 0,
            averageRating: 4.8
        };
        await waiter1.save();

        chef1.performanceStats = {
            totalWorkingHours: 7.75,
            ordersHandled: 0,
            dishesCooked: 35,
            averageRating: 4.9
        };
        await chef1.save();

        // 11. SEED PERFORMANCES
        console.log("\n--- Seeding Employee Performance Stats ---");
        const performancesData = [
            {
                userId: waiter1._id,
                date: yesterdayDate,
                role: "WAITER",
                metrics: {
                    ordersHandled: 12,
                    dishesCooked: 0,
                    workingHours: 8,
                    customerRating: 4.8
                },
                notes: "Thái độ niềm nở, phục vụ nhanh, nhận nhiều đánh giá tốt từ khách phòng VIP."
            },
            {
                userId: chef1._id,
                date: yesterdayDate,
                role: "CHEF",
                metrics: {
                    ordersHandled: 0,
                    dishesCooked: 35,
                    workingHours: 7.75,
                    customerRating: 4.9
                },
                notes: "Chế biến nhanh các món nướng và lẩu, bày biện món ăn đẹp mắt."
            }
        ];

        const seededPerformances = await PerformanceModel.insertMany(performancesData);
        console.log(`✅ Seeded ${seededPerformances.length} performance entries successfully`);

        // 12. SEED ACTIVE TABLE ORDERS (Active carts at the tables)
        console.log("\n--- Seeding Active Table Orders ---");
        const tableOrdersData = [
            {
                tableId: tA02._id,
                tableNumber: tA02.tableNumber,
                items: [
                    { productId: pLau._id, name: pLau.name, price: pLau.price, quantity: 1 },
                    { productId: pCom._id, name: pCom.name, price: pCom.price, quantity: 1 },
                    { productId: pTraDao._id, name: pTraDao.name, price: pTraDao.price, quantity: 4 }
                ],
                subTotal: pLau.price + pCom.price + (pTraDao.price * 4), // 380k + 65k + 116k = 561k
                total: pLau.price + pCom.price + (pTraDao.price * 4),
                status: "active"
            },
            {
                tableId: tVIP02._id,
                tableNumber: tVIP02.tableNumber,
                items: [
                    { productId: pSuon._id, name: pSuon.name, price: pSuon.price, quantity: 2 },
                    { productId: pMi._id, name: pMi.name, price: pMi.price, quantity: 2 },
                    { productId: pBeer._id, name: pBeer.name, price: pBeer.price, quantity: 12 }
                ],
                subTotal: (pSuon.price * 2) + (pMi.price * 2) + (pBeer.price * 12), // 498k + 150k + 264k = 912k
                total: (pSuon.price * 2) + (pMi.price * 2) + (pBeer.price * 12),
                status: "active"
            }
        ];

        const seededTableOrders = await TableOrderModel.insertMany(tableOrdersData);
        console.log(`✅ Seeded ${seededTableOrders.length} active table orders successfully`);

        // 13. SEED ORDERS (Sales Order Log History)
        console.log("\n--- Seeding General Orders ---");
        const orderHistoryData = [
            {
                userId: customer1._id,
                orderId: "ORD-20260625-001",
                productId: pLau._id,
                product_details: {
                    name: pLau.name,
                    image: pLau.image
                },
                quantity: 1,
                subTotalAmt: pLau.price,
                totalAmt: pLau.price,
                payment_status: "PAID",
                paymentId: "pi_mock_1234567890",
                status: "delivered",
                orderType: "dine_in",
                tableNumber: "A01",
                isPaid: true,
                paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                isDelivered: true,
                deliveredAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
                earnedPoints: 38
            },
            {
                userId: customer2._id,
                orderId: "ORD-20260625-002",
                productId: pSuon._id,
                product_details: {
                    name: pSuon.name,
                    image: pSuon.image
                },
                quantity: 1,
                subTotalAmt: pSuon.price,
                totalAmt: pSuon.price - 50000, // discount code applied
                payment_status: "PAID",
                paymentId: "pi_mock_0987654321",
                status: "delivered",
                orderType: "takeaway",
                isPaid: true,
                paidAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
                isDelivered: true,
                deliveredAt: new Date(Date.now() - 19.5 * 60 * 60 * 1000),
                voucherCode: "GIAM50K",
                voucherDiscount: 50000,
                voucherType: "fixed",
                earnedPoints: 19
            },
            {
                userId: customer3._id,
                orderId: "ORD-20260626-003",
                productId: pCom._id,
                product_details: {
                    name: pCom.name,
                    image: pCom.image
                },
                quantity: 2,
                subTotalAmt: pCom.price * 2,
                totalAmt: pCom.price * 2,
                payment_status: "PENDING",
                status: "pending",
                orderType: "pre_order",
                isPaid: false,
                isPreOrder: true,
                customerContact: {
                    name: "Lê Hoàng Anh",
                    email: "customer3@gmail.com",
                    phone: "0909090909"
                }
            }
        ];

        const seededOrders = await OrderModel.insertMany(orderHistoryData);
        console.log(`✅ Seeded ${seededOrders.length} general order history items successfully`);

        // Link orders to users' histories
        for (const ord of seededOrders) {
            await UserModel.findByIdAndUpdate(ord.userId, {
                $push: { orderHistory: ord._id }
            });
        }
        console.log("Linked seeded orders to corresponding user histories.");

        // 14. SEED SUPPORT CHATS
        console.log("\n--- Seeding Support Chats ---");
        const supportChatsData = [
            {
                conversationId: "chat_guest_009988",
                customerName: "Khách Vãng Lai 1",
                customerId: null,
                status: "open",
                unreadByAdmin: 1,
                lastMessage: "Nhà hàng mình có nhận tổ chức tiệc sinh nhật không ạ?",
                lastMessageAt: new Date(Date.now() - 10 * 60 * 1000),
                messages: [
                    {
                        sender: "guest_009988",
                        senderName: "Khách Vãng Lai 1",
                        senderRole: "customer",
                        text: "Xin chào, cho mình hỏi thực đơn hôm nay ạ?",
                        createdAt: new Date(Date.now() - 30 * 60 * 1000)
                    },
                    {
                        sender: adminUser._id.toString(),
                        senderName: "Admin User",
                        senderRole: "admin",
                        text: "Chào quý khách! Thực đơn hôm nay có đầy đủ các món đặc biệt như Lẩu Thái, Sườn nướng BBQ và nhiều món khai vị khác ạ.",
                        createdAt: new Date(Date.now() - 25 * 60 * 1000)
                    },
                    {
                        sender: "guest_009988",
                        senderName: "Khách Vãng Lai 1",
                        senderRole: "customer",
                        text: "Nhà hàng mình có nhận tổ chức tiệc sinh nhật không ạ?",
                        createdAt: new Date(Date.now() - 10 * 60 * 1000)
                    }
                ]
            },
            {
                conversationId: `chat_${customer1._id}`,
                customerName: customer1.name,
                customerId: customer1._id.toString(),
                status: "open",
                unreadByAdmin: 0,
                lastMessage: "Cảm ơn bạn nhiều nhé!",
                lastMessageAt: new Date(Date.now() - 60 * 60 * 1000),
                messages: [
                    {
                        sender: customer1._id.toString(),
                        senderName: customer1.name,
                        senderRole: "customer",
                        text: "Cho mình hỏi số điểm tích lũy đổi voucher thế nào ạ?",
                        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
                    },
                    {
                        sender: adminUser._id.toString(),
                        senderName: "Admin User",
                        senderRole: "admin",
                        text: "Chào bạn, khi bạn tích đủ điểm từ đơn hàng, hệ thống sẽ tự động gợi ý đổi voucher thanh toán trực tiếp ở trang giỏ hàng nhé.",
                        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
                    },
                    {
                        sender: customer1._id.toString(),
                        senderName: customer1.name,
                        senderRole: "customer",
                        text: "Cảm ơn bạn nhiều nhé!",
                        createdAt: new Date(Date.now() - 60 * 60 * 1000)
                    }
                ]
            }
        ];

        const seededChats = await SupportChat.insertMany(supportChatsData);
        console.log(`✅ Seeded ${seededChats.length} support chat logs successfully`);

        console.log("\n==============================================");
        console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
        console.log("==============================================");
        console.log(`- Users: ${seededUsers.length + seededTables.length} (including table accounts)`);
        console.log(`- Categories: ${seededCategories.length}`);
        console.log(`- Subcategories: ${seededSubCategories.length}`);
        console.log(`- Products: ${seededProducts.length}`);
        console.log(`- Tables: ${seededTables.length}`);
        console.log(`- Bookings: ${seededBookings.length}`);
        console.log(`- Vouchers: ${seededVouchers.length}`);
        console.log(`- Shifts: ${seededShifts.length}`);
        console.log(`- Attendances: ${seededAttendances.length}`);
        console.log(`- Table Orders (Active): ${seededTableOrders.length}`);
        console.log(`- General Orders (History): ${seededOrders.length}`);
        console.log(`- Support Chats: ${seededChats.length}`);
        console.log("==============================================");
        
        console.log("\n🔑 Test Accounts Info (Password is 'password123' for all):");
        console.log("- MANAGER: manager@restaurant.com, admin@restaurant.com");
        console.log("- WAITER: waiter1@restaurant.com, waiter2@restaurant.com");
        console.log("- CHEF: chef1@restaurant.com, chef2@restaurant.com");
        console.log("- CASHIER: cashier@restaurant.com");
        console.log("- CUSTOMER: customer1@gmail.com, customer2@gmail.com, customer3@gmail.com");
        console.log("- TABLES: table_a01@internal.restaurant.com, table_a02@internal.restaurant.com, etc.");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed with error:", error);
        process.exit(1);
    }
};

seedDatabase();
