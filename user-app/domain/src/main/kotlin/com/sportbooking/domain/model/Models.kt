package com.sportbooking.domain.model

data class User(
    val id: String,
    val fullName: String,
    val email: String,
    val phone: String,
    val avatarUrl: String?,
    val status: String,
    val walletBalance: Long,
)

data class Sport(
    val id: String,
    val label: String,
)

data class FacilitySummary(
    val id: String,
    val name: String,
    val location: String,
    val rating: Double,
    val reviews: Int,
    val badge: String?,
    val sports: List<String>,
    val sportIds: List<String>,
    val image: String,
)

data class HomeContent(
    val sports: List<Sport>,
    val amenities: List<String>,
    val facilities: List<FacilitySummary>,
)

data class Court(
    val id: String,
    val name: String,
    val surface: String,
    val capacity: String,
)

data class FacilityDetail(
    val id: String,
    val name: String,
    val location: String,
    val hours: String,
    val phone: String,
    val rating: Double,
    val reviews: Int,
    val badge: String?,
    val description: String,
    val sports: List<String>,
    val sportIds: List<String>,
    val image: String,
    val amenities: List<String>,
    val images: List<String>,
    val courts: List<Court>,
)

data class TimeSlot(
    val time: String,
    val price: Long,
    val peak: Boolean,
    val available: Boolean,
)

data class SlotSchedule(
    val facilityId: String,
    val courtId: String,
    val date: String,
    val slots: List<TimeSlot>,
)

data class PaymentMethod(
    val id: String,
    val title: String,
    val description: String,
)

data class Voucher(
    val code: String,
    val description: String,
)

data class CheckoutOptions(
    val vouchers: List<Voucher>,
    val payments: List<PaymentMethod>,
)

data class BookingQuote(
    val facilityId: String,
    val facilityName: String,
    val courtId: String,
    val courtName: String,
    val date: String,
    val time: String,
    val courtPrice: Long,
    val discount: Long,
    val amount: Long,
    val voucherCode: String?,
)

data class BookingDraft(
    val facilityId: String,
    val courtId: String,
    val date: String,
    val time: String,
    val voucherCode: String? = null,
    val paymentMethod: String? = null,
)

data class Booking(
    val code: String,
    val status: String,
    val statusLabel: String,
    val facilityId: String,
    val facilityName: String,
    val courtId: String,
    val courtName: String,
    val date: String,
    val time: String,
    val courtPrice: Long,
    val discount: Long,
    val amount: Long,
    val voucherCode: String?,
    val paymentMethod: String,
    val bookedAt: String,
)

data class BookingCounts(
    val all: Int,
    val upcoming: Int,
    val completed: Int,
    val cancelled: Int,
)

data class BookingPage(
    val filter: String,
    val counts: BookingCounts,
    val bookings: List<Booking>,
)

data class BookingReceipt(
    val booking: Booking,
    val walletBalance: Long,
)

data class AppNotification(
    val type: String,
    val title: String,
    val text: String,
    val date: String,
)

data class Review(
    val facility: String,
    val rating: Int,
    val text: String,
)

data class Profile(
    val user: User,
    val notifications: List<AppNotification>,
    val reviews: List<Review>,
)

data class WalletInfo(
    val balance: Long,
    val amounts: List<Long>,
    val methods: List<PaymentMethod>,
)

data class TopUpResult(
    val balance: Long,
    val amount: Long,
    val method: String,
)
