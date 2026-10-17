const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

module.exports.sendOtpMail = async (email, code, purpose) => {
    const subject = 
        purpose === "register"
            ? "Mã xác minh đăng ký SportZone"
            : "Mã đặt lại mật khẩu SportZone";

    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject,
        text: `Mã OTP của bạn là: ${code}. Có hiệu lực 5 phút.`,
        html: `<p>Mã OTP của bạn là: <b>${code}</b></p><p>Có hiệu lực 5 phút.</p>`,
    });
};

module.exports.sendBookingMail = async (email, booking) => {
    const subject = `Xác nhận đặt sân ${booking.code} - SportZone`;
    const lines = [
        `Xin chào,`,
        ``,
        `Đơn đặt sân của bạn đã được ghi nhận.`,
        `Mã đơn: ${booking.code}`,
        `Cơ sở: ${booking.facilityName}`,
        `Sân: ${booking.courtName}`,
        `Ngày: ${booking.date}`,
        `Giờ: ${booking.time}`,
        `Tạm tính: ${booking.courtPrice}đ`,
        `Giảm giá: ${booking.discount}đ`,
        `Tổng thanh toán: ${booking.amount}đ`,
        `Hình thức: Thanh toán tại sân`,
        ``,
        `Vui lòng đến đúng giờ và thanh toán tại quầy.`,
    ];

    
}