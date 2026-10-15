package com.sportbooking.data.di

import com.sportbooking.data.repository.AuthRepositoryImpl
import com.sportbooking.data.repository.BookingRepositoryImpl
import com.sportbooking.data.repository.FacilityRepositoryImpl
import com.sportbooking.data.repository.ProfileRepositoryImpl
import com.sportbooking.data.repository.WalletRepositoryImpl
import com.sportbooking.domain.repository.AuthRepository
import com.sportbooking.domain.repository.BookingRepository
import com.sportbooking.domain.repository.FacilityRepository
import com.sportbooking.domain.repository.ProfileRepository
import com.sportbooking.domain.repository.WalletRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun auth(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    @Singleton
    abstract fun facilities(impl: FacilityRepositoryImpl): FacilityRepository

    @Binds
    @Singleton
    abstract fun bookings(impl: BookingRepositoryImpl): BookingRepository

    @Binds
    @Singleton
    abstract fun profile(impl: ProfileRepositoryImpl): ProfileRepository

    @Binds
    @Singleton
    abstract fun wallet(impl: WalletRepositoryImpl): WalletRepository
}
