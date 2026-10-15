package com.sportbooking.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

private val Context.sessionStore by preferencesDataStore(name = "sportzone_session")

@Singleton
class AuthTokenHolder @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    @Volatile
    var token: String? = null
        private set

    suspend fun restore() {
        if (token != null) return
        token = context.sessionStore.data.first()[KEY]
    }

    suspend fun save(value: String) {
        token = value
        context.sessionStore.edit { prefs -> prefs[KEY] = value }
    }

    suspend fun clear() {
        token = null
        context.sessionStore.edit { prefs -> prefs.remove(KEY) }
    }

    private companion object {
        val KEY = stringPreferencesKey("access_token")
    }
}
