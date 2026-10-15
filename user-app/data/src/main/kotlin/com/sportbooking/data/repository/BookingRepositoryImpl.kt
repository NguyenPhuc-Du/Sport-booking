package com.sportbooking.data.repository

import com.sportbooking.data.remote.ApiCaller
import com.sportbooking.data.remote.SportApi
import com.sportbooking.data.remote.dto.BookingRequest
import com.sportbooking.data.remote.dto.toDomain
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.BookingDraft
import com.sportbooking.domain.model.BookingPage
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.BookingReceipt
import com.sportbooking.domain.model.CheckoutOptions
import com.sportbooking.domain.repository.BookingRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepositoryImpl @Inject constructor(
    private val api: SportApi,
    private val caller: ApiCaller,
) : BookingRepository {
    override suspend fun checkoutOptions(): DomainResult<CheckoutOptions> {
        return when (val result = caller.call { api.checkoutOptions() }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun quote(draft: BookingDraft): DomainResult<BookingQuote> {
        return when (val result = caller.call { api.quote(draft.toRequest()) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun create(draft: BookingDraft): DomainResult<BookingReceipt> {
        return when (val result = caller.call { api.createBooking(draft.toRequest()) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun list(filter: String): DomainResult<BookingPage> {
        return when (val result = caller.call { api.bookings(filter) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun cancel(code: String): DomainResult<BookingReceipt> {
        return when (val result = caller.call { api.cancel(code) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    private fun BookingDraft.toRequest() = BookingRequest(
        facilityId = facilityId,
        courtId = courtId,
        date = date,
        time = time,
        voucherCode = voucherCode,
        paymentMethod = paymentMethod,
    )
}
