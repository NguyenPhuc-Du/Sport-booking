package com.sportbooking.user.session

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Holds guest → login handoff: where to return, and checkout selections to restore
 * if the Checkout ViewModel is recreated.
 */
@Singleton
class GuestSessionStore @Inject constructor() {
    data class CheckoutSnapshot(
        val facilityId: String,
        val courtId: String,
        val date: String,
        val time: String,
        val hours: Int,
        val drinkQty: Map<String, Int> = emptyMap(),
        val selectedByScope: Map<String, String> = emptyMap(),
        val paymentMethod: String = "vnpay",
    )

    @Volatile
    var pendingReturnRoute: String? = null

    @Volatile
    var checkoutSnapshot: CheckoutSnapshot? = null

    fun clearPending() {
        pendingReturnRoute = null
    }

    fun clearCheckout() {
        checkoutSnapshot = null
    }

    fun clearAll() {
        clearPending()
        clearCheckout()
    }
}
