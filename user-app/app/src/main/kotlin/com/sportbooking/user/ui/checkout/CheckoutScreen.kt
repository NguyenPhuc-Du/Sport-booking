package com.sportbooking.user.ui.checkout

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
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
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.sportbooking.domain.model.Drink
import com.sportbooking.domain.model.PaymentMethod
import com.sportbooking.domain.model.Voucher
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.BookingSummaryCard
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
    data class ChangeDrinkQty(val id: String, val qty: Int) : CheckoutUiEvent
    data object OpenVoucherSheet : CheckoutUiEvent
    data object DismissVoucherSheet : CheckoutUiEvent
    data class ChangeVoucherInput(val code: String) : CheckoutUiEvent
    data class ToggleSheetVoucher(val voucher: Voucher) : CheckoutUiEvent
    data object ApplyTypedVoucher : CheckoutUiEvent
    data object ConfirmVoucherSheet : CheckoutUiEvent
    data object ClearAllVouchers : CheckoutUiEvent
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
                is CheckoutUiEvent.ChangeDrinkQty -> viewModel.onDrinkQty(event.id, event.qty)
                CheckoutUiEvent.OpenVoucherSheet -> viewModel.openVoucherSheet()
                CheckoutUiEvent.DismissVoucherSheet -> viewModel.dismissVoucherSheet()
                is CheckoutUiEvent.ChangeVoucherInput -> viewModel.onVoucherInputChange(event.code)
                is CheckoutUiEvent.ToggleSheetVoucher -> viewModel.toggleSheetVoucher(event.voucher)
                CheckoutUiEvent.ApplyTypedVoucher -> viewModel.applyTypedVoucherToSheet()
                CheckoutUiEvent.ConfirmVoucherSheet -> viewModel.confirmVoucherSheet()
                CheckoutUiEvent.ClearAllVouchers -> viewModel.clearAllVouchers()
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

                    item(key = "checkout_vouchers") {
                        VoucherEntryRow(
                            selectedCount = state.selectedCodes.size,
                            discount = quote.discount,
                            onClick = { onEvent(CheckoutUiEvent.OpenVoucherSheet) },
                            modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                        )
                    }

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

                    if (state.error != null && !state.voucherSheetOpen) {
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

    if (state.voucherSheetOpen) {
        VoucherPickerSheet(
            vouchers = state.vouchers,
            selection = state.sheetSelection,
            voucherInput = state.voucherInput,
            error = state.error,
            onDismiss = { onEvent(CheckoutUiEvent.DismissVoucherSheet) },
            onInputChange = { onEvent(CheckoutUiEvent.ChangeVoucherInput(it)) },
            onApplyTyped = { onEvent(CheckoutUiEvent.ApplyTypedVoucher) },
            onToggle = { onEvent(CheckoutUiEvent.ToggleSheetVoucher(it)) },
            onClear = { onEvent(CheckoutUiEvent.ClearAllVouchers) },
            onConfirm = { onEvent(CheckoutUiEvent.ConfirmVoucherSheet) },
        )
    }
}

