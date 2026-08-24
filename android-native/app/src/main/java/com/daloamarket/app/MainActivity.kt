package com.daloamarket.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.daloamarket.app.ui.screens.HomeScreen
import com.daloamarket.app.ui.theme.DaloaMarketTheme
import com.daloamarket.app.ui.theme.Grey400
import com.daloamarket.app.ui.theme.Primary
import com.daloamarket.app.ui.theme.Primary50

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            DaloaMarketTheme {
                var selectedTab by remember { mutableIntStateOf(0) }
                val tabs = listOf(
                    "Accueil" to Icons.Outlined.Home,
                    "Recherche" to Icons.Outlined.Search,
                    "Vendre" to Icons.Filled.AddCircle,
                    "Messages" to Icons.Outlined.ChatBubbleOutline,
                    "Profil" to Icons.Outlined.Person,
                )
                Scaffold(
                    bottomBar = {
                        NavigationBar(containerColor = Color.White) {
                            tabs.forEachIndexed { index, (label, icon) ->
                                NavigationBarItem(
                                    selected = selectedTab == index,
                                    onClick = { selectedTab = index },
                                    icon = { Icon(icon, contentDescription = label) },
                                    label = { Text(label) },
                                    colors = NavigationBarItemDefaults.colors(
                                        selectedIconColor = Primary,
                                        selectedTextColor = Primary,
                                        indicatorColor = Primary50,
                                        unselectedIconColor = Grey400,
                                        unselectedTextColor = Grey400,
                                    ),
                                )
                            }
                        }
                    },
                ) { padding ->
                    // Prototype : seul l'onglet Accueil est implémenté
                    Box(Modifier.padding(padding)) {
                        HomeScreen()
                    }
                }
            }
        }
    }
}
