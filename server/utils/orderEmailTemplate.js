const orderEmailTemplate = (order) => {
    const { orderId, totalAmt, subTotalAmt, payment_status, delivery_address, product_details, createdAt } = order;

    // Format date
    const formattedDate = new Date(createdAt).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Common styles
    const containerStyle = `
        font-family: 'Arial', sans-serif;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
    `;

    const headerStyle = `
        text-align: center;
        padding-bottom: 20px;
        border-bottom: 2px solid #f0f0f0;
    `;

    const logoStyle = `
        font-size: 24px;
        font-weight: bold;
        color: #ff4d4f;
        text-decoration: none;
    `;

    const contentStyle = `
        padding: 20px 0;
        line-height: 1.6;
        color: #333333;
    `;

    const detailBoxStyle = `
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 5px;
        margin: 15px 0;
        border-left: 4px solid #ff4d4f;
    `;

    const itemStyle = `
        border-bottom: 1px solid #eee;
        padding: 10px 0;
        display: flex;
        justify-content: space-between;
    `;

    const footerStyle = `
        text-align: center;
        padding-top: 20px;
        border-top: 2px solid #f0f0f0;
        font-size: 12px;
        color: #888888;
    `;

    const buttonStyle = `
        display: inline-block;
        padding: 10px 20px;
        background-color: #ff4d4f;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        margin-top: 20px;
    `;

    // Generate order items list HTML
    // Handling both array (if populated differently) or single object structure if that's how it's stored
    // Based on previous findings, product_details might be an object with flattened names for some flows, 
    // but for standard orders it might be different. 
    // However, looking at OrderModel, product_details is { name: String, image: Array }.
    // Standard orders usually have multiple Order documents (one per product) sharing a common payment/transaction?
    // Wait, the webhook handles `orderIds` (plural). 
    // If we are sending one email for multiple orders (cart checkout), we need to handle that.
    // But this template receives a SINGLE order object? 
    // The controller logic iterates or we need to pass an ARRAY of orders to the template.

    // Let's assume for now we will pass an ARRAY of orders to this template if it's a cart checkout.
    // Or we send one email per order? Sending one email per order is spammy.
    // Better to send one email for the whole transaction.

    // I will adjust the template to accept an ARRAY of orders.

    const ordersList = Array.isArray(order) ? order : [order];
    const firstOrder = ordersList[0];
    const totalPayment = ordersList.reduce((sum, o) => sum + o.totalAmt, 0);

    const orderItemsHtml = ordersList.map(item => `
        <div style="${itemStyle}">
            <div style="flex: 1; padding-right: 10px;">
                <strong>${item.product_details.name}</strong>
                <br>
                <span style="font-size: 12px; color: #666;">Số lượng: ${item.quantity}</span>
            </div>
            <div style="white-space: nowrap;">
                ${item.totalAmt.toLocaleString('vi-VN')}đ
            </div>
        </div>
    `).join('');

    const addressHtml = firstOrder.delivery_address ? `
        <p style="margin: 5px 0;"><strong>Người nhận:</strong> ${firstOrder.delivery_address.receiver_name || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${firstOrder.delivery_address.mobile || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Địa chỉ:</strong> ${firstOrder.delivery_address.address_line}, ${firstOrder.delivery_address.city}, ${firstOrder.delivery_address.state}, ${firstOrder.delivery_address.country} - ${firstOrder.delivery_address.pincode}</p>
    ` : '<p>Nhận tại cửa hàng</p>';

    return `
        <div style="${containerStyle}">
            <div style="${headerStyle}">
                <a href="${process.env.FRONTEND_URL}" style="${logoStyle}">RestoHub Restaurant</a>
            </div>

            <div style="${contentStyle}">
                <h2 style="color: #52c41a; text-align: center;">Đặt hàng thành công!</h2>
                <p>Cảm ơn bạn đã đặt hàng tạiRestoHub Restaurant. Đơn hàng của bạn đã được xác nhận và đang được xử lý.</p>

                <div style="${detailBoxStyle}">
                    <h3 style="margin-top: 0; color: #333;">Thông tin đơn hàng:</h3>
                    <p style="margin: 5px 0;"><strong>Mã đơn hàng:</strong> ${ordersList.map(o => '#' + o.orderId).join(', ')}</p>
                    <p style="margin: 5px 0;"><strong>Ngày đặt:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Trạng thái thanh toán:</strong> <span style="color: #52c41a; font-weight: bold;">${firstOrder.payment_status || 'Đã thanh toán'}</span></p>
                </div>

                <div style="${detailBoxStyle}">
                    <h3 style="margin-top: 0; color: #333;">Chi tiết sản phẩm:</h3>
                    ${orderItemsHtml}
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; text-align: right;">
                        <strong>Tổng thanh toán: ${totalPayment.toLocaleString('vi-VN')}đ</strong>
                    </div>
                </div>

                <div style="${detailBoxStyle}">
                    <h3 style="margin-top: 0; color: #333;">Thông tin giao hàng:</h3>
                    ${addressHtml}
                </div>

                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/dashboard/my-orders" style="${buttonStyle}">Xem đơn hàng của tôi</a>
                </div>
            </div>

            <div style="${footerStyle}">
                <p>Trân trọng,<br/>Đội ngũRestoHub Restaurant</p>
                <a href="${process.env.FRONTEND_URL}"
                    target="_blank"
                    style="color:#0d6efd; text-decoration:none;">
                    🌐 restohub.com
                </a>

                <p>RestoHub Restaurant - 123 Ẩm Thực, Quang Trung, TP.Đà Nẵng</p>
                <p>Hotline: 1900 1234 | Email: support@restohub.com</p>
                <p>&copy; ${new Date().getFullYear()}RestoHub Restaurant. All rights reserved.</p>
            </div>
        </div>
    `;
};

export default orderEmailTemplate;
