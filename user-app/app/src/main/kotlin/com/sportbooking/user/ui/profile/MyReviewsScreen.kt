package com.sportbooking.user.ui.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.PreviewFontScale
import androidx.compose.ui.tooling.preview.PreviewLightDark
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.sportbooking.domain.common.DomainResult
import com.sportbooking.domain.model.Review
import com.sportbooking.domain.usecase.GetMyReviewsUseCase
import com.sportbooking.domain.usecase.UpdateReviewUseCase
import com.sportbooking.user.R
import com.sportbooking.user.ui.components.EmptyState
import com.sportbooking.user.ui.components.ErrorText
import com.sportbooking.user.ui.components.LoadingScreen
import com.sportbooking.user.ui.components.WriteReviewBottomSheet
import com.sportbooking.user.ui.theme.SportBookingTheme
import com.sportbooking.user.ui.theme.extraColors
import com.sportbooking.user.ui.theme.spacing
import com.sportbooking.user.ui.util.PreviewData
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class MyReviewsUiState(
    val loading: Boolean = true,
    val reviews: List<Review> = emptyList(),
    val error: String? = null,
    val editingId: String? = null,
)

@HiltViewModel
class MyReviewsViewModel @Inject constructor(
    private val getMyReviews: GetMyReviewsUseCase,
    private val updateReview: UpdateReviewUseCase,
) : ViewModel() {
    private val _state = MutableStateFlow(MyReviewsUiState())
    val state = _state.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            when (val result = getMyReviews()) {
                is DomainResult.Success -> _state.update {
                    it.copy(loading = false, reviews = result.data, editingId = null)
                }
                is DomainResult.Failure -> _state.update {
                    it.copy(loading = false, error = result.message, editingId = null)
                }
            }
        }
    }

    fun update(id: String, rating: Int, text: String) {
        if (_state.value.editingId != null) return
        _state.update { it.copy(editingId = id, error = null) }
        viewModelScope.launch {
            when (val result = updateReview(id, rating, text)) {
                is DomainResult.Success -> refresh()
                is DomainResult.Failure -> _state.update {
                    it.copy(editingId = null, error = result.message)
                }
            }
        }
    }
}

@Composable
fun MyReviewsScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MyReviewsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    MyReviewsContent(
        state = state,
        onBack = onBack,
        onRetry = viewModel::refresh,
        onEdit = viewModel::update,
        modifier = modifier,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyReviewsContent(
    state: MyReviewsUiState,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onEdit: (id: String, rating: Int, text: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedStars by rememberSaveable { mutableIntStateOf(0) }
    var expandedKey by rememberSaveable { mutableStateOf<String?>(null) }
    var editingReview by remember { mutableStateOf<Review?>(null) }

    val filtered = remember(state.reviews, selectedStars) {
        if (selectedStars == 0) state.reviews
        else state.reviews.filter { it.rating == selectedStars }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                windowInsets = WindowInsets(0, 0, 0, 0),
                title = {
                    Text(
                        text = stringResource(R.string.profile_reviews),
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
                    titleContentColor = MaterialTheme.colorScheme.onSurface,
                ),
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
        },
    ) { padding ->
        when {
            state.loading -> LoadingScreen(modifier = Modifier.padding(padding))
            state.error != null && state.reviews.isEmpty() -> EmptyState(
                title = stringResource(R.string.label_no_reviews),
                message = state.error.orEmpty(),
                actionLabel = stringResource(R.string.btn_back),
                onAction = onRetry,
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
            )
            state.reviews.isEmpty() -> EmptyState(
                title = stringResource(R.string.label_no_reviews),
                message = stringResource(R.string.my_reviews_empty_desc),
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
            )
            else -> Column(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
            ) {
                if (state.error != null) {
                    ErrorText(
                        message = state.error,
                        modifier = Modifier.padding(horizontal = MaterialTheme.spacing.normal),
                    )
                }
                RatingFilterRow(
                    selectedStars = selectedStars,
                    onSelected = {
                        selectedStars = it
                        expandedKey = null
                    },
                    modifier = Modifier.padding(vertical = MaterialTheme.spacing.small),
                )

                if (filtered.isEmpty()) {
                    EmptyState(
                        title = stringResource(R.string.my_reviews_filter_empty_title),
                        message = stringResource(R.string.my_reviews_filter_empty_desc),
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(
                            horizontal = MaterialTheme.spacing.normal,
                            vertical = MaterialTheme.spacing.small,
                        ),
                        verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
                    ) {
                        itemsIndexed(
                            filtered,
                            key = { _, review -> review.id.ifBlank { review.facility + review.text } },
                        ) { _, review ->
                            val key = review.id.ifBlank { review.facility + review.text }
                            MyReviewRow(
                                review = review,
                                expanded = expandedKey == key,
                                onToggle = {
                                    expandedKey = if (expandedKey == key) null else key
                                },
                                onEdit = { editingReview = review },
                            )
                        }
                        item { Spacer(Modifier.height(MaterialTheme.spacing.large)) }
                    }
                }
            }
        }
    }

    val currentEdit = editingReview
    if (currentEdit != null) {
        WriteReviewBottomSheet(
            facilityName = currentEdit.facility,
            initialRating = currentEdit.rating,
            initialComment = currentEdit.text,
            submitting = state.editingId == currentEdit.id,
            onDismiss = {
                if (state.editingId == null) editingReview = null
            },
            onSubmit = { rating, text ->
                onEdit(currentEdit.id, rating, text)
                editingReview = null
            },
        )
    }
}

@Composable
private fun RatingFilterRow(
    selectedStars: Int,
    onSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val options = listOf(0, 5, 4, 3, 2, 1)
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = MaterialTheme.spacing.normal),
        horizontalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
    ) {
        items(options, key = { it }) { stars ->
            val selected = selectedStars == stars
            FilterChip(
                selected = selected,
                onClick = { onSelected(stars) },
                label = {
                    Text(
                        text = if (stars == 0) {
                            stringResource(R.string.my_reviews_filter_all)
                        } else {
                            stringResource(R.string.my_reviews_filter_stars, stars)
                        },
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primaryContainer,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimaryContainer,
                ),
            )
        }
    }
}

@Composable
private fun MyReviewRow(
    review: Review,
    expanded: Boolean,
    onToggle: () -> Unit,
    onEdit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle),
    ) {
        Column(
            modifier = Modifier.padding(MaterialTheme.spacing.medium),
            verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = review.facility,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = if (expanded) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                for (i in 1..5) {
                    Icon(
                        imageVector = Icons.Rounded.Star,
                        contentDescription = null,
                        tint = if (i <= review.rating) {
                            MaterialTheme.extraColors.rating
                        } else {
                            MaterialTheme.colorScheme.outlineVariant
                        },
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
            AnimatedVisibility(
                visible = expanded,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(MaterialTheme.spacing.small)) {
                    Text(
                        text = review.text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    TextButton(onClick = onEdit) {
                        Icon(
                            imageVector = Icons.Rounded.Edit,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.size(6.dp))
                        Text(text = stringResource(R.string.my_reviews_edit_btn))
                    }
                }
            }
        }
    }
}

@PreviewLightDark
@PreviewFontScale
@Composable
private fun MyReviewsContentPreview() {
    SportBookingTheme {
        Surface {
            MyReviewsContent(
                state = MyReviewsUiState(
                    loading = false,
                    reviews = PreviewData.reviews,
                ),
                onBack = {},
                onRetry = {},
                onEdit = { _, _, _ -> },
            )
        }
    }
}
