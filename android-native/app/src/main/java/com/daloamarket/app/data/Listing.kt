package com.daloamarket.app.data

import kotlinx.serialization.Serializable

@Serializable
data class Listing(
    val id: String,
    val title: String,
    val price: Double,
    val category: String,
    val condition: String,
    val district: String,
    val photos: List<String> = emptyList(),
    val created_at: String,
)

val CATEGORY_LABELS = mapOf(
    "fashion" to "Mode & Accessoires",
    "electronics" to "Électronique",
    "home" to "Maison & Jardin",
    "vehicles" to "Auto & Moto",
    "sports" to "Sports & Loisirs",
    "books" to "Livres & Culture",
    "food" to "Alimentaire",
)

val CONDITION_LABELS = mapOf(
    "new" to "Neuf",
    "like_new" to "Quasi Neuf",
    "good" to "Bon état",
    "used" to "Usagé",
)
