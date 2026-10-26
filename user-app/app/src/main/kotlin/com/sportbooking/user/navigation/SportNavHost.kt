package com.sportbooking.user.navigation

import android.net.Uri
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.Lifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sportbooking.domain.model.User
import com.sportbooking.user.payment.PaymentResultBus
import com.sportbooking.user.ui.auth.ForgotPasswordScreen
import com.sportbooking.user.ui.auth.LoginScreen
import com.sportbooking.user.ui.auth.OTP_PURPOSE_REGISTER
import com.sportbooking.user.ui.auth.OTP_PURPOSE_RESET
import com.sportbooking.user.ui.auth.OtpScreen
import com.sportbooking.user.ui.auth.RegisterScreen
import com.sportbooking.user.ui.auth.ResetPasswordScreen
import com.sportbooking.user.ui.booking.BookingScreen
import com.sportbooking.user.ui.bookings.BookingsScreen
import com.sportbooking.user.ui.checkout.CheckoutScreen
import com.sportbooking.user.ui.components.AppBottomNavBar
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.MessageScreen
import com.sportbooking.user.ui.components.defaultBottomNavTabs
import com.sportbooking.user.ui.facility.FacilityDetailScreen
import com.sportbooking.user.ui.home.HomeScreen
import com.sportbooking.user.ui.profile.ProfileScreen
import com.sportbooking.user.ui.payment.PaymentResultScreen
import com.sportbooking.user.ui.session.SessionUiState
import com.sportbooking.user.ui.session.SessionViewModel
import kotlinx.coroutines.launch

@Composable
fun SportBookingRoot(sessionViewModel: SessionViewModel = hiltViewModel()) {
    val session by sessionViewModel.state.collectAsStateWithLifecycle()
    when (val current = session) {
        SessionUiState.Loading -> LoadingScreen()
        SessionUiState.LoggedOut -> AuthNavHost(onAuthenticated = sessionViewModel::onAuthenticated)
        is SessionUiState.Offline -> MessageScreen(current.message, "Thử lại", sessionViewModel::refresh)
        is SessionUiState.LoggedIn -> MainNavHost(
            onLogout = sessionViewModel::logout,
            onUserUpdated = sessionViewModel::onAuthenticated,
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
                onForgotPassword = { navController.navigate("forgot_password") },
            )
        }
        composable("forgot_password") {
            ForgotPasswordScreen(
                onNavigateToOtp = { email -> navController.navigate("otp/$OTP_PURPOSE_RESET/${Uri.encode(email)}") },
                onBack = { navController.popBackStack() },
            )
        }
        composable("register") {
            RegisterScreen(
                onNavigateToOtp = { email -> navController.navigate("otp/$OTP_PURPOSE_REGISTER/${Uri.encode(email)}") },
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            route = "otp/{purpose}/{email}",
            arguments = listOf(
                navArgument("purpose") { type = NavType.StringType },
                navArgument("email") { type = NavType.StringType },
            ),
        ) { entry ->
            val email = entry.arguments?.getString("email").orEmpty()
            OtpScreen(
                onBack = { navController.popBackStack() },
                onRegistered = onAuthenticated,
                onResetCodeEntered = { code ->
                    navController.navigate("reset_password/${Uri.encode(email)}/$code")
                },
            )
        }
        composable(
            route = "reset_password/{email}/{code}",
            arguments = listOf(
                navArgument("email") { type = NavType.StringType },
                navArgument("code") { type = NavType.StringType },
            ),
        ) {
            ResetPasswordScreen(
                onBack = { navController.popBackStack() },
                onDone = { navController.popBackStack("login", inclusive = false) },
            )
        }
    }
}

@Composable
private fun MainNavHost(
    onLogout: () -> Unit,
    onUserUpdated: (User) -> Unit,
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val backStack by navController.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val showBar = defaultBottomNavTabs.any { it.route == route }
    val paymentResult by PaymentResultBus.result.collectAsStateWithLifecycle()

    LaunchedEffect(paymentResult) {
        val result = paymentResult ?: return@LaunchedEffect
        PaymentResultBus.consume()
        val flag = if (result.success) "success" else "failed"
        navController.navigate("payment_result/$flag/${Uri.encode(result.code)}") {
            popUpTo(navController.graph.findStartDestination().id) { inclusive = false }
            launchSingleTop = true
        }
    }

    Scaffold(
        contentWindowInsets = WindowInsets.safeDrawing.only(
            WindowInsetsSides.Horizontal + WindowInsetsSides.Top,
        ),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (showBar) {
                AppBottomNavBar(
                    currentRoute = route,
                    onNavigate = { targetRoute ->
                        navController.navigate(targetRoute) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
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
                BookingsScreen()
            }
            composable("account") {
                ProfileScreen(onUserUpdated = onUserUpdated, onLogout = onLogout)
            }
            composable(
                route = "payment_result/{success}/{code}",
                arguments = listOf(
                    navArgument("success") { type = NavType.StringType },
                    navArgument("code") { type = NavType.StringType },
                ),
            ) {
                PaymentResultScreen(
                    onGoHome = {
                        navController.navigate("home") {
                            popUpTo(navController.graph.findStartDestination().id) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    onViewBookings = {
                        navController.goToBookings()
                    },
                )
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
                    onCheckout = { courtId, date, time, hours ->
                        val encodedTime = Uri.encode(time)
                        val facilityId = entry.arguments?.getString("facilityId").orEmpty()
                        navController.navigate(
                            "checkout?facilityId=$facilityId&courtId=$courtId&date=$date&time=$encodedTime&hours=$hours",
                        )
                    },
                )
            }
            composable(
                route = "checkout?facilityId={facilityId}&courtId={courtId}&date={date}&time={time}&hours={hours}",
                arguments = listOf(
                    navArgument("facilityId") { type = NavType.StringType },
                    navArgument("courtId") { type = NavType.StringType },
                    navArgument("date") { type = NavType.StringType },
                    navArgument("time") { type = NavType.StringType },
                    navArgument("hours") { type = NavType.IntType },
                ),
            ) {
                CheckoutScreen(
                    onBack = { navController.popBackStack() },
                    onPaymentStarted = {
                        navController.goToBookings()
                        scope.launch { snackbarHostState.showSnackbar("Hoàn tất thanh toán trên VNPay trong 15 phút") }
                    },
                )
            }
        }
    }
}

private fun NavHostController.goToBookings() {
    navigate("bookings") {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
    }
}

private fun NavHostController.isResumed(): Boolean =
    currentBackStackEntry?.lifecycle?.currentState == Lifecycle.State.RESUMED

private fun NavHostController.navigateOnce(route: String) {
    if (isResumed()) navigate(route)
}

private fun NavHostController.popOnce() {
    if (isResumed()) popBackStack()
}