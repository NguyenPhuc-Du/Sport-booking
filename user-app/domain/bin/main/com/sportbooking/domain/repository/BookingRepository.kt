package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.BookingDraft
import com.sportbooking.domain.model.BookingPage
import com.sportbooking.domain.model.BookingQuote
import com.sportbooking.domain.model.BookingReceipt
import com.sportbooking.domain.model.CheckoutOptions

interface BookingRepository {
    suspend fun checkoutOptions(facilityId: String): DomainResult<CheckoutOptions>
    suspend fun quote(draft: BookingDraft): DomainResult<BookingQuote>
    suspend fun create(draft: BookingDraft): DomainResult<BookingReceipt>
    suspend fun list(filter: String): DomainResult<BookingPage>
    suspend fun cancel(code: String): DomainResult<BookingReceipt>
}
