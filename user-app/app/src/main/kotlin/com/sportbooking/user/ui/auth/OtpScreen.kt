package com.sportbooking.user.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.LockReset
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.domain.model.User

private const val OTP_LENGTH = 6
private const val COUNTDOWN_INITIAL_SECONDS = 60

/**
 * Màn hình nhập mã xác thực OTP 6 số sau khi người dùng bấm Đăng ký.
 * Bàn phím số chuyên dụng (KeyboardType.Number) với 6 ô số tự động nhận diện.
 */
@Composable
fun OtpScreen(
    onBack: () -> Unit,
    onRegistered: (User) -> Unit,
    onResetCodeEntered: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: OtpViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var secondsRemaining by rememberSaveable { mutableIntStateOf(COUNTDOWN_INITIAL_SECONDS) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(secondsRemaining) {
        if (secondsRemaining > 0) {
            delay(1000L)
            secondsRemaining -= 1
        }
    }
    LaunchedEffect(viewModel) { viewModel.registered.collect(onRegistered) }
    LaunchedEffect(viewModel) { viewModel.resetCode.collect(onResetCodeEntered) }
    LaunchedEffect(state.info) {
        state.info?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.consumeInfo()
        }
    }

    OtpContent(
        target = viewModel.email,
        otpValue = state.code,
        onOtpChange = viewModel::onCodeChange,
        secondsRemaining = secondsRemaining,
        isVerifying = state.verifying,
        errorMessage = state.error,
        snackbarHostState = snackbarHostState,
        onResend = {
            secondsRemaining = COUNTDOWN_INITIAL_SECONDS
            viewModel.resend()
        },
        onSubmit = viewModel::submit,
        onBack = onBack,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OtpContent(
    target: String,
    otpValue: String,
    onOtpChange: (String) -> Unit,
    secondsRemaining: Int,
    isVerifying: Boolean,
    errorMessage: String?,
    snackbarHostState: SnackbarHostState,
    onResend: () -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    // Tự động bật bàn phím số khi vào màn hình
    LaunchedEffect(Unit) {
        delay(200L)
        focusRequester.requestFocus()
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = stringResource(R.string.btn_back),
                            tint = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent,
                ),
            )
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = MaterialTheme.spacing.extraLarge)
                .padding(bottom = MaterialTheme.spacing.large),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(MaterialTheme.spacing.small))

            // Icon biểu trưng bảo mật OTP
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                MaterialTheme.colorScheme.primary,
                                MaterialTheme.colorScheme.secondary,
                            ),
                        ),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Security,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(40.dp),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Tiêu đề
            Text(
                text = stringResource(R.string.otp_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.small))

            // Mô tả gửi đến số / email nào
            Text(
                text = stringResource(R.string.otp_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.extraSmall))

            // Chip hiển thị SĐT hoặc email nhận OTP
            AssistChip(
                onClick = onBack,
                label = {
                    Text(
                        text = target,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                },
                trailingIcon = {
                    Icon(
                        imageVector = Icons.Rounded.Edit,
                        contentDescription = stringResource(R.string.otp_change_info),
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary,
                    )
                },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                ),
                border = null,
                shape = RoundedCornerShape(16.dp),
            )

            Spacer(Modifier.height(MaterialTheme.spacing.huge))

            // Bàn phím số + 6 ô nhập mã OTP
            OtpSixDigitsInput(
                otpValue = otpValue,
                onOtpChange = onOtpChange,
                focusRequester = focusRequester,
                onDone = {
                    focusManager.clearFocus()
                    if (otpValue.length == OTP_LENGTH) {
                        onSubmit()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )

            // Thông báo lỗi nếu có
            if (errorMessage != null) {
                Spacer(Modifier.height(MaterialTheme.spacing.small))
                ErrorText(
                    message = errorMessage,
                    modifier = Modifier.padding(top = MaterialTheme.spacing.extraSmall),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Bộ đếm gửi lại mã
            ResendOtpSection(
                secondsRemaining = secondsRemaining,
                onResend = onResend,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.extraLarge))

            // Nút Xác nhận chính
            PrimaryButton(
                text = if (isVerifying) {
                    stringResource(R.string.otp_btn_verifying)
                } else {
                    stringResource(R.string.otp_btn_confirm)
                },
                loading = isVerifying,
                enabled = otpValue.length == OTP_LENGTH && !isVerifying,
                onClick = {
                    focusManager.clearFocus()
                    onSubmit()
                },
            )

            Spacer(Modifier.height(MaterialTheme.spacing.normal))

            // Nút quay lại đăng ký
            TextButton(
                onClick = onBack,
            ) {
                Text(
                    text = stringResource(R.string.otp_change_info),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

/**
 * 6 ô hiển thị số OTP được gắn kết với 1 BasicTextField sử dụng KeyboardType.Number
 */
@Composable
private fun OtpSixDigitsInput(
    otpValue: String,
    onOtpChange: (String) -> Unit,
    focusRequester: FocusRequester,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    BasicTextField(
        value = otpValue,
        onValueChange = { input ->
            // Chỉ chấp nhận ký tự số và tối đa 6 ký tự
            val digitsOnly = input.filter { it.isDigit() }.take(OTP_LENGTH)
            onOtpChange(digitsOnly)
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(
            onDone = { onDone() },
        ),
        modifier = modifier.focusRequester(focusRequester),
        decorationBox = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) {
                        focusRequester.requestFocus()
                    },
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                for (index in 0 until OTP_LENGTH) {
                    val digit = otpValue.getOrNull(index)?.toString().orEmpty()
                    val isFocused = otpValue.length == index

                    OtpDigitCell(
                        digit = digit,
                        isFocused = isFocused,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        },
    )
}

/**
 * Từng ô chữ số riêng lẻ với viền nổi bật khi focus và con trỏ nhấp nháy
 */
@Composable
private fun OtpDigitCell(
    digit: String,
    isFocused: Boolean,
    modifier: Modifier = Modifier,
) {
    // Hiệu ứng nhấp nháy cho con trỏ (cursor) khi ô đang được focus
    val infiniteTransition = rememberInfiniteTransition(label = "OtpCursor")
    val cursorAlpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = keyframes {
                durationMillis = 1000
                0f at 0
                0f at 499
                1f at 500
                1f at 999
            },
            repeatMode = RepeatMode.Restart,
        ),
        label = "cursorAlpha",
    )

    val borderColor by animateColorAsState(
        targetValue = when {
            isFocused -> MaterialTheme.colorScheme.primary
            digit.isNotEmpty() -> MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            else -> MaterialTheme.colorScheme.outlineVariant
        },
        label = "cellBorderColor",
    )

    val containerColor by animateColorAsState(
        targetValue = when {
            isFocused -> MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
            digit.isNotEmpty() -> MaterialTheme.colorScheme.surface
            else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
        },
        label = "cellContainerColor",
    )

    val borderWidth = if (isFocused) 2.dp else 1.dp

    Box(
        modifier = modifier
            .height(58.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(containerColor)
            .border(
                width = borderWidth,
                color = borderColor,
                shape = RoundedCornerShape(12.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        when {
            digit.isNotEmpty() -> {
                Text(
                    text = digit,
                    style = MaterialTheme.typography.headlineSmall,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                )
            }
            isFocused -> {
                // Con trỏ nhấp nháy thanh lịch
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(24.dp)
                        .background(
                            MaterialTheme.colorScheme.primary.copy(alpha = cursorAlpha),
                        ),
                )
            }
            else -> {
                // Dấu chấm mờ khi chưa nhập
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
                )
            }
        }
    }
}

/**
 * Khu vực đếm ngược và nút bấm gửi lại OTP
 */
@Composable
private fun ResendOtpSection(
    secondsRemaining: Int,
    onResend: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (secondsRemaining > 0) {
            Icon(
                imageVector = Icons.Rounded.Timer,
                contentDescription = null,
                modifier = Modifier
                    .size(16.dp)
                    .padding(end = 4.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = stringResource(R.string.otp_resend_countdown, secondsRemaining),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            TextButton(
                onClick = onResend,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Refresh,
                    contentDescription = null,
                    modifier = Modifier
                        .size(18.dp)
                        .padding(end = 6.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = stringResource(R.string.otp_resend_action),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
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
private fun OtpContentEmptyPreview() {
    SportBookingTheme {
        Surface {
            OtpContent(
                target = "0987 654 321",
                otpValue = "",
                onOtpChange = {},
                secondsRemaining = 45,
                isVerifying = false,
                errorMessage = null,
                snackbarHostState = remember { SnackbarHostState() },
                onResend = {},
                onSubmit = {},
                onBack = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun OtpContentFilledPreview() {
    SportBookingTheme {
        Surface {
            OtpContent(
                target = "athlete@sportzone.vn",
                otpValue = "123456",
                onOtpChange = {},
                secondsRemaining = 0,
                isVerifying = false,
                errorMessage = null,
                snackbarHostState = remember { SnackbarHostState() },
                onResend = {},
                onSubmit = {},
                onBack = {},
            )
        }
    }
}
