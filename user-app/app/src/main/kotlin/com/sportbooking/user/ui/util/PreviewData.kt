package com.sportbooking.user.ui.util

import com.sportbooking.domain.model.AppNotification
import com.sportbooking.domain.model.Booking
import com.sportbooking.domain.model.BookingCounts
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.Court
import com.sportbooking.domain.model.Drink
import com.sportbooking.domain.model.DrinkLine
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.model.FacilitySummary
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.model.Sport
import com.sportbooking.domain.model.TimeSlot
import com.sportbooking.domain.model.User
import com.sportbooking.domain.model.Voucher
object PreviewData {
    val sports = listOf(
        Sport(id = "all", label = "Tất cả"),
        Sport(id = "badminton", label = "Cầu lông"),
        Sport(id = "football", label = "Bóng đá"),
        Sport(id = "tennis", label = "Tennis"),
        Sport(id = "pickleball", label = "Pickleball"),
        Sport(id = "basketball", label = "Bóng rổ"),
    )

    val facilitySummary = FacilitySummary(
        id = "fac_1",
        name = "CLB Thể Thao Kỳ Hòa",
        location = "782 Sư Vạn Hạnh, Quận 10, TP.HCM",
        rating = 4.8,
        reviews = 142,
        badge = "Nổi bật",
        sports = listOf("Cầu lông", "Tennis", "Pickleball"),
        sportIds = listOf("badminton", "tennis", "pickleball"),
        image = "https://images.unsplash.com/photo-1546519638-68e109498ffc",
    )

    val facilities = listOf(
        facilitySummary,
        FacilitySummary(
            id = "fac_2",
            name = "Sân Bóng Đá Chảo Lửa",
            location = "30 Phan Thúc Duyện, Tân Bình, TP.HCM",
            rating = 4.6,
            reviews = 89,
            badge = "Ưu đãi",
            sports = listOf("Bóng đá"),
            sportIds = listOf("football"),
            image = "https://images.unsplash.com/photo-1529900748604-07564a03e7a6",
        ),
        FacilitySummary(
            id = "fac_3",
            name = "Trung Tâm Pickleball Sài Gòn",
            location = "12 Thảo Điền, TP. Thủ Đức",
            rating = 4.9,
            reviews = 210,
            badge = "Mới khai trương",
            sports = listOf("Pickleball"),
            sportIds = listOf("pickleball"),
            image = "https://images.unsplash.com/photo-1554068865-24cecd4e34b8",
        ),
    )

    val courts = listOf(
        Court(id = "c_1", name = "Sân Số 1 (Thảm Yonex)", surface = "Thảm PVC chuyên dụng", capacity = "4 người"),
        Court(id = "c_2", name = "Sân Số 2 (Thảm Victor)", surface = "Thảm PVC tiêu chuẩn", capacity = "4 người"),
        Court(id = "c_3", name = "Sân VIP 3 (Có máy lạnh)", surface = "Gỗ sồi cao cấp", capacity = "4 - 8 người"),
    )

    val facilityDetail = FacilityDetail(
        id = "fac_1",
        name = "CLB Thể Thao Kỳ Hòa",
        location = "782 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM",
        hours = "06:00 - 23:00 (Mở tất cả các ngày)",
        phone = "0908 123 456",
        rating = 4.8,
        reviews = 142,
        badge = "Khuyên dùng",
        description = "Tổ hợp thể thao tiêu chuẩn quốc tế với 8 sân cầu lông thảm Yonex, 4 sân tennis đạt chuẩn thi đấu và 6 sân pickleball mới nhất khu vực trung tâm.",
        sports = listOf("Cầu lông", "Tennis", "Pickleball"),
        sportIds = listOf("badminton", "tennis", "pickleball"),
        image = "https://images.unsplash.com/photo-1546519638-68e109498ffc",
        images = listOf(
            "https://images.unsplash.com/photo-1546519638-68e109498ffc",
            "https://images.unsplash.com/photo-1529900748604-07564a03e7a6",
            "https://images.unsplash.com/photo-1554068865-24cecd4e34b8",
        ),
        courts = courts,
    )

    val timeSlots = listOf(
        TimeSlot(time = "06:00 - 07:00", price = 100_000, peak = false, available = true),
        TimeSlot(time = "07:00 - 08:00", price = 120_000, peak = false, available = true),
        TimeSlot(time = "08:00 - 09:00", price = 120_000, peak = false, available = false),
        TimeSlot(time = "17:00 - 18:00", price = 180_000, peak = false, available = true),
        TimeSlot(time = "18:00 - 19:00", price = 200_000, peak = false, available = false),
        TimeSlot(time = "19:00 - 20:00", price = 200_000, peak = false, available = true),
        TimeSlot(time = "20:00 - 21:00", price = 180_000, peak = false, available = true),
        TimeSlot(time = "21:00 - 22:00", price = 140_000, peak = false, available = true),
    )

    val drinks = listOf(
        Drink(id = "d1", name = "Aquafina 500ml", image = "", price = 10_000, stock = 24),
        Drink(id = "d2", name = "Sting dâu", image = "", price = 15_000, stock = 12),
    )

    val drinkLines = listOf(
        DrinkLine(drinkId = "d1", name = "Aquafina 500ml", price = 10_000, qty = 2),
    )

