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
    const subject = `Thanh toán thành công ${booking.code} - SportZone`;
    const lines = [
      `Xin chào,`,
      ``,
      `Bạn đã thanh toán thành công qua VNPay.`,
      `Mã đơn: ${booking.code}`,
      `Mã GD VNPay: ${booking.vnpTransactionNo || "-"}`,
      `Cơ sở: ${booking.facilityName}`,
      `Sân: ${booking.courtName}`,
      `Ngày: ${booking.date}`,
      `Giờ: ${booking.time}`,
      `Số tiền: ${booking.amount}đ`,
      ``,
      `Vui lòng đến đúng giờ và xuất trình mã đơn khi check-in.`,
    ];
  
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: lines.join("\n"),
      html: `<pre style="font-family:sans-serif">${lines.join("<br>")}</pre>`,
    });
  };