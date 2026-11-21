package com.sportbooking.domain.usecase

import com.sportbooking.domain.repository.ReviewRepository
import javax.inject.Inject

class GetMyReviewsUseCase @Inject constructor(
    private val repository: ReviewRepository,
) {
    suspend operator fun invoke() = repository.mine()
}

class CreateReviewUseCase @Inject constructor(
    private val repository: ReviewRepository,
) {
    suspend operator fun invoke(bookingCode: String, rating: Int, text: String) =
        repository.create(bookingCode, rating, text.trim())
}

class UpdateReviewUseCase @Inject constructor(
    private val repository: ReviewRepository,
) {
    suspend operator fun invoke(id: String, rating: Int, text: String) =
        repository.update(id, rating, text.trim())
}
