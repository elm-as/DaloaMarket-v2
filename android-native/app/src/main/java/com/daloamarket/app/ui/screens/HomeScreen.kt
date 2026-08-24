package com.daloamarket.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.daloamarket.app.data.CATEGORY_LABELS
import com.daloamarket.app.ui.components.ListingCard
import com.daloamarket.app.ui.theme.*

@Composable
fun HomeScreen(viewModel: HomeViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier
            .fillMaxSize()
            .background(Grey50),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item(span = { GridItemSpan(2) }) { HeroHeader() }
        item(span = { GridItemSpan(2) }) {
            CategoryChips(
                selected = state.selectedCategory,
                onSelect = viewModel::selectCategory,
            )
        }
        item(span = { GridItemSpan(2) }) {
            Text(
                "Annonces récentes",
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        when {
            state.isLoading -> item(span = { GridItemSpan(2) }) {
                Box(Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            }
            state.error != null -> item(span = { GridItemSpan(2) }) {
                Text(
                    "Impossible de charger les annonces : ${state.error}",
                    color = Grey500,
                    modifier = Modifier.padding(24.dp),
                )
            }
            else -> items(state.listings, key = { it.id }) { listing ->
                ListingCard(listing)
            }
        }
    }
}

@Composable
private fun HeroHeader() {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(top = 16.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(
                Brush.linearGradient(listOf(Primary, Primary600)),
            )
            .padding(20.dp),
    ) {
        Text(
            "DaloaMarket",
            style = MaterialTheme.typography.headlineMedium,
            color = Color.White,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            "Achetez et vendez à Daloa,\nlivraison à domicile 🛵",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.9f),
        )
        Spacer(Modifier.height(16.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(Color.White)
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Icon(Icons.Outlined.Search, contentDescription = null, tint = Grey400)
            Spacer(Modifier.width(8.dp))
            Text("Rechercher un produit…", color = Grey400, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Composable
private fun CategoryChips(selected: String?, onSelect: (String?) -> Unit) {
    val categories = listOf<Pair<String?, String>>(null to "Tout") +
        CATEGORY_LABELS.map { it.key to it.value }
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(vertical = 16.dp),
    ) {
        items(categories) { (id, label) ->
            val isSelected = selected == id
            val bg by animateColorAsState(if (isSelected) Primary else Color.White, label = "chipBg")
            val fg by animateColorAsState(if (isSelected) Color.White else Grey700, label = "chipFg")
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = fg,
                modifier = Modifier
                    .clip(CircleShape)
                    .background(bg)
                    .clickable { onSelect(id) }
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }
    }
}
