const bookingWithPreOrderEmailTemplate = (booking, order) => {
    const { customerName, bookingDate, bookingTime, numberOfGuests, status, _id, tableId } = booking;

    // Format date
    const formattedDate = new Date(bookingDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const tableInfo = tableId ? `Bàn số ${tableId.tableNumber}` : 'Đang sắp xếp';

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

    // Template content based on status
    let title = '';
    let message = '';
    let color = '#ff4d4f';

    if (status === 'pending') {
        title = 'Xác nhận yêu cầu đặt bàn & món';
        message = `Cảm ơn bạn đã đặt bàn và món ăn trước tại nhà hàng chúng tôi. Yêu cầu của bạn đang được xử lý.`;
        color = '#faad14'; // Yellow/Orange
    } else if (status === 'confirmed') {
        title = 'Đặt bàn & Món thành công!';
        message = `Tuyệt vời! Đặt bàn và các món ăn của bạn đã được xác nhận và thanh toán. Chúng tôi sẽ chuẩn bị sẵn sàng để phục vụ bạn.`;
        color = '#52c41a'; // Green
    } else if (status === 'cancelled') {
        title = 'Thông báo hủy đặt bàn';
        message = `Đặt bàn của bạn đã bị hủy. Tiền đã thanh toán sẽ được hoàn lại theo chính sách của nhà hàng.`;
        color = '#ff4d4f'; // Red
    }

    // Generate order items list HTML
    // Note: OrderModel stores product_details as an object with flattened name string, not an array of items
    const orderItemsHtml = `
        <div style="${itemStyle}">
            <div style="flex: 1; padding-right: 10px;">
                <strong>${order?.product_details?.name || 'Combo món ăn'}</strong>
            </div>
            <div style="white-space: nowrap;">
                ${order?.totalAmt?.toLocaleString('vi-VN')}đ
            </div>
        </div>
    `;

    return `
        <div style="${containerStyle}">
            <div style="${headerStyle}">
                <a href="${process.env.FRONTEND_URL}" style="${logoStyle}">RestoHub Restaurant</a>
            </div>

            <div style="${contentStyle}">
                <h2 style="color: ${color}; text-align: center;">${title}</h2>
                <p>Xin chào <strong>${customerName}</strong>,</p>
                <p>${message}</p>

                <div style="${detailBoxStyle}">
                    <h3 style="margin-top: 0; color: #333;">Chi tiết đặt bàn:</h3>
                    <p style="margin: 5px 0;"><strong>Mã đặt bàn:</strong> #${_id.toString().slice(-6).toUpperCase()}</p>
                    <p style="margin: 5px 0;"><strong>Ngày:</strong> ${formattedDate}</p>
                    <p style="margin: 5px 0;"><strong>Giờ:</strong> ${bookingTime}</p>
                    <p style="margin: 5px 0;"><strong>Số khách:</strong> ${numberOfGuests} người</p>
                    <p style="margin: 5px 0;"><strong>Bàn:</strong> ${tableInfo}</p>
                    <p style="margin: 5px 0;"><strong>Trạng thái:</strong> <span style="color: ${color}; font-weight: bold;">${status.toUpperCase()}</span></p>
                </div>

                ${order ? `
                <div style="${detailBoxStyle}">
                    <h3 style="margin-top: 0; color: #333;">Chi tiết món ăn đã đặt:</h3>
                    ${orderItemsHtml}
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; text-align: right;">
                        <strong>Tổng tiền món: ${order.totalAmt.toLocaleString('vi-VN')}đ</strong>
                    </div>
                </div>
                ` : ''}

                <p>Vui lòng đến đúng giờ để chúng tôi có thể phục vụ bạn tốt nhất. Bàn của bạn sẽ được giữ trong vòng 15 phút.</p>

                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/my-orders" style="${buttonStyle}">Xem đơn hàng của tôi</a>
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

export default bookingWithPreOrderEmailTemplate;
