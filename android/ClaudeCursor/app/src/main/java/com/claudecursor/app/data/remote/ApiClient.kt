package com.claudecursor.app.data.remote

import com.claudecursor.app.data.remote.dto.*
import com.claudecursor.app.domain.model.Session
import com.claudecursor.app.domain.model.Shell
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

private const val USER_AGENT =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/120.0.0.0 Mobile Safari/537.36 ClaudeCursorCompanion/1.0"

interface ApiService {
    @GET("/api/sessions")
    suspend fun getSessions(): SessionsResponse

    @GET("/api/sessions/shells")
    suspend fun getShells(): ShellsResponse

    @POST("/api/sessions")
    suspend fun createSession(@Body body: CreateSessionRequest)

    @POST("/api/sessions/{name}/stop")
    suspend fun stopSession(@Path("name") name: String)

    @POST("/api/sessions/{name}/restart")
    suspend fun restartSession(@Path("name") name: String)

    @DELETE("/api/sessions/{name}")
    suspend fun deleteSession(@Path("name") name: String)

    @GET("/api/sessions/share/{token}")
    suspend fun resolveShareToken(@Path("token") token: String): ShareInfoDto
}

object ApiClient {
    private val clients = mutableMapOf<String, ApiService>()

    fun getService(baseURL: String): ApiService {
        return clients.getOrPut(baseURL) {
            val client = OkHttpClient.Builder()
                .addInterceptor(Interceptor { chain ->
                    val request = chain.request().newBuilder()
                        .header("User-Agent", USER_AGENT)
                        .build()
                    chain.proceed(request)
                })
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            val url = if (baseURL.endsWith("/")) baseURL else "$baseURL/"

            Retrofit.Builder()
                .baseUrl(url)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService::class.java)
        }
    }

    suspend fun fetchSessions(baseURL: String): List<Session> {
        return getService(baseURL).getSessions().sessions.map { it.toDomain() }
    }

    suspend fun fetchShells(baseURL: String): List<Shell> {
        return getService(baseURL).getShells().shells.map { it.toDomain() }
    }

    suspend fun createSession(baseURL: String, name: String?, shell: String) {
        getService(baseURL).createSession(CreateSessionRequest(name = name, shell = shell))
    }

    suspend fun stopSession(baseURL: String, name: String) {
        getService(baseURL).stopSession(name)
    }

    suspend fun restartSession(baseURL: String, name: String) {
        getService(baseURL).restartSession(name)
    }

    suspend fun deleteSession(baseURL: String, name: String) {
        getService(baseURL).deleteSession(name)
    }

    suspend fun resolveShareToken(baseURL: String, token: String): ShareInfoDto {
        return getService(baseURL).resolveShareToken(token)
    }
}
