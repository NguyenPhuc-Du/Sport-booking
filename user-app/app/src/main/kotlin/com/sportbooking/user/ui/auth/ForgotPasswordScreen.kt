package com.sportbooking.user.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LockReset
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.spacing
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class RecoveryChannel {
    EMAIL,
    PHONE,
}

/**
 * Màn hình Quên mật khẩu: gửi mã OTP đặt lại mật khẩu tới email đã đăng ký.
 */
@Composable
fun ForgotPasswordScreen(
    onNavigateToOtp: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var recoveryChannel by rememberSaveable { mutableStateOf(RecoveryChannel.EMAIL) }
    var contactValue by rememberSaveable { mutableStateOf("") }
    var localError by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(viewModel) {
        viewModel.sent.collect(onNavigateToOtp)
    }

    ForgotPasswordContent(
        recoveryChannel = recoveryChannel,
        onChannelSelected = { channel ->
            recoveryChannel = channel
            contactValue = ""
            localError = null
            viewModel.clearError()
        },
        contactValue = contactValue,
        onContactChange = {
            contactValue = it
            localError = null
            viewModel.clearError()
        },
        isSending = state.sending,
        error = localError ?: state.error,
        onSubmit = {
            if (recoveryChannel == RecoveryChannel.PHONE) {
                localError = "Hiện chỉ hỗ trợ khôi phục qua email"
            } else {
                viewModel.submit(contactValue)
            }
        },
        onBack = onBack,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordContent(
    recoveryChannel: RecoveryChannel,
    onChannelSelected: (RecoveryChannel) -> Unit,
    contactValue: String,
    onContactChange: (String) -> Unit,
    isSending: Boolean,
    error: String?,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier.fillMaxSize(),
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

            // Badge biểu tượng khôi phục mật khẩu
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
                    imageVector = Icons.Rounded.LockReset,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(40.dp),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Tiêu đề
            Text(
                text = stringResource(R.string.forgot_password_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.small))

            // Hướng dẫn
            Text(
                text = stringResource(R.string.forgot_password_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Lựa chọn phương thức khôi phục (Email hoặc SĐT)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
            ) {
                FilterChip(
                    selected = recoveryChannel == RecoveryChannel.EMAIL,
                    onClick = { onChannelSelected(RecoveryChannel.EMAIL) },
                    label = { Text(stringResource(R.string.forgot_password_method_email)) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Rounded.Email,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.padding(end = 8.dp),
                )

                FilterChip(
                    selected = recoveryChannel == RecoveryChannel.PHONE,
                    onClick = { onChannelSelected(RecoveryChannel.PHONE) },
                    label = { Text(stringResource(R.string.forgot_password_method_phone)) },
                    leadingIcon = {
                        Icon(
                            imageVector = Icons.Rounded.Phone,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                        selectedLeadingIconColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ),
                    shape = RoundedCornerShape(20.dp),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.large))

            // Ô nhập Email / SĐT
            val isEmail = recoveryChannel == RecoveryChannel.EMAIL
            OutlinedTextField(
                value = contactValue,
                onValueChange = onContactChange,
                label = {
                    Text(
                        if (isEmail) "Địa chỉ Email" else "Số điện thoại",
                    )
                },
                placeholder = {
                    Text(
                        if (isEmail) "athlete@sportzone.vn" else "0987 654 321",
                    )
                },
                leadingIcon = {
                    Icon(
                        imageVector = if (isEmail) Icons.Rounded.Email else Icons.Rounded.Phone,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                },
                trailingIcon = {
                    if (contactValue.isNotEmpty()) {
                        IconButton(onClick = { onContactChange("") }) {
                            Icon(
                                imageVector = Icons.Rounded.Clear,
                                contentDescription = "Xóa nội dung",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = if (isEmail) KeyboardType.Email else KeyboardType.Phone,
                ),
                shape = MaterialTheme.shapes.medium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            // Báo lỗi nếu có
            AnimatedVisibility(
                visible = error != null,
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
                ErrorText(
                    message = error,
                    modifier = Modifier.padding(top = MaterialTheme.spacing.small),
                )
            }

            Spacer(Modifier.height(MaterialTheme.spacing.normal))

            // Hộp gợi ý thông tin bảo mật
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(MaterialTheme.spacing.normal),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Info,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.size(MaterialTheme.spacing.small))
                    Text(
                        text = stringResource(R.string.forgot_password_note),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.height(MaterialTheme.spacing.extraLarge))

            // Nút gửi mã OTP xác thực
            PrimaryButton(
                text = if (isSending) {
                    stringResource(R.string.forgot_password_sending)
                } else {
                    stringResource(R.string.forgot_password_btn_send)
                },
                loading = isSending,
                onClick = onSubmit,
            )

            Spacer(Modifier.height(MaterialTheme.spacing.normal))

            // Nút quay lại màn hình đăng nhập
            TextButton(
                onClick = onBack,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = stringResource(R.string.forgot_password_back_login),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
private fun ForgotPasswordEmailPreview() {
    SportBookingTheme {
        Surface {
            ForgotPasswordContent(
                recoveryChannel = RecoveryChannel.EMAIL,
                onChannelSelected = {},
                contactValue = "athlete@sportzone.vn",
                onContactChange = {},
                isSending = false,
                error = null,
                onSubmit = {},
                onBack = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun ForgotPasswordPhonePreview() {
    SportBookingTheme {
        Surface {
            ForgotPasswordContent(
                recoveryChannel = RecoveryChannel.PHONE,
                onChannelSelected = {},
                contactValue = "0987 654 321",
                onContactChange = {},
                isSending = false,
                error = null,
                onSubmit = {},
                onBack = {},
            )
        }
    }
}
