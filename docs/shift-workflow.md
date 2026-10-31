# Workflow ca làm việc

## Sử dụng

1. Quản lý tạo lịch nháp, chọn ngày/giờ, thời gian nghỉ, số người tối đa và định biên theo vai trò.
2. Phân công nhân viên đang hoạt động. Vai trò theo hồ sơ; hệ thống chặn trùng giờ, trùng ca/ngày và vượt số người.
3. Công bố khi đủ định biên. Nhân viên nhận thông báo trong ứng dụng và xác nhận lịch tại **Ca làm của tôi**.
4. Nhân viên gửi xin nghỉ hoặc nhờ người cùng vai trò nhận ca thay. Người thay đồng ý, quản lý mới duyệt. Lịch gốc giữ nguyên đến khi duyệt. Xin nghỉ được duyệt có thể gây thiếu người; quản lý cần bổ sung theo cảnh báo.
5. Quản lý check-in từ 30 phút trước giờ ca đến trước giờ kết thúc, check-out lúc ra ca và nhập thời gian nghỉ thực tế.
6. Sau khi hết ca, xử lý người quên check-out bằng **Sửa công**, rồi **Kết thúc ca**. Nhân viên không có công được đánh dấu vắng mặt.
7. Nhân viên có thể đề nghị sửa giờ công; quản lý đối soát, duyệt và chốt theo ca hoặc khoảng ngày tối đa 31 ngày. Công chốt là nguồn giờ làm cho báo cáo hiệu suất.
8. Muốn sửa công đã chốt phải mở chốt kèm lý do, điều chỉnh và duyệt lại.

## Quy tắc

- Ngày ca là ngày bắt đầu theo Asia/Ho_Chi_Minh (UTC+07). Trường date giữ dạng UTC midnight để tương thích dữ liệu cũ, giờ thực tế là thời điểm tuyệt đối.
- Ca 22:00–06:00 kết thúc hôm sau. Không dùng toISOString() để chuyển ngày lịch địa phương.
- Ca tối đa 16 giờ. Giờ bắt đầu bằng giờ kết thúc bị từ chối.
- Muộn sau 15 phút ân hạn; muộn và về sớm được lưu độc lập. Công = thời gian có mặt trừ nghỉ thực tế. Thời gian sau giờ ca được hiển thị để quản lý đối soát; chưa áp dụng công thức tiền lương/tăng ca.
- Nghỉ giữa hai ca dưới 8 giờ hoặc lịch tuần trên 48 giờ là cảnh báo vận hành, không phải kết luận pháp lý.
- Nhân viên chỉ đọc lịch/công của mình. Quản lý thực hiện chấm công và điều chỉnh. Nhân viên nghỉ phép vẫn được xem lịch/gửi yêu cầu; nhân viên inactive bị chặn module.
- Tạo/copy lịch mới luôn là nháp. Ca cũ scheduled vẫn tiếp tục sử dụng.
- Hủy thay cho xóa ca; không hủy/sửa phân công ca đã có công. Xóa nhân viên được đổi thành ngừng hoạt động để giữ liên kết lịch sử.
- Thay đổi giờ ca đã công bố yêu cầu xác nhận lại và hủy yêu cầu đang chờ để tránh duyệt theo lịch cũ.
- Có lịch sử trước/sau cho chỉnh lịch và chỉnh công, người thực hiện và lý do.
- Giao dịch MongoDB và một khóa workflow trong cùng transaction bảo vệ thao tác đồng thời, kể cả chạy nhiều server.
- Thông báo lưu trong ứng dụng và làm mới mỗi 30 giây khi trang đang mở. Không gửi email/SMS.
- Thay ca hiện là một chiều: nhờ người khác nhận ca, không phải trao đổi đồng thời hai ca.
- Quản lý phải kết thúc/đối soát ca; không tự suy đoán giờ ra bằng tác vụ nền.

## Chạy và kiểm tra

Yêu cầu MongoDB Atlas hoặc MongoDB replica set (transaction). MongoDB standalone không hỗ trợ ghi workflow này.
Không tự chuyển sang các thao tác ghi riêng lẻ khi transaction thất bại.

Cài dependencies tại server và client bằng npm install.
- Server: npm run dev (hoặc npm start).
- Client: npm run dev (hoặc npm run build).
- Khởi tạo dữ liệu mẫu (tùy chọn): npm run seed trong thư mục server.

Đã kiểm chứng: 20 kiểm thử quy tắc/tích hợp, luồng trình duyệt quản lý–nhân viên–người nhận ca, sửa/chốt công và giao diện điện thoại. Bản build client thành công; lint các thành phần workflow không có lỗi.

Công lịch sử chưa có reviewStatus được coi là chưa duyệt. Quản lý kiểm tra trong màn hình đối soát, kết thúc ca nếu cần rồi chốt; không tự duyệt hàng loạt dữ liệu cũ.
Dữ liệu cũ sai ngày/giờ hoặc nhân sự cần được kiểm tra trước khi chốt. Ca đã mất do xóa cứng trước đây không tự khôi phục.

## Kiểm tra thủ công

- Tạo ca đêm cuối tháng; nhân viên thấy đúng ngày và còn trạng thái đang làm sau nửa đêm.
- Hai quản lý cùng thêm người vào vị trí cuối cùng: chỉ một thao tác thành công.
- Sửa giờ ca: xác nhận cũ bị đặt lại và nhân viên có thông báo.
- Xin nghỉ/thay ca, người thay từ chối/đồng ý; quản lý duyệt hoặc từ chối.
- Vào muộn và ra sớm cùng ca, quên giờ ra, bổ sung công sau khi đã ghi vắng.
- Chốt công khi còn yêu cầu chờ bị chặn; mở chốt làm giờ đã duyệt giảm tương ứng.
- Xuất CSV đối soát, so sánh giờ đã duyệt với dashboard cá nhân và đội.
