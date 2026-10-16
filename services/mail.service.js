const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: ProcessingInstruction.env.SMTP_HOST,
    port: Number(ProcessingInstruction.env.SMTP_PORT || 587),
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