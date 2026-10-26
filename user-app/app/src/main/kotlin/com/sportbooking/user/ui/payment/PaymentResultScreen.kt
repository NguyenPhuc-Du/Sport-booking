package com.sportbooking.user.ui.payment

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.EventNote
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.SportsTennis
import androidx.compose.material.icons.rounded.SupportAgent
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Booking
import com.sportbooking.domain.usecase.GetBookingsUseCase
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.SecondaryButton
import com.sportbooking.user.ui.components.StatusBadge
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.toVnd
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class PaymentResultUiState(
    val loading: Boolean = true,
    val booking: Booking? = null,
)

@HiltViewModel
class PaymentResultViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val getBookings: GetBookingsUseCase,
) : ViewModel() {
    val success: Boolean = savedStateHandle.get<String>("success") == "success"
    val code: String = checkNotNull(savedStateHandle["code"])

    private val _state = MutableStateFlow(PaymentResultUiState())
    val state = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val booking = when (val result = getBookings("all")) {
                is DomainResult.Success -> result.data.bookings.find { it.code == code }
                is DomainResult.Failure -> null
            }
            _state.value = PaymentResultUiState(loading = false, booking = booking)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentResultScreen(
    onGoHome: () -> Unit,
    modifier: Modifier = Modifier,
    onViewBookings: (() -> Unit)? = null,
    viewModel: PaymentResultViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    BackHandler(onBack = onGoHome)

    Scaffold(
        contentWindowInsets = WindowInsets.navigationBars,
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0, 0, 0, 0),
                title = {
                    Text(
                        text = "Kết quả thanh toán",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onGoHome) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Về trang chủ",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
        },
        modifier = modifier,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = MaterialTheme.spacing.normal, vertical = MaterialTheme.spacing.medium),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            val isSuccess = viewModel.success
            val statusColor = if (isSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            val statusContainer = if (isSuccess) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.errorContainer

            Spacer(Modifier.height(MaterialTheme.spacing.small))

            // Animated Status Circle Badge
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .clip(CircleShape)
                    .background(statusContainer.copy(alpha = 0.6f)),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(statusContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = if (isSuccess) Icons.Rounded.CheckCircle else Icons.Rounded.ErrorOutline,
                        contentDescription = null,
                        tint = statusColor,
                        modifier = Modifier.size(46.dp),
                    )
                }
            }

            Spacer(Modifier.height(MaterialTheme.spacing.medium))

            // Headline & Message
            Text(
                text = if (isSuccess) "Thanh toán thành công!" else "Thanh toán thất bại",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.extraSmall))

            Text(
                text = if (isSuccess) {
                    "Đơn đặt sân của bạn đã được giữ chỗ và xác nhận thành công."
                } else {
                    "Giao dịch không thể hoàn tất hoặc bạn đã hủy thanh toán."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = MaterialTheme.spacing.medium),
            )

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Digital Receipt Ticket Card
            if (state.loading) {
                ReceiptLoadingCard()
            } else {
                ReceiptCard(
                    code = viewModel.code,
                    booking = state.booking,
                    isSuccess = isSuccess,
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Action Buttons
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
            ) {
                if (isSuccess && onViewBookings != null) {
                    PrimaryButton(
                        text = "Xem lịch đặt sân của tôi",
                        leadingIcon = Icons.AutoMirrored.Rounded.EventNote,
                        onClick = onViewBookings,
                    )
                    SecondaryButton(
                        text = "Về trang chủ",
                        leadingIcon = Icons.Rounded.Home,
                        onClick = onGoHome,
                    )
                } else {
                    PrimaryButton(
                        text = "Về trang chủ",
                        leadingIcon = Icons.Rounded.Home,
                        onClick = onGoHome,
                    )
                    if (onViewBookings != null) {
                        SecondaryButton(
                            text = "Kiểm tra lịch đặt",
                            leadingIcon = Icons.AutoMirrored.Rounded.EventNote,
                            onClick = onViewBookings,
                        )
                    }
                }
            }

            if (!isSuccess) {
                Spacer(Modifier.height(MaterialTheme.spacing.medium))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.SupportAgent,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = "Cần hỗ trợ giao dịch? Liên hệ hotline 1900 xxxx",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))
        }
    }
}

@Composable
private fun ReceiptCard(
    code: String,
    booking: Booking?,
    isSuccess: Boolean,
) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.normal),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            // Receipt Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Rounded.ReceiptLong,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                    Text(
                        text = "Biên lai thanh toán",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }

                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = PillShape,
                ) {
                    Text(
                        text = "#$code",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            // Big Price Display
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(MaterialTheme.shapes.medium)
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f))
                    .padding(vertical = 12.dp, horizontal = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "Tổng thanh toán",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = booking?.amount?.toVnd() ?: "—",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (isSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                )
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Details Rows
            Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small)) {
                ReceiptRow(
                    icon = Icons.Rounded.LocationOn,
                    label = "Cơ sở",
                    value = booking?.facilityName ?: "—",
                )
                ReceiptRow(
                    icon = Icons.Rounded.SportsTennis,
                    label = "Sân thi đấu",
                    value = booking?.courtName ?: "—",
                )
                ReceiptRow(
                    icon = Icons.Rounded.CalendarMonth,
                    label = "Thời gian",
                    value = if (booking != null) "${booking.date} · ${booking.time}" else "—",
                )
                ReceiptRow(
                    icon = Icons.Rounded.Payments,
                    label = "Cổng thanh toán",
                    value = "Cổng VNPay",
                )
                if (!booking?.drinks.isNullOrEmpty()) {
                    booking?.drinks?.forEach { drink ->
                        ReceiptRow(
                            icon = Icons.AutoMirrored.Rounded.ReceiptLong,
                            label = "${drink.name} x${drink.qty}",
                            value = (drink.price * drink.qty).toVnd(),
                        )
                    }
                }
            }

            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

            // Status Badge Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "Trạng thái đơn",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                StatusBadge(
                    status = booking?.status ?: if (isSuccess) "upcoming" else "cancelled",
                    label = booking?.statusLabel ?: if (isSuccess) "Đã thanh toán" else "Thất bại",
                )
            }
        }
    }
}

@Composable
private fun ReceiptRow(
    icon: ImageVector,
    label: String,
    value: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f),
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface,
            textAlign = TextAlign.End,
        )
    }
}

@Composable
private fun ReceiptLoadingCard() {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(32.dp),
                strokeWidth = 3.dp,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Đang đồng bộ thông tin giao dịch...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun PaymentResultScreenPreview() {
    SportBookingTheme {
        Surface {
            ReceiptCard(
                code = "BK-20261022-001",
                booking = PreviewData.booking,
                isSuccess = true,
            )
        }
    }
}
