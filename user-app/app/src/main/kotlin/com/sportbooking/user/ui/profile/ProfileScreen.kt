package com.sportbooking.user.ui.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Email
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.RateReview
import androidx.compose.material.icons.rounded.Save
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.sportbooking.domain.model.AppNotification
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.model.User
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.PrimaryButton
import com.sportbooking.user.ui.components.SecondaryButton
import com.sportbooking.user.ui.theme.PillShape
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import com.sportbooking.user.ui.util.toVnd

sealed interface ProfileUiEvent {
    data class ChangeFullName(val value: String) : ProfileUiEvent
    data class ChangePhone(val value: String) : ProfileUiEvent
    data class ChangeEmail(val value: String) : ProfileUiEvent
    data object Save : ProfileUiEvent
    data object PickAvatar : ProfileUiEvent
    data object Logout : ProfileUiEvent
}

@Composable
fun ProfileScreen(
    onUserUpdated: (User) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val pickAvatar = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) viewModel.uploadAvatar(uri)
    }

    LaunchedEffect(viewModel) {
        viewModel.updated.collect(onUserUpdated)
    }

    ProfileContent(
        state = state,
        onEvent = { event ->
            when (event) {
                is ProfileUiEvent.ChangeFullName -> viewModel.onFullNameChange(event.value)
                is ProfileUiEvent.ChangePhone -> viewModel.onPhoneChange(event.value)
                is ProfileUiEvent.ChangeEmail -> viewModel.onEmailChange(event.value)
                ProfileUiEvent.Save -> viewModel.save()
                ProfileUiEvent.PickAvatar -> pickAvatar.launch("image/*")
                ProfileUiEvent.Logout -> onLogout()
            }
        },
        modifier = modifier,
    )
}

@Composable
fun ProfileContent(
    state: ProfileUiState,
    onEvent: (ProfileUiEvent) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (state.loading) {
        LoadingScreen(modifier = modifier)
        return
    }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            horizontal = MaterialTheme.spacing.normal,
            vertical = MaterialTheme.spacing.normal,
        ),
        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.large),
    ) {
        // User Header Card
        item(key = "profile_header") {
            Card(
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(MaterialTheme.spacing.normal),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.normal),
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clickable(enabled = !state.uploadingAvatar) {
                                onEvent(ProfileUiEvent.PickAvatar)
                            },
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
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
                            if (state.uploadingAvatar) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(28.dp),
                                    strokeWidth = 2.dp,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            } else if (!state.avatarUrl.isNullOrBlank()) {
                                AsyncImage(
                                    model = state.avatarUrl,
                                    contentDescription = stringResource(R.string.profile_avatar),
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } else {
                                Text(
                                    text = state.fullName.take(1).uppercase().ifBlank { "U" },
                                    style = MaterialTheme.typography.headlineMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                )
                            }
                        }
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .size(22.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.CameraAlt,
                                contentDescription = stringResource(R.string.profile_change_avatar),
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(12.dp),
                            )
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = state.fullName.ifBlank { "Vận động viên" },
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = state.email,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        // Edit Profile Section
        item(key = "profile_form") {
            Card(
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier.padding(MaterialTheme.spacing.normal),
                    verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
                ) {
                    Text(
                        text = "Thông tin cá nhân",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )

                    OutlinedTextField(
                        value = state.fullName,
                        onValueChange = { onEvent(ProfileUiEvent.ChangeFullName(it)) },
                        label = { Text(stringResource(R.string.profile_full_name)) },
                        leadingIcon = { Icon(Icons.Rounded.Person, contentDescription = null) },
                        shape = MaterialTheme.shapes.medium,
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        value = state.phone,
                        onValueChange = { onEvent(ProfileUiEvent.ChangePhone(it)) },
                        label = { Text(stringResource(R.string.profile_phone)) },
                        leadingIcon = { Icon(Icons.Rounded.Phone, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        shape = MaterialTheme.shapes.medium,
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        value = state.email,
                        onValueChange = { onEvent(ProfileUiEvent.ChangeEmail(it)) },
                        label = { Text(stringResource(R.string.profile_email)) },
                        leadingIcon = { Icon(Icons.Rounded.Email, contentDescription = null) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        shape = MaterialTheme.shapes.medium,
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    AnimatedVisibility(
                        visible = state.message != null,
                        enter = fadeIn(),
                        exit = fadeOut(),
                    ) {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                            shape = MaterialTheme.shapes.small,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(
                                    imageVector = Icons.Rounded.CheckCircle,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(16.dp),
                                )
                                Text(
                                    text = state.message.orEmpty(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }

                    ErrorText(message = state.error)

                    PrimaryButton(
                        text = if (state.saving) stringResource(R.string.profile_saving_btn) else stringResource(R.string.profile_save_btn),
                        loading = state.saving,
                        leadingIcon = Icons.Rounded.Save,
                        onClick = { onEvent(ProfileUiEvent.Save) },
                    )
                }
            }
        }

        // Notifications Section
        if (state.notifications.isNotEmpty()) {
            item(key = "profile_notifications_header") {
                Text(
                    text = stringResource(R.string.profile_notifications),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            items(state.notifications, key = { it.title + it.date }) { notif ->
                NotificationTile(notification = notif)
            }
        }

        // Reviews Section
        if (state.reviews.isNotEmpty()) {
            item(key = "profile_reviews_header") {
                Text(
                    text = stringResource(R.string.profile_reviews),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }

            items(state.reviews, key = { it.facility + it.rating }) { review ->
                ReviewTile(review = review)
            }
        }

        // Logout
        item(key = "profile_logout") {
            SecondaryButton(
                text = stringResource(R.string.profile_logout_btn),
                leadingIcon = Icons.AutoMirrored.Rounded.Logout,
                onClick = { onEvent(ProfileUiEvent.Logout) },
            )
        }
    }
}

@Composable
private fun NotificationTile(
    notification: AppNotification,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(MaterialTheme.spacing.medium),
            horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.medium),
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Notifications,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = notification.title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = notification.text,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = notification.date,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun ReviewTile(
    review: Review,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.medium),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = review.facility,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Star,
                        contentDescription = null,
                        tint = MaterialTheme.extraColors.rating,
                        modifier = Modifier.size(16.dp),
                    )
                    Text(
                        text = "${review.rating}/5",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Text(
                text = review.text,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
private fun ProfileContentSuccessPreview() {
    SportBookingTheme {
        Surface {
            ProfileContent(
                state = ProfileUiState(
                    loading = false,
                    fullName = "Nguyễn Phúc Du",
                    phone = "0912 345 678",
                    email = "phucdu.sport@gmail.com",
                    notifications = PreviewData.notifications,
                    reviews = PreviewData.reviews,
                ),
                onEvent = {},
            )
        }
    }
}

@PreviewLightDark
@Composable
private fun ProfileContentLoadingPreview() {
    SportBookingTheme {
        Surface {
            ProfileContent(
                state = ProfileUiState(loading = true),
                onEvent = {},
            )
        }
    }
}
