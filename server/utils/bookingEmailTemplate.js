const bookingEmailTemplate = (booking) => {
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
        title = 'Xác nhận yêu cầu đặt bàn';
        message = `Cảm ơn bạn đã đặt bàn tại nhà hàng chúng tôi. Yêu cầu của bạn đang được xử lý và chúng tôi sẽ xác nhận sớm nhất có thể.`;
        color = '#faad14'; // Yellow/Orange
    } else if (status === 'confirmed') {
        title = 'Đặt bàn thành công!';
        message = `Tuyệt vời! Đặt bàn của bạn đã được xác nhận. Chúng tôi rất mong được phục vụ bạn.`;
        color = '#52c41a'; // Green
    } else if (status === 'cancelled') {
        title = 'Thông báo hủy đặt bàn';
        message = `Đặt bàn của bạn đã bị hủy. Nếu đây là sự nhầm lẫn, vui lòng liên hệ lại với chúng tôi.`;
        color = '#ff4d4f'; // Red
    }

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

                <p>Vui lòng đến đúng giờ để chúng tôi có thể phục vụ bạn tốt nhất. Bàn của bạn sẽ được giữ trong vòng 15 phút.</p>

                <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL}/booking" style="${buttonStyle}">Đặt bàn mới</a>
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

export default bookingEmailTemplate;