@Composable
private fun VoucherEntryRow(
    selectedCount: Int,
    discount: Long,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val accent = MaterialTheme.colorScheme.tertiary
    Card(
        onClick = onClick,
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = MaterialTheme.spacing.normal, vertical = MaterialTheme.spacing.medium),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(accent.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.ConfirmationNumber,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(22.dp),
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.checkout_voucher_section),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = when {
                        selectedCount > 0 && discount > 0 ->
                            stringResource(R.string.checkout_voucher_selected_count, selectedCount) +
                                " · -${discount.toVnd()}"
                        selectedCount > 0 ->
                            stringResource(R.string.checkout_voucher_selected_count, selectedCount)
                        else -> stringResource(R.string.checkout_voucher_select)
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (selectedCount > 0) accent else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (selectedCount > 0) FontWeight.SemiBold else FontWeight.Normal,
                )
            }

            Icon(
                imageVector = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VoucherPickerSheet(
    vouchers: List<Voucher>,
    selection: Map<String, String>,
    voucherInput: String,
    error: String?,
    onDismiss: () -> Unit,
    onInputChange: (String) -> Unit,
    onApplyTyped: () -> Unit,
    onToggle: (Voucher) -> Unit,
    onClear: () -> Unit,
    onConfirm: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scopes = listOf(
        "court" to R.string.checkout_voucher_scope_court,
        "drink" to R.string.checkout_voucher_scope_drink,
        "order" to R.string.checkout_voucher_scope_order,
    )

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = MaterialTheme.shapes.extraLarge,
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .heightIn(max = 640.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = MaterialTheme.spacing.normal),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.checkout_voucher_sheet_title),
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                )
                if (selection.isNotEmpty()) {
                    TextButton(onClick = onClear) {
                        Text(stringResource(R.string.checkout_voucher_clear))
                    }
                }
            }

            Text(
                text = stringResource(R.string.checkout_voucher_scope_hint),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(
                    horizontal = MaterialTheme.spacing.normal,
                    vertical = MaterialTheme.spacing.extraSmall,
                ),
            )

            OutlinedTextField(
                value = voucherInput,
                onValueChange = onInputChange,
                placeholder = { Text(stringResource(R.string.checkout_voucher_hint)) },
                shape = MaterialTheme.shapes.medium,
                singleLine = true,
                trailingIcon = {
                    TextButton(
                        onClick = onApplyTyped,
                        enabled = voucherInput.isNotBlank(),
                    ) {
                        Text(stringResource(R.string.btn_apply))
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.tertiary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = MaterialTheme.spacing.normal),
            )

            if (error != null) {
                Text(
                    text = error,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(
                        horizontal = MaterialTheme.spacing.normal,
                        vertical = MaterialTheme.spacing.small,
                    ),
                )
            }

            Spacer(modifier = Modifier.height(MaterialTheme.spacing.small))

            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = MaterialTheme.spacing.normal),
                verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
            ) {
                scopes.forEach { (scope, titleRes) ->
                    val scoped = vouchers.filter { (it.applyScope.ifBlank { "court" }) == scope }
                    if (scoped.isEmpty() && vouchers.isNotEmpty()) return@forEach

                    Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small)) {
                        Text(
                            text = stringResource(titleRes),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        if (scoped.isEmpty()) {
                            Text(
                                text = stringResource(R.string.checkout_voucher_empty_section),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            scoped.forEach { voucher ->
                                VoucherTicketCard(
                                    voucher = voucher,
                                    selected = selection[scope] == voucher.code,
                                    onClick = { onToggle(voucher) },
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(MaterialTheme.spacing.small))
            }

            PrimaryButton(
                text = stringResource(R.string.checkout_voucher_confirm),
                onClick = onConfirm,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(MaterialTheme.spacing.normal),
            )
        }
    }
}

@Composable
private fun VoucherTicketCard(
    voucher: Voucher,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val accent = MaterialTheme.colorScheme.tertiary
    val borderColor by animateColorAsState(
        targetValue = if (selected) accent else MaterialTheme.colorScheme.outlineVariant,
        label = "VoucherTicketBorder",
    )
    val dashColor = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) accent.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface,
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, borderColor),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(96.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(88.dp)
                    .fillMaxHeight()
                    .background(if (selected) accent.copy(alpha = 0.18f) else accent.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = voucher.valueText.ifBlank {
                        if (voucher.discountType == "percent") {
                            "${voucher.discountValue}%"
                        } else {
                            voucher.discountValue.toVnd()
                        }
                    },
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = accent,
                    textAlign = TextAlign.Center,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }

            Box(
                modifier = Modifier
                    .width(1.dp)
                    .fillMaxHeight()
                    .drawBehind {
                        drawLine(
                            color = dashColor,
                            start = Offset(0f, 0f),
                            end = Offset(0f, size.height),
                            strokeWidth = 2.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f),
                        )
                    },
            )

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = MaterialTheme.spacing.medium, vertical = MaterialTheme.spacing.small),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = voucher.code,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = voucher.name.ifBlank { voucher.description },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (voucher.minOrderAmount > 0) {
                        Text(
                            text = stringResource(
                                R.string.checkout_voucher_min_order,
                                voucher.minOrderAmount.toVnd(),
                            ),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    if (voucher.remaining > 0) {
                        Text(
                            text = stringResource(R.string.checkout_voucher_remaining, voucher.remaining),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            Icon(
                imageVector = if (selected) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (selected) accent else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier
                    .padding(end = MaterialTheme.spacing.medium)
                    .size(22.dp),
            )
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
                    selectedByScope = mapOf("court" to "SPORT30K"),
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
