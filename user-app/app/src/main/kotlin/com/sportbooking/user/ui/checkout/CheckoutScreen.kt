package com.sportbooking.user.ui.checkout

import androidx.compose.animation.animateColorAsState
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ConfirmationNumber
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.PhoneAndroid
import androidx.compose.material.icons.rounded.QrCode
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Voucher
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.BookingSummaryCard
import com.sportbooking.user.ui.components.ErrorState
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.toVnd

sealed interface CheckoutUiEvent {
    data class SelectPayment(val methodId: String) : CheckoutUiEvent
    data class ChangeVoucher(val code: String) : CheckoutUiEvent
    data class ApplyVoucher(val code: String?) : CheckoutUiEvent
    data object Confirm : CheckoutUiEvent
}

@Composable
fun CheckoutScreen(
    onBack: () -> Unit,
    onPaymentStarted: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CheckoutViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(viewModel) {
        viewModel.paymentUrl.collect { url ->
            uriHandler.openUri(url)
            onPaymentStarted()
        }
    }

    CheckoutContent(
        state = state,
        onBack = onBack,
        onEvent = { event ->
            when (event) {
                is CheckoutUiEvent.SelectPayment -> viewModel.onPaymentSelected(event.methodId)
                is CheckoutUiEvent.ChangeVoucher -> viewModel.onVoucherChange(event.code)
                is CheckoutUiEvent.ApplyVoucher -> viewModel.applyVoucher(event.code)
                CheckoutUiEvent.Confirm -> viewModel.confirm()
            }
        },
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutContent(
    state: CheckoutUiState,
    onBack: () -> Unit,
    onEvent: (CheckoutUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    val quote = state.quote

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.checkout_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = stringResource(R.string.btn_back),
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        bottomBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp,
                shadowElevation = 8.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(MaterialTheme.spacing.normal),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                ) {
                    if (quote != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = stringResource(R.string.checkout_total),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                text = quote.amount.toVnd(),
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }

                    PrimaryButton(
                        text = if (state.submitting) stringResource(R.string.checkout_btn_paying)
                        else stringResource(R.string.checkout_btn_pay, quote?.amount?.toVnd().orEmpty()),
                        loading = state.submitting,
                        enabled = quote != null && !state.submitting,
                        onClick = { onEvent(CheckoutUiEvent.Confirm) },
                    )
                }
            }
        },
        modifier = modifier,
    ) { padding ->
        when {
            state.loading && quote == null -> {
                LoadingScreen(modifier = Modifier.padding(padding))
            }

            quote != null -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentPadding = PaddingValues(
                        start = MaterialTheme.spacing.none,
                        end = MaterialTheme.spacing.none,
                        top = MaterialTheme.spacing.normal,
                        bottom = MaterialTheme.spacing.extraLarge,
                    ),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                ) {
                    // Booking Summary Card
                    item(key = "checkout_quote") {
                        Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                            BookingSummaryCard(quote = quote)
                        }
                    }

                    // Vouchers Section
                    item(key = "checkout_vouchers") {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                        ) {
                            Text(
                                text = stringResource(R.string.checkout_voucher_section),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                            )

                            if (state.vouchers.isNotEmpty()) {
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = MaterialTheme.spacing.normal),
                                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                                ) {
                                    items(state.vouchers, key = { it.code }) { voucher ->
                                        VoucherChip(
                                            voucher = voucher,
                                            selected = state.appliedVoucher == voucher.code,
                                            onClick = {
                                                if (state.appliedVoucher == voucher.code) {
                                                    onEvent(CheckoutUiEvent.ApplyVoucher(null))
                                                } else {
                                                    onEvent(CheckoutUiEvent.ApplyVoucher(voucher.code))
                                                }
                                            },
                                        )
                                    }
                                }
                            }

                            Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                                OutlinedTextField(
                                    value = state.voucherInput,
                                    onValueChange = { onEvent(CheckoutUiEvent.ChangeVoucher(it)) },
                                    placeholder = { Text(stringResource(R.string.checkout_voucher_hint)) },
                                    shape = MaterialTheme.shapes.medium,
                                    singleLine = true,
                                    trailingIcon = {
                                        TextButton(
                                            onClick = { onEvent(CheckoutUiEvent.ApplyVoucher(state.voucherInput)) },
                                            enabled = state.voucherInput.isNotBlank(),
                                        ) {
                                            Text(stringResource(R.string.btn_apply))
                                        }
                                    },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                                        unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                                    ),
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            }
                        }
                    }

                    // Payment Methods Section
                    item(key = "checkout_payments") {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = MaterialTheme.spacing.normal),
                            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                        ) {
                            Text(
                                text = stringResource(R.string.checkout_payment_section),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )

                            state.payments.forEach { method ->
                                PaymentMethodTile(
                                    method = method,
                                    selected = state.paymentMethod == method.id,
                                    onClick = { onEvent(CheckoutUiEvent.SelectPayment(method.id)) },
                                )
                            }
                        }
                    }

                    if (state.error != null) {
                        item(key = "checkout_error") {
                            Box(modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal)) {
                                ErrorText(message = state.error)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VoucherChip(
    voucher: Voucher,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.surface,
        label = "VoucherContainer",
    )
    val contentColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onSurface,
        label = "VoucherContent",
    )
    val borderColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.outlineVariant,
        label = "VoucherBorder",
    )

    Surface(
        color = containerColor,
        contentColor = contentColor,
        shape = PillShape,
        border = BorderStroke(1.dp, borderColor),
        modifier = modifier
            .clip(PillShape)
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Icon(
                imageVector = Icons.Rounded.ConfirmationNumber,
                contentDescription = null,
                tint = if (selected) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp),
            )
            Text(
                text = voucher.code,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun PaymentMethodTile(
    method: PaymentMethod,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val containerColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f) else MaterialTheme.colorScheme.surface,
        label = "PaymentContainer",
    )
    val borderColor by animateColorAsState(
        targetValue = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
        label = "PaymentBorder",
    )

    val icon: ImageVector = when (method.id.lowercase()) {
        "momo" -> Icons.Rounded.PhoneAndroid
        "vnpay" -> Icons.Rounded.QrCode
        else -> Icons.Rounded.Payments
    }

    Card(
        onClick = onClick,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = BorderStroke(if (selected) 2.dp else 1.dp, borderColor),
        elevation = CardDefaults.cardElevation(defaultElevation = if (selected) 2.dp else 0.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(MaterialTheme.spacing.medium),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(22.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = method.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = method.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Icon(
                imageVector = if (selected) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

// -------------------------------------------------------------
// Previews
// -------------------------------------------------------------

@PreviewLightDark
@PreviewFontScale
@Composable
private fun CheckoutContentSuccessPreview() {
    SportBookingTheme {
        Surface {
            CheckoutContent(
                state = CheckoutUiState(
                    loading = false,
                    quote = PreviewData.bookingQuote,
                    payments = PreviewData.paymentMethods,
                    vouchers = PreviewData.vouchers,
                    paymentMethod = "vnpay",
                    appliedVoucher = "SPORT30K",
                ),
                onBack = {},
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun CheckoutContentLoadingPreview() {
    SportBookingTheme {
        Surface {
            CheckoutContent(
                state = CheckoutUiState(loading = true),
                onBack = {},
                onEvent = {},
            )
        }
    }
}
