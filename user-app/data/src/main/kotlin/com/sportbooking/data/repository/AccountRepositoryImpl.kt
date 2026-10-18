package com.sportbooking.data.repository

import com.sportbooking.data.remote.ApiCaller
import com.sportbooking.data.remote.SportApi
import com.sportbooking.data.remote.dto.UpdateProfileRequest
import com.sportbooking.data.remote.dto.toDomain
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Profile
import com.sportbooking.domain.model.User
import com.sportbooking.domain.repository.ProfileRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProfileRepositoryImpl @Inject constructor(
    private val api: SportApi,
    private val caller: ApiCaller,
) : ProfileRepository {
    override suspend fun profile(): DomainResult<Profile> {
        return when (val result = caller.call { api.profile() }) {
            is DomainResult.Success -> DomainResult.Success(result.data.toDomain())
            is DomainResult.Failure -> result
        }
    }

    override suspend fun update(fullName: String, phone: String, email: String): DomainResult<User> {
        val body = UpdateProfileRequest(fullName, phone, email)
        return when (val result = caller.call { api.updateProfile(body) }) {
            is DomainResult.Success -> DomainResult.Success(result.data.user.toDomain())
            is DomainResult.Failure -> result
        }
    }
}