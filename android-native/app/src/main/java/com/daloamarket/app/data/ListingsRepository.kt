package com.daloamarket.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request

object ListingsRepository {
    private const val SUPABASE_URL = "https://wjanjnoxzizxxhtbwyqd.supabase.co"
    private const val SUPABASE_KEY = "sb_publishable_BLrm_nNwAjmvcwrjxL6BYA_VGdKOx2a"

    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun fetchListings(category: String? = null, limit: Int = 30): List<Listing> =
        withContext(Dispatchers.IO) {
            val select = "id,title,price,category,condition,district,photos,created_at"
            var url = "$SUPABASE_URL/rest/v1/listings" +
                "?select=$select&status=eq.active&order=created_at.desc&limit=$limit"
            if (category != null) url += "&category=eq.$category"

            val request = Request.Builder()
                .url(url)
                .addHeader("apikey", SUPABASE_KEY)
                .addHeader("Authorization", "Bearer $SUPABASE_KEY")
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) error("Erreur réseau (${response.code})")
                json.decodeFromString<List<Listing>>(response.body!!.string())
            }
        }
}
