package com.sportbooking.user.di

import com.sportbooking.data.di.BaseUrl
import com.sportbooking.data.di.EnableHttpLogs
import com.sportbooking.user.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    @BaseUrl
    fun baseUrl(): String = BuildConfig.API_BASE_URL

    @Provides
    @Singleton
    @EnableHttpLogs
    fun httpLogs(): Boolean = BuildConfig.HTTP_LOGS
}