    val bookingQuote = BookingQuote(
        facilityId = "fac_1",
        facilityName = "CLB Thể Thao Kỳ Hòa",
        courtId = "c_1",
        courtName = "Sân Số 1 (Thảm Yonex)",
        date = "2026-10-18",
        time = "18:00 - 19:00",
        courtPrice = 200_000,
        discount = 30_000,
        amount = 190_000,
        voucherCode = "SPORT30K",
        drinks = drinkLines,
        drinkTotal = 20_000,
    )

    val vouchers = listOf(
        Voucher(code = "SPORT30K", description = "Giảm 30.000đ cho đơn từ 150.000đ"),
        Voucher(code = "NEWBIE", description = "Giảm 20% tối đa 50.000đ cho lần đầu đặt sân"),
        Voucher(code = "WEEKEND", description = "Giảm 15.000đ khi đặt sân cuối tuần"),
    )

    val paymentMethods = listOf(
        PaymentMethod(id = "vnpay", title = "VNPay QR", description = "Quét mã QR từ 40+ ứng dụng ngân hàng và thẻ quốc tế"),
    )

    val booking = Booking(
        code = "BK-882910",
        status = "upcoming",
        statusLabel = "Sắp diễn ra",
        facilityId = "fac_1",
        facilityName = "CLB Thể Thao Kỳ Hòa",
        courtId = "c_1",
        courtName = "Sân Số 1 (Thảm Yonex)",
        date = "2026-10-18",
        time = "18:00 - 19:00",
        courtPrice = 200_000,
        discount = 30_000,
        amount = 170_000,
        voucherCode = "SPORT30K",
        paymentMethod = "VNPay QR",
        bookedAt = "15:30 15/10/2026",
    )

    val bookings = listOf(
        booking,
        Booking(
            code = "BK-882451",
            status = "completed",
            statusLabel = "Hoàn thành",
            facilityId = "fac_2",
            facilityName = "Sân Bóng Đá Chảo Lửa",
            courtId = "c_fb",
            courtName = "Sân 5B Cỏ Nhân Tạo",
            date = "2026-10-12",
            time = "19:00 - 20:30",
            courtPrice = 450_000,
            discount = 0,
            amount = 450_000,
            voucherCode = null,
            paymentMethod = "Chuyển khoản / VNPay",
            bookedAt = "10:15 10/10/2026",
        ),
        Booking(
            code = "BK-881203",
            status = "cancelled",
            statusLabel = "Đã hủy",
            facilityId = "fac_3",
            facilityName = "Trung Tâm Pickleball Sài Gòn",
            courtId = "c_pk",
            courtName = "Sân Pickleball Ngoài Trời 2",
            date = "2026-10-05",
            time = "07:00 - 08:00",
            courtPrice = 160_000,
            discount = 0,
            amount = 160_000,
            voucherCode = null,
            paymentMethod = "Ví SportZone",
            bookedAt = "08:00 03/10/2026",
        ),
    )

    val bookingCounts = BookingCounts(
        all = 12,
        upcoming = 2,
        completed = 8,
        cancelled = 2,
    )

    val user = User(
        id = "usr_99",
        fullName = "Nguyễn Phúc Du",
        email = "phucdu.sport@gmail.com",
        phone = "0912 345 678",
        avatarUrl = null,
        status = "active",
    )

    val notifications = listOf(
        AppNotification(
            type = "booking_reminder",
            title = "Nhắc nhở trận đấu sắp tới",
            text = "Trận đấu tại CLB Thể Thao Kỳ Hòa sẽ bắt đầu lúc 18:00 ngày 18/10.",
            date = "15/10/2026",
        ),
        AppNotification(
            type = "promotion",
            title = "Tặng bạn voucher giảm 30K",
            text = "Áp dụng cho mọi sân cầu lông trong tuần này. Nhập mã SPORT30K ngay!",
            date = "14/10/2026",
        ),
    )

    val reviews = listOf(
        Review(
            id = "r1",
            facility = "CLB Thể Thao Kỳ Hòa",
            facilityId = "fac_1",
            bookingCode = "BK001",
            rating = 5,
            text = "Sân thảm mới, đèn sáng không chói mắt, nhân viên nhiệt tình hỗ trợ nước uống và vợt tập.",
            createdAt = "01/11/2026",
        ),
        Review(
            id = "r2",
            facility = "Sân Bóng Đá Chảo Lửa",
            facilityId = "fac_2",
            bookingCode = "BK002",
            rating = 4,
            text = "Mặt cỏ êm, thoát nước tốt ngay cả khi trời mưa.",
            createdAt = "02/11/2026",
        ),
        Review(
            id = "r3",
            facility = "Sân Tennis Quận 7",
            facilityId = "fac_3",
            bookingCode = "BK003",
            rating = 3,
            text = "Sân ổn nhưng phòng thay đồ hơi chật, cần cải thiện thêm.",
            createdAt = "03/11/2026",
        ),
        Review(
            id = "r4",
            facility = "Pickleball City Sports",
            facilityId = "fac_4",
            bookingCode = "BK004",
            rating = 5,
            text = "Không gian rộng, đặt lịch nhanh, sẽ quay lại.",
            createdAt = "04/11/2026",
        ),
        Review(
            id = "r5",
            facility = "Sân Cầu Lông Hòa Bình",
            facilityId = "fac_5",
            bookingCode = "BK005",
            rating = 2,
            text = "Đèn hơi tối ở góc sân, mặt sàn còn trơn khi đổ mồ hôi.",
            createdAt = "05/11/2026",
        ),
    )
}
