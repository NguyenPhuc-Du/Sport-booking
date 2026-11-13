package com.sportbooking.domain.usecase

import com.sportbooking.domain.model.BookingDraft
import com.sportbooking.domain.repository.BookingRepository
import javax.inject.Inject

class GetCheckoutOptionsUseCase @Inject constructor(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(facilityId: String) = repository.checkoutOptions(facilityId)
}

class QuoteBookingUseCase @Inject constructor(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(draft: BookingDraft) = repository.quote(draft)
}

class CreateBookingUseCase @Inject constructor(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(draft: BookingDraft) = repository.create(draft)
}

class GetBookingsUseCase @Inject constructor(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(filter: String) = repository.list(filter)
}

class CancelBookingUseCase @Inject constructor(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(code: String) = repository.cancel(code)
}
