package com.sportbooking.data.remote

import com.google.gson.Gson
import com.sportbooking.data.remote.dto.ApiErrorDto
import com.sportbooking.domain.common.DomainResult
import javax.inject.Inject
import kotlinx.coroutines.CancellationException
import retrofit2.HttpException
import java.io.IOException

class ApiCaller @Inject constructor(
    private val gson: Gson,
) {
    suspend fun <T> call(block: suspend () -> T): DomainResult<T> {
        return try {
            DomainResult.Success(block())
        } catch (error: CancellationException) {
            throw error
        } catch (error: HttpException) {
            DomainResult.Failure(
                message = error.apiMessage(),
                unauthorized = error.response()?.code() == 401,
            )
        } catch (_: IOException) {
            DomainResult.Failure("Không kết nối được máy chủ")
        } catch (_: Exception) {
            DomainResult.Failure("Đã có lỗi xảy ra")
        }
    }

    private fun HttpException.apiMessage(): String {
        val raw = response()?.errorBody()?.string().orEmpty()
        val parsed = runCatching { gson.fromJson(raw, ApiErrorDto::class.java).message }.getOrNull()
        val status = response()?.code() ?: 0
        return parsed?.takeIf { it.isNotBlank() } ?: "Yêu cầu thất bại ($status)"
    }
}
