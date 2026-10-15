package com.sportbooking.data.repository

import com.sportbooking.data.local.AuthTokenHolder
import com.sportbooking.data.remote.ApiCaller
import com.sportbooking.data.remote.SportApi
import com.sportbooking.data.remote.dto.LoginRequest
import com.sportbooking.data.remote.dto.RegisterRequest
import com.sportbooking.data.remote.dto.toDomain
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.User
import com.sportbooking.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val api: SportApi,
    private val caller: ApiCaller,
    private val tokenHolder: AuthTokenHolder,
) : AuthRepository {
    override suspend fun login(email: String, password: String): DomainResult<User> {
        return when (val result = caller.call { api.login(LoginRequest(email, password)) }) {
            is DomainResult.Success -> {
                tokenHolder.save(result.data.token)
                DomainResult.Success(result.data.user.toDomain())
            }
            is DomainResult.Failure -> result
        }
    }

    override suspend fun register(
        fullName: String,
        phone: String,
        email: String,
        password: String,
    ): DomainResult<User> {
        val body = RegisterRequest(fullName, phone, email, password)
        return when (val result = caller.call { api.register(body) }) {
            is DomainResult.Success -> {
                tokenHolder.save(result.data.token)
                DomainResult.Success(result.data.user.toDomain())
            }
            is DomainResult.Failure -> result
        }
    }

    override suspend fun currentUser(): DomainResult<User> {
        tokenHolder.restore()
        if (tokenHolder.token.isNullOrBlank()) {
            return DomainResult.Failure("Chưa đăng nhập", unauthorized = true)
        }
        val result = caller.call { api.me().user.toDomain() }
        if (result is DomainResult.Failure && result.unauthorized) {
            tokenHolder.clear()
        }
        return result
    }

    override suspend fun logout() {
        tokenHolder.clear()
    }
}
