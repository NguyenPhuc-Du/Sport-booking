package com.sportbooking.data.remote

import com.sportbooking.data.remote.dto.AuthDto
import com.sportbooking.data.remote.dto.BookingPageDto
import com.sportbooking.data.remote.dto.BookingQuoteDto
import com.sportbooking.data.remote.dto.BookingReceiptDto
import com.sportbooking.data.remote.dto.BookingRequest
import com.sportbooking.data.remote.dto.CheckoutOptionsDto
import com.sportbooking.data.remote.dto.FacilityEnvelope
import com.sportbooking.data.remote.dto.HomeDto
import com.sportbooking.data.remote.dto.LoginRequest
import com.sportbooking.data.remote.dto.ProfileDto
import com.sportbooking.data.remote.dto.RegisterRequest
import com.sportbooking.data.remote.dto.SlotScheduleDto
import com.sportbooking.data.remote.dto.TopUpDto
import com.sportbooking.data.remote.dto.TopUpRequest
import com.sportbooking.data.remote.dto.UpdateProfileRequest
import com.sportbooking.data.remote.dto.UserEnvelope
import com.sportbooking.data.remote.dto.WalletDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface SportApi {
    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthDto

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthDto

    @GET("auth/me")
    suspend fun me(): UserEnvelope

    @GET("home")
    suspend fun home(@Query("sport") sport: String, @Query("q") query: String): HomeDto

    @GET("facilities/{id}")
    suspend fun facility(@Path("id") id: String): FacilityEnvelope

    @GET("facilities/{id}/slots")
    suspend fun slots(
        @Path("id") id: String,
        @Query("courtId") courtId: String,
        @Query("date") date: String,
    ): SlotScheduleDto

    @GET("checkout/options")
    suspend fun checkoutOptions(): CheckoutOptionsDto

    @POST("bookings/quote")
    suspend fun quote(@Body body: BookingRequest): BookingQuoteDto

    @POST("bookings")
    suspend fun createBooking(@Body body: BookingRequest): BookingReceiptDto

    @GET("bookings")
    suspend fun bookings(@Query("filter") filter: String): BookingPageDto

    @POST("bookings/{code}/cancel")
    suspend fun cancel(@Path("code") code: String): BookingReceiptDto

    @GET("profile")
    suspend fun profile(): ProfileDto

    @PUT("profile")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): UserEnvelope

    @GET("wallet")
    suspend fun wallet(): WalletDto

    @POST("wallet/top-up")
    suspend fun topUp(@Body body: TopUpRequest): TopUpDto
}
