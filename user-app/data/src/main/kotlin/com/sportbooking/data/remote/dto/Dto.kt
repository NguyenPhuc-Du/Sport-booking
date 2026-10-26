package com.sportbooking.data.remote.dto

data class UserDto(
    val id: String,
    val fullName: String,
    val email: String,
    val phone: String,
    val avatarUrl: String?,
    val status: String,
)

data class AuthDto(
    val token: String,
    val user: UserDto,
)

data class UserEnvelope(
    val user: UserDto,
)

data class LoginRequest(
    val email: String,
    val password: String,
)

data class RegisterRequest(
    val fullName: String,
    val phone: String,
    val email: String,
    val password: String,
)

data class UpdateProfileRequest(
    val fullName: String,
    val phone: String,
    val email: String,
)

data class SportDto(
    val id: String,
    val label: String,
)

data class FacilitySummaryDto(
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

data class HomeDto(
    val sports: List<SportDto>,
    val amenities: List<String>,
    val facilities: List<FacilitySummaryDto>,
)

data class CourtDto(
    val id: String,
    val name: String,
    val surface: String,
    val capacity: String,
)

data class FacilityDetailDto(
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
    val courts: List<CourtDto>,
)

data class FacilityEnvelope(
    val facility: FacilityDetailDto,
)

data class TimeSlotDto(
    val time: String,
    val price: Long,
    val peak: Boolean,
    val available: Boolean,
)

data class SlotScheduleDto(
    val facilityId: String,
    val courtId: String,
    val date: String,
    val slots: List<TimeSlotDto>,
)

data class PaymentMethodDto(
    val id: String,
    val title: String,
    val description: String,
)

data class VoucherDto(
    val code: String,
    val description: String,
)

data class DrinkDto(
    val id: String,
    val name: String,
    val image: String?,
    val price: Long,
    val stock: Int,
)

data class DrinkLineDto(
    val drinkId: String,
    val name: String,
    val price: Long,
    val qty: Int,
)

data class DrinkOrderDto(
    val drinkId: String,
    val qty: Int,
)

data class CheckoutOptionsDto(
    val vouchers: List<VoucherDto>,
    val payments: List<PaymentMethodDto>,
    val drinks: List<DrinkDto>? = null,
)

data class BookingRequest(
    val facilityId: String,
    val courtId: String,
    val date: String,
    val time: String,
    val hours: Int = 1,
    val voucherCode: String?,
    val paymentMethod: String?,
    val drinks: List<DrinkOrderDto> = emptyList(),
)

data class BookingQuoteDto(
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
    val drinks: List<DrinkLineDto>? = null,
    val drinkTotal: Long? = null,
)

data class BookingDto(
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
    val drinks: List<DrinkLineDto>? = null,
    val drinkTotal: Long? = null,
)

data class BookingCountsDto(
    val all: Int,
    val upcoming: Int,
    val completed: Int,
    val cancelled: Int,
    val pendingPayment: Int,
)

data class BookingPageDto(
    val filter: String,
    val counts: BookingCountsDto,
    val bookings: List<BookingDto>,
)

data class BookingReceiptDto(
    val booking: BookingDto,
    val paymentUrl: String?,
)

data class NotificationDto(
    val type: String,
    val title: String,
    val text: String,
    val date: String,
)

data class ReviewDto(
    val facility: String,
    val rating: Int,
    val text: String,
)

data class ProfileDto(
    val user: UserDto,
    val notifications: List<NotificationDto>,
    val reviews: List<ReviewDto>,
)

data class MessageDto(
    val message: String,
)

data class VerifyOtpRequest(
    val email: String,
    val code: String,
)

data class ResendOtpRequest(
    val email: String,
    val purpose: String,
)

data class ForgotPasswordRequest(
    val email: String,
)

data class ResetPasswordRequest(
    val email: String,
    val code: String,
    val newPassword: String,
)

data class ApiErrorDto(
    val message: String?,
)
