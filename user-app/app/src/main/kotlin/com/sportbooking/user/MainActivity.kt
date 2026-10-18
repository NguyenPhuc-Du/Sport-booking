package com.sportbooking.user

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.sportbooking.user.navigation.SportBookingRoot
import com.sportbooking.user.payment.PaymentResultBus
import com.sportbooking.user.ui.theme.SportBookingTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        PaymentResultBus.publish(intent?.data)
        setContent {
            SportBookingTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SportBookingRoot()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        PaymentResultBus.publish(intent.data)
    }
}
