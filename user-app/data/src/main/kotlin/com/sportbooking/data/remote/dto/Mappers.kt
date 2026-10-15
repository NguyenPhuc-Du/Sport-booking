package com.sportbooking.data.remote.dto

import com.sportbooking.domain.model.AppNotification
import com.sportbooking.domain.model.Booking
import com.sportbooking.domain.model.BookingCounts
import com.sportbooking.domain.model.BookingPage
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.BookingReceipt
import com.sportbooking.domain.model.CheckoutOptions
import com.sportbooking.domain.model.Court
import com.sportbooking.domain.model.FacilityDetail
import com.sportbooking.domain.model.FacilitySummary
import com.sportbooking.domain.model.HomeContent
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Profile
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.model.SlotSchedule
import com.sportbooking.domain.model.Sport
import com.sportbooking.domain.model.TimeSlot
import com.sportbooking.domain.model.TopUpResult
import com.sportbooking.domain.model.User
import com.sportbooking.domain.model.Voucher
import com.sportbooking.domain.model.WalletInfo

fun UserDto.toDomain() = User(id, fullName, email, phone, avatarUrl, status, walletBalance)

fun HomeDto.toDomain() = HomeContent(
    sports = sports.map { Sport(it.id, it.label) },
    amenities = amenities,
    facilities = facilities.map { it.toDomain() },
)

fun FacilitySummaryDto.toDomain() = FacilitySummary(
    id, name, location, rating, reviews, badge, sports, sportIds, image,
)

fun FacilityDetailDto.toDomain() = FacilityDetail(
    id = id,
    name = name,
    location = location,
    hours = hours,
    phone = phone,
    rating = rating,
    reviews = reviews,
    badge = badge,
    description = description,
    sports = sports,
    sportIds = sportIds,
    image = image,
    amenities = amenities,
    images = images,
    courts = courts.map { Court(it.id, it.name, it.surface, it.capacity) },
)

fun SlotScheduleDto.toDomain() = SlotSchedule(
    facilityId = facilityId,
    courtId = courtId,
    date = date,
    slots = slots.map { TimeSlot(it.time, it.price, it.peak, it.available) },
)

fun PaymentMethodDto.toDomain() = PaymentMethod(id, title, description)

fun CheckoutOptionsDto.toDomain() = CheckoutOptions(
    vouchers = vouchers.map { Voucher(it.code, it.description) },
    payments = payments.map { it.toDomain() },
)

fun BookingQuoteDto.toDomain() = BookingQuote(
    facilityId, facilityName, courtId, courtName, date, time, courtPrice, discount, amount, voucherCode,
)

fun BookingDto.toDomain() = Booking(
    code, status, statusLabel, facilityId, facilityName, courtId, courtName,
    date, time, courtPrice, discount, amount, voucherCode, paymentMethod, bookedAt,
)

fun BookingPageDto.toDomain() = BookingPage(
    filter = filter,
    counts = BookingCounts(counts.all, counts.upcoming, counts.completed, counts.cancelled),
    bookings = bookings.map { it.toDomain() },
)

fun BookingReceiptDto.toDomain() = BookingReceipt(booking.toDomain(), walletBalance)

fun ProfileDto.toDomain() = Profile(
    user = user.toDomain(),
    notifications = notifications.map { AppNotification(it.type, it.title, it.text, it.date) },
    reviews = reviews.map { Review(it.facility, it.rating, it.text) },
)

fun WalletDto.toDomain() = WalletInfo(balance, amounts, methods.map { it.toDomain() })

fun TopUpDto.toDomain() = TopUpResult(balance, amount, method)
