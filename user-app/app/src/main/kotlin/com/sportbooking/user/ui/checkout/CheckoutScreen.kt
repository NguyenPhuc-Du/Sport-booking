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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ConfirmationNumber
import androidx.compose.material.icons.rounded.LocalDrink
import androidx.compose.material.icons.rounded.Payments
import androidx.compose.material.icons.rounded.QrCode
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material.icons.rounded.Remove
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import com.sportbooking.domain.model.Drink
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
    data class ChangeDrinkQty(val id: String, val qty: Int) : CheckoutUiEvent
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
    val context = LocalContext.current

    LaunchedEffect(viewModel) {
        viewModel.paymentUrl.collect { url ->
            CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
                .launchUrl(context, Uri.parse(url))
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
                is CheckoutUiEvent.ChangeDrinkQty -> viewModel.onDrinkQty(event.id, event.qty)
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
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0, 0, 0, 0),
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
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
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
                        .navigationBarsPadding()
                        .padding(horizontal = MaterialTheme.spacing.normal)
                        .padding(top = MaterialTheme.spacing.small, bottom = MaterialTheme.spacing.medium),
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

                    if (state.drinks.isNotEmpty()) {
                        item(key = "checkout_drinks") {
                            Card(
                                shape = MaterialTheme.shapes.large,
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = MaterialTheme.spacing.normal),
                            ) {
                                Column(
                                    modifier = Modifier.padding(MaterialTheme.spacing.normal),
                                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(
                                            text = stringResource(R.string.checkout_drinks_section),
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        Text(
                                            text = stringResource(R.string.checkout_drinks_hint),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    state.drinks.forEachIndexed { index, drink ->
                                        if (index > 0) {
                                            HorizontalDivider(
                                                color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.45f),
                                            )
                                        }
                                        DrinkRow(
                                            drink = drink,
                                            qty = state.drinkQty[drink.id] ?: 0,
                                            onQtyChange = { qty ->
                                                onEvent(CheckoutUiEvent.ChangeDrinkQty(drink.id, qty))
                                            },
                                        )
                                    }
                                }
                            }
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
private fun DrinkRow(
    drink: Drink,
    qty: Int,
    onQtyChange: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(MaterialTheme.shapes.small)
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) {
            if (drink.image.isNotBlank()) {
                AsyncImage(
                    model = drink.image,
                    contentDescription = drink.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Icon(
                    imageVector = Icons.Rounded.LocalDrink,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = drink.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = stringResource(R.string.checkout_drink_stock, drink.stock),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        Column(
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = drink.price.toVnd(),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                shape = PillShape,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    QtyButton(
                        icon = Icons.Rounded.Remove,
                        enabled = qty > 0,
                        onClick = { onQtyChange(qty - 1) },
                    )
                    Text(
                        text = qty.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.width(28.dp),
                    )
                    QtyButton(
                        icon = Icons.Rounded.Add,
                        enabled = qty < drink.stock,
                        onClick = { onQtyChange(qty + 1) },
                    )
                }
            }
        }
    }
}

@Composable
private fun QtyButton(
    icon: ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(CircleShape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (enabled) {
                MaterialTheme.colorScheme.onSurface
            } else {
                MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)
            },
            modifier = Modifier.size(16.dp),
        )
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
                    drinks = PreviewData.drinks,
                    drinkQty = mapOf("d1" to 2),
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
