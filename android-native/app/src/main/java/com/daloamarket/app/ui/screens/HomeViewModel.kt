package com.daloamarket.app.ui.screens

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.daloamarket.app.data.Listing
import com.daloamarket.app.data.ListingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val isLoading: Boolean = true,
    val listings: List<Listing> = emptyList(),
    val selectedCategory: String? = null,
    val error: String? = null,
)

class HomeViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun selectCategory(category: String?) {
        _uiState.value = _uiState.value.copy(selectedCategory = category)
        load()
    }

    fun load() {
        val category = _uiState.value.selectedCategory
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching { ListingsRepository.fetchListings(category) }
                .onSuccess { _uiState.value = _uiState.value.copy(isLoading = false, listings = it) }
                .onFailure { _uiState.value = _uiState.value.copy(isLoading = false, error = it.message) }
        }
    }
}
