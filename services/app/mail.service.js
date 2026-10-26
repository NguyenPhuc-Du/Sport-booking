const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

function money(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function drinkLines(booking) {
    return (booking.drinks || []).map(
        (item) => `${item.name} x${item.qty}: ${money(item.price * item.qty)}`,
    );
}

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
    const drinks = drinkLines(booking);
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
      `Giá sân: ${money(booking.courtPrice)}`,
    ];
    if (Number(booking.discount) > 0) {
      lines.push(`Giảm giá: -${money(booking.discount)}`);
    }
    if (drinks.length) {
      lines.push(`Đồ uống: ${money(booking.drinkTotal)}`);
      drinks.forEach((line) => lines.push(`  - ${line}`));
    }
    lines.push(`Số tiền: ${money(booking.amount)}`);
    lines.push(``);
    lines.push(`Vui lòng đến đúng giờ và xuất trình mã QR hoặc mã đơn khi check-in.`);

    const qrPng = await QRCode.toBuffer(String(booking.code), {
      type: "png",
      width: 280,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    const drinkHtml = drinks.length
      ? `<p>Đồ uống: <b>${money(booking.drinkTotal)}</b></p><ul>${drinks
          .map((line) => `<li>${line}</li>`)
          .join("")}</ul>`
      : "";

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject,
      text: lines.join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
          <p>Bạn đã thanh toán thành công qua VNPay.</p>
          <p>Mã đơn: <b>${booking.code}</b></p>
          <p>Mã GD VNPay: ${booking.vnpTransactionNo || "-"}</p>
          <p>Cơ sở: ${booking.facilityName}</p>
          <p>Sân: ${booking.courtName}</p>
          <p>Ngày: ${booking.date}</p>
          <p>Giờ: ${booking.time}</p>
          <p>Giá sân: ${money(booking.courtPrice)}</p>
          ${Number(booking.discount) > 0 ? `<p>Giảm giá: -${money(booking.discount)}</p>` : ""}
          ${drinkHtml}
          <p>Số tiền: <b>${money(booking.amount)}</b></p>
          <p>Đưa mã QR này cho nhân viên khi check-in:</p>
          <img src="cid:booking-qr" alt="QR check-in ${booking.code}" width="180" height="180" />
        </div>
      `,
      attachments: [
        {
          filename: `qr-${booking.code}.png`,
          content: qrPng,
          cid: "booking-qr",
          contentType: "image/png",
        },
      ],
    });
  };
