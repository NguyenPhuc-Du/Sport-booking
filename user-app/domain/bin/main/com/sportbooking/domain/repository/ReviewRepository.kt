package com.sportbooking.domain.repository

import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Review

interface ReviewRepository {
    suspend fun mine(): DomainResult<List<Review>>
    suspend fun create(bookingCode: String, rating: Int, text: String): DomainResult<Review>
    suspend fun update(id: String, rating: Int, text: String): DomainResult<Review>
}
