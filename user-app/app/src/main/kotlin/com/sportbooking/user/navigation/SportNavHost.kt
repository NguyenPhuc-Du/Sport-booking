package com.sportbooking.user.navigation

import android.net.Uri
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sportbooking.domain.model.User
import com.sportbooking.user.ui.auth.LoginScreen
import com.sportbooking.user.ui.auth.RegisterScreen
import com.sportbooking.user.ui.booking.BookingScreen
import com.sportbooking.user.ui.bookings.BookingsScreen
import com.sportbooking.user.ui.checkout.CheckoutScreen
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.MessageScreen
import com.sportbooking.user.ui.facility.FacilityDetailScreen
import com.sportbooking.user.ui.home.HomeScreen
import com.sportbooking.user.ui.profile.ProfileScreen
import com.sportbooking.user.ui.session.SessionUiState
import com.sportbooking.user.ui.session.SessionViewModel
import com.sportbooking.user.ui.wallet.WalletScreen
import kotlinx.coroutines.launch

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab("home", "Sân", Icons.Filled.Home),
    Tab("bookings", "Lịch", Icons.Filled.DateRange),
    Tab("wallet", "Ví", Icons.Outlined.AccountBalanceWallet),
    Tab("account", "Tôi", Icons.Filled.Person),
)

@Composable
fun SportBookingRoot(sessionViewModel: SessionViewModel = hiltViewModel()) {
    val session by sessionViewModel.state.collectAsStateWithLifecycle()
    when (val current = session) {
        SessionUiState.Loading -> LoadingScreen()
        SessionUiState.LoggedOut -> AuthNavHost(onAuthenticated = sessionViewModel::onAuthenticated)
        is SessionUiState.Offline -> MessageScreen(current.message, "Thử lại", sessionViewModel::refresh)
        is SessionUiState.LoggedIn -> MainNavHost(
            user = current.user,
            onLogout = sessionViewModel::logout,
            onUserUpdated = sessionViewModel::onAuthenticated,
            onBalanceChanged = sessionViewModel::updateBalance,
        )
    }
}

@Composable
private fun AuthNavHost(onAuthenticated: (User) -> Unit) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                onLoggedIn = onAuthenticated,
                onRegister = { navController.navigate("register") },
            )
        }
        composable("register") {
            RegisterScreen(
                onLoggedIn = onAuthenticated,
                onBack = { navController.popBackStack() },
            )
        }
    }
}

@Composable
private fun MainNavHost(
    user: User,
    onLogout: () -> Unit,
    onUserUpdated: (User) -> Unit,
    onBalanceChanged: (Long) -> Unit,
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val showBar = tabs.any { it.route == route }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (showBar) {
                NavigationBar {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = route == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(padding),
        ) {
            composable("home") {
                HomeScreen(onOpenFacility = { id -> navController.navigate("facility/$id") })
            }
            composable("bookings") {
                BookingsScreen(onBalanceChanged = onBalanceChanged)
            }
            composable("wallet") {
                WalletScreen(onBalanceChanged = onBalanceChanged)
            }
            composable("account") {
                ProfileScreen(onUserUpdated = onUserUpdated, onLogout = onLogout)
            }
            composable(
                route = "facility/{facilityId}",
                arguments = listOf(navArgument("facilityId") { type = NavType.StringType }),
            ) {
                FacilityDetailScreen(
                    onBack = { navController.popBackStack() },
                    onBook = { id -> navController.navigate("booking/$id") },
                )
            }
            composable(
                route = "booking/{facilityId}",
                arguments = listOf(navArgument("facilityId") { type = NavType.StringType }),
            ) { entry ->
                BookingScreen(
                    onBack = { navController.popBackStack() },
                    onCheckout = { courtId, date, time ->
                        val encodedTime = Uri.encode(time)
                        val facilityId = entry.arguments?.getString("facilityId").orEmpty()
                        navController.navigate(
                            "checkout?facilityId=$facilityId&courtId=$courtId&date=$date&time=$encodedTime",
                        )
                    },
                )
            }
            composable(
                route = "checkout?facilityId={facilityId}&courtId={courtId}&date={date}&time={time}",
                arguments = listOf(
                    navArgument("facilityId") { type = NavType.StringType },
                    navArgument("courtId") { type = NavType.StringType },
                    navArgument("date") { type = NavType.StringType },
                    navArgument("time") { type = NavType.StringType },
                ),
            ) {
                CheckoutScreen(
                    walletBalance = user.walletBalance,
                    onBack = { navController.popBackStack() },
                    onBooked = { balance ->
                        onBalanceChanged(balance)
                        scope.launch { snackbarHostState.showSnackbar("Đặt sân thành công") }
                        navController.navigate("bookings") {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                        }
                    },
                )
            }
        }
    }
}
