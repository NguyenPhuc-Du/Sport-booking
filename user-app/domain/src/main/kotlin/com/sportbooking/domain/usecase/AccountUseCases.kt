package com.sportbooking.domain.usecase

import com.sportbooking.domain.repository.ProfileRepository
import com.sportbooking.domain.repository.WalletRepository
import javax.inject.Inject

class GetProfileUseCase @Inject constructor(
    private val repository: ProfileRepository,
) {
    suspend operator fun invoke() = repository.profile()
}

class UpdateProfileUseCase @Inject constructor(
    private val repository: ProfileRepository,
) {
    suspend operator fun invoke(fullName: String, phone: String, email: String) =
        repository.update(fullName.trim(), phone.trim(), email.trim())
}

class GetWalletUseCase @Inject constructor(
    private val repository: WalletRepository,
) {
    suspend operator fun invoke() = repository.wallet()
}

class TopUpWalletUseCase @Inject constructor(
    private val repository: WalletRepository,
) {
    suspend operator fun invoke(amount: Long, method: String) = repository.topUp(amount, method)
}
