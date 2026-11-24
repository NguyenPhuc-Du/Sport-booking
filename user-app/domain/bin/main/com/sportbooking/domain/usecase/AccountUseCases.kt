package com.sportbooking.domain.usecase

import com.sportbooking.domain.repository.ProfileRepository
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

class UploadAvatarUseCase @Inject constructor(
    private val repository: ProfileRepository,
) {
    suspend operator fun invoke(bytes: ByteArray, mime: String) = repository.uploadAvatar(bytes, mime)
}