package com.sportbooking.user.ui.bookings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.EventNote
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.Booking
import com.sportbooking.domain.model.BookingCounts
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.ConfirmBottomSheet
import com.sportbooking.user.ui.components.EmptyState
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.SecondaryButton
import com.sportbooking.user.ui.components.StatusBadge
import com.sportbooking.user.ui.components.VenueCardShimmer
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.toVnd

sealed interface BookingsUiEvent {
    data class SelectFilter(val filterId: String) : BookingsUiEvent
    data object Refresh : BookingsUiEvent
    data class CancelBooking(val code: String) : BookingsUiEvent
}

@Composable
fun BookingsScreen(
    onBalanceChanged: (Long) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BookingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(viewModel) {
        viewModel.balance.collect(onBalanceChanged)
    }

    DisposableEffect(lifecycleOwner, viewModel) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    BookingsContent(
        state = state,
        onEvent = { event ->
            when (event) {
                is BookingsUiEvent.SelectFilter -> viewModel.onFilterSelected(event.filterId)
                BookingsUiEvent.Refresh -> viewModel.refresh()
                is BookingsUiEvent.CancelBooking -> viewModel.cancel(event.code)
            }
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingsContent(
    state: BookingsUiState,
    onEvent: (BookingsUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    var pendingCancelBooking by remember { mutableStateOf<Booking?>(null) }
    val isRefreshing = state.loading && state.bookings.isNotEmpty()

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = { onEvent(BookingsUiEvent.Refresh) },
        modifier = modifier.fillMaxSize(),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Text(
                text = stringResource(R.string.bookings_title),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier
                    .padding(horizontal = MaterialTheme.spacing.normal)
                    .padding(top = MaterialTheme.spacing.normal, bottom = MaterialTheme.spacing.small),
            )

            // Filter Tabs
            val filters = listOf(
                "all" to stringResource(R.string.bookings_tab_all, state.counts.all),
                "upcoming" to stringResource(R.string.bookings_tab_upcoming, state.counts.upcoming),
                "completed" to stringResource(R.string.bookings_tab_completed, state.counts.completed),
                "cancelled" to stringResource(R.string.bookings_tab_cancelled, state.counts.cancelled),
            )

            LazyRow(
                contentPadding = PaddingValues(horizontal = MaterialTheme.spacing.normal),
                horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                modifier = Modifier.padding(bottom = MaterialTheme.spacing.normal),
            ) {
                items(filters, key = { it.first }) { (id, label) ->
                    val selected = state.filter == id
                    Surface(
                        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
                        contentColor = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                        shape = PillShape,
                        border = BorderStroke(
                            1.dp,
                            if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                        ),
                        modifier = Modifier
                            .clip(PillShape)
                            .clickable { onEvent(BookingsUiEvent.SelectFilter(id)) },
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
            }

            // Bookings List / States
            when {
                state.loading && state.bookings.isEmpty() -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = MaterialTheme.spacing.normal),
                        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                    ) {
                        VenueCardShimmer()
                        VenueCardShimmer()
                    }
                }

                state.bookings.isEmpty() -> {
                    EmptyState(
                        title = stringResource(R.string.bookings_empty_title),
                        message = stringResource(R.string.bookings_empty_desc),
                        icon = Icons.AutoMirrored.Rounded.EventNote,
                        modifier = Modifier.fillMaxSize(),
                    )
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(
                            start = MaterialTheme.spacing.normal,
                            end = MaterialTheme.spacing.normal,
                            top = MaterialTheme.spacing.none,
                            bottom = MaterialTheme.spacing.extraLarge,
                        ),
                        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(state.bookings, key = { it.code }) { booking ->
                            BookingTicketCard(
                                booking = booking,
                                cancelling = state.workingCode == booking.code,
                                onCancelClick = { pendingCancelBooking = booking },
                            )
                        }

                        if (state.error != null) {
                            item(key = "bookings_error") {
                                ErrorText(message = state.error)
                            }
                        }
                    }
                }
            }
        }
    }

    pendingCancelBooking?.let { bookingToCancel ->
        ConfirmBottomSheet(
            title = stringResource(R.string.bookings_cancel_dialog_title),
            message = stringResource(R.string.bookings_cancel_dialog_desc),
            confirmLabel = stringResource(R.string.bookings_cancel_btn),
            isDestructive = true,
            onConfirm = {
                onEvent(BookingsUiEvent.CancelBooking(bookingToCancel.code))
                pendingCancelBooking = null
            },
            onDismiss = { pendingCancelBooking = null },
        )
    }
}

@Composable
fun BookingTicketCard(
    booking: Booking,
    cancelling: Boolean,
    onCancelClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.normal),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            // Header Row: Code & Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                ) {
                    Text(
                        text = "Mã: ${booking.code}",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
                StatusBadge(status = booking.status, label = booking.statusLabel)
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Details
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = booking.facilityName,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = booking.courtName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                    modifier = Modifier.padding(top = 4.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.CalendarMonth,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = "${booking.date} · ${booking.time}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Footer: Amount & Action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(
                        text = "Tổng thanh toán",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = booking.amount.toVnd(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }

                if (booking.status == "upcoming") {
                    SecondaryButton(
                        text = if (cancelling) stringResource(R.string.bookings_cancelling_btn) else stringResource(R.string.bookings_cancel_btn),
                        onClick = onCancelClick,
                        enabled = !cancelling,
                        modifier = Modifier.size(width = 130.dp, height = 40.dp),
                    )
                }
            }
        }
    }
}

// -------------------------------------------------------------
// Previews
// -------------------------------------------------------------

@PreviewLightDark
@PreviewFontScale
@Composable
private fun BookingsContentSuccessPreview() {
    SportBookingTheme {
        Surface {
            BookingsContent(
                state = BookingsUiState(
                    loading = false,
                    filter = "upcoming",
                    counts = PreviewData.bookingCounts,
                    bookings = PreviewData.bookings,
                ),
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun BookingsContentEmptyPreview() {
    SportBookingTheme {
        Surface {
            BookingsContent(
                state = BookingsUiState(
                    loading = false,
                    filter = "cancelled",
                    counts = PreviewData.bookingCounts,
                    bookings = emptyList(),
                ),
                onEvent = {},
            )
        }
    }
}
