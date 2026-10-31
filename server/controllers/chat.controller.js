import dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_FALLBACK_CHAIN = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
];

const SYSTEM_PROMPT = `Bạn là trợ lý AI của RestoHub — hệ thống quản lý đặt bàn và gọi món nhà hàng thông minh.
Nhiệm vụ của bạn là hỗ trợ khách hàng:
1. Quy trình Đặt bàn (Booking) trực tuyến và Đặt món trước (Pre-order). Để đặt bàn, khách hàng chỉ cần vào mục "Đặt bàn", chọn thời gian, số lượng người, và có thể chọn món trước nếu muốn. Thanh toán đặt cọc sẽ được thực hiện online qua cổng SePay để xác nhận đặt bàn.
2. Quy trình Gọi món tại bàn (Table Order) bằng cách quét mã QR tại bàn để gọi món trực tiếp gửi đến bếp mà không cần chờ nhân viên.
3. Quy trình Đặt món giao tận nơi (Delivery): Chọn món vào giỏ hàng -> Tiến hành thanh toán -> Nhập địa chỉ nhận hàng -> Xác nhận đơn.
4. Phương thức thanh toán: RestoHub hỗ trợ Thanh toán tiền mặt (khi giao hàng/tại quầy) và Thanh toán trực tuyến (chuyển khoản ngân hàng tự động qua cổng SePay quét mã QR).
5. Ưu đãi & Voucher: Có các chương trình voucher giảm giá được áp dụng ngay tại bước thanh toán.
6. Hỗ trợ tài khoản: Đăng ký, đăng nhập, theo dõi lịch sử đơn hàng tại mục "Đơn hàng của tôi".

Nguyên tắc trả lời:
- Luôn thân thiện, chuyên nghiệp, lịch sự và trả lời bằng tiếng Việt.
- Giữ câu trả lời ngắn gọn, súc tích, dễ hiểu.
- Không tự bịa đặt thông tin cụ thể về giá món ăn hay bàn trống nếu không có trong ngữ cảnh. Hướng dẫn khách hàng xem trực tiếp trên menu hoặc trang đặt bàn của website.
- Khi cần hỗ trợ chuyên sâu hoặc giải quyết khiếu nại, hướng dẫn khách hàng liên hệ hotline hoặc gửi email tới support@restohub.vn.`;

// ─── Local FAQ — trả lời ngay không tốn quota ──────────────────────────────
const FAQ = [
    {
        keywords: ["đặt bàn", "dat ban", "booking", "giữ chỗ"],
        answer: "Để đặt bàn tại RestoHub:\n1. 📅 Chọn mục **Đặt bàn** trên thanh menu.\n2. 👥 Chọn thời gian, số lượng khách và điền thông tin cá nhân.\n3. 🍲 Bạn có thể chọn đặt trước món ăn (Pre-order) nếu muốn.\n4. 💳 Tiến hành đặt cọc qua **Thanh toán trực tuyến (SePay)** để hoàn tất xác nhận đặt bàn!"
    },
    {
        keywords: ["gọi món", "order", "goi mon", "quét qr", "tại bàn"],
        answer: "Khi dùng bữa tại nhà hàng, bạn có thể quét mã QR được dán tại bàn để tự xem thực đơn, gọi món trực tiếp gửi đến nhà bếp và chọn thanh toán (tiền mặt tại quầy hoặc thanh toán trực tuyến qua SePay) cực kỳ nhanh chóng và tiện lợi!"
    },
    {
        keywords: ["thanh toán", "thanh toan", "chuyển khoản", "sepay", "tiền mặt", "cod"],
        answer: "RestoHub hỗ trợ 2 phương thức thanh toán:\n1. 💵 **Thanh toán tiền mặt**: Trực tiếp tại quầy hoặc khi nhận hàng (COD).\n2. 💳 **Thanh toán trực tuyến (SePay)**: Quét mã QR chuyển khoản ngân hàng tự động nhanh chóng và an toàn."
    },
    {
        keywords: ["menu", "thực đơn", "món ăn", "ăn gì", "đồ uống"],
        answer: "RestoHub cung cấp thực đơn đa dạng bao gồm các món ăn chính hấp dẫn, đồ khai vị, tráng miệng và đồ uống phong phú. Bạn có thể xem thực đơn chi tiết kèm giá cả trực tiếp trên trang chủ của chúng tôi!"
    },
    {
        keywords: ["voucher", "mã giảm giá", "khuyến mãi", "coupon", "ưu đãi"],
        answer: "RestoHub thường xuyên có các voucher giảm giá cực kỳ hấp dẫn! 🎁 Bạn có thể chọn và áp dụng các mã giảm giá này tại bước thanh toán đơn hàng để nhận ưu đãi."
    },
    {
        keywords: ["đơn hàng", "lịch sử", "theo dõi", "my orders"],
        answer: "Để kiểm tra trạng thái đặt bàn hoặc đơn hàng đã đặt, bạn hãy truy cập vào mục **Tài khoản → Đơn hàng của tôi** để xem chi tiết nhé."
    },
    {
        keywords: ["liên hệ", "hỗ trợ", "hotline", "email", "giúp đỡ"],
        answer: "Nếu cần hỗ trợ gấp, bạn vui lòng liên hệ RestoHub qua:\n📧 Email: support@restohub.vn\n⏰ Thời gian hoạt động: 8:00 - 22:00 hàng ngày\nChúng tôi rất hân hạnh được phục vụ bạn! 😊"
    }
];

function checkFAQ(message) {
    const lower = message.toLowerCase();
    for (const item of FAQ) {
        const matched = item.keywords.filter(kw => lower.includes(kw));
        if (matched.length >= 1) return item.answer;
    }
    return null;
}

// ─── Server-side rate limiter (per IP) ─────────────────────────────────────
const ipLastRequest = new Map();
const RATE_LIMIT_MS = 4000; // tối thiểu 4 giây giữa 2 request AI cùng 1 IP

// ─── Gemini fallback chain ──────────────────────────────────────────────────
const SKIP_STATUSES = new Set([429, 404, 503]);

async function sendWithModelFallback(message, formattedHistory) {
    let lastError;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    for (const modelName of MODEL_FALLBACK_CHAIN) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
            });
            const chat = model.startChat({ history: formattedHistory });
            const result = await chat.sendMessage(message);
            console.log(`[Chat] Served by: ${modelName}`);
            return result.response.text();
        } catch (error) {
            lastError = error;
            if (SKIP_STATUSES.has(error.status)) {
                console.warn(`[Chat] Model ${modelName} unavailable (${error.status}), trying next...`);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

// ─── Controller ─────────────────────────────────────────────────────────────
export async function chatController(req, res) {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== "string" || message.trim() === "") {
            return res.status(400).json({
                message: "Tin nhắn không được để trống",
                error: true,
                success: false,
            });
        }

        const text = message.trim();

        // 1. Thử trả lời từ FAQ local trước (không tốn quota)
        const faqAnswer = checkFAQ(text);
        if (faqAnswer) {
            console.log("[Chat] Served by: local FAQ");
            return res.json({
                message: "Thành công",
                error: false,
                success: true,
                data: { reply: faqAnswer },
            });
        }

        // 2. Rate limit per IP — tránh spam Gemini API
        const ip = req.ip || req.socket?.remoteAddress || "unknown";
        const now = Date.now();
        const lastTime = ipLastRequest.get(ip) || 0;
        const elapsed = now - lastTime;
        if (elapsed < RATE_LIMIT_MS) {
            const waitSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
            return res.status(429).json({
                message: `Vui lòng chờ ${waitSec} giây trước khi gửi tin tiếp theo ⏳`,
                error: true,
                success: false,
            });
        }
        ipLastRequest.set(ip, now);

        // 3. Gọi Gemini với fallback chain
        const formattedHistory = history
            .filter((msg) => msg.role && msg.text)
            .map((msg) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.text }],
            }));

        const responseText = await sendWithModelFallback(text, formattedHistory);

        return res.json({
            message: "Thành công",
            error: false,
            success: true,
            data: { reply: responseText },
        });
    } catch (error) {
        console.error("[Chat] AI error:", error.status, error.statusText);

        if (error.status === 429) {
            return res.status(429).json({
                message: "AI đang bận, vui lòng thử lại sau vài phút! ⏳",
                error: true,
                success: false,
            });
        }

        return res.status(500).json({
            message: "Lỗi kết nối AI. Vui lòng thử lại sau.",
            error: true,
            success: false,
        });
    }
}