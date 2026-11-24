package com.sportbooking.data.repository

import com.sportbooking.data.remote.ApiCaller
import com.sportbooking.data.remote.SportApi
import com.sportbooking.data.remote.dto.UpsertReviewRequest
import com.sportbooking.data.remote.dto.toDomain
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.repository.ReviewRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReviewRepositoryImpl @Inject constructor(
    private val api: SportApi,
    private val caller: ApiCaller,
) : ReviewRepository {
    override suspend fun mine(): DomainResult<List<Review>> {
        return when (val result = caller.call { api.myReviews() }) {
            is DomainResult.Success -> DomainResult.Success(result.data.reviews.map { it.toDomain() })
            is DomainResult.Failure -> result
        }
    }

    override suspend fun create(bookingCode: String, rating: Int, text: String): DomainResult<Review> {
        return when (
            val result = caller.call {
                api.createReview(UpsertReviewRequest(bookingCode = bookingCode, rating = rating, text = text))
            }
        ) {
            is DomainResult.Success -> DomainResult.Success(result.data.review.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun update(id: String, rating: Int, text: String): DomainResult<Review> {
        return when (
            val result = caller.call {
                api.updateReview(id, UpsertReviewRequest(rating = rating, text = text))
            }
        ) {
            is DomainResult.Success -> DomainResult.Success(result.data.review.toDomain())
            is DomainResult.Failure -> result
        }
    }
}
