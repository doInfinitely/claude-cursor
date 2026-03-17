package com.claudecursor.app.data.remote

import android.util.Log
import kotlinx.coroutines.*
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketClient {
    private var webSocket: WebSocket? = null
    private var baseURL: String? = null
    private var isConnected = false
    private var retryDelay = 1000L
    private val maxRetryDelay = 16000L
    private var scope: CoroutineScope? = null

    var onEvent: (() -> Unit)? = null

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun connect(baseURL: String, scope: CoroutineScope) {
        this.baseURL = baseURL
        this.scope = scope
        isConnected = true
        retryDelay = 1000L

        val wsScheme = if (baseURL.startsWith("https")) "wss" else "ws"
        val urlPart = baseURL.removePrefix("https://").removePrefix("http://")
        val wsUrl = "$wsScheme://$urlPart/ws"

        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("WebSocketClient", "Connected to $wsUrl")
                retryDelay = 1000L
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                scope.launch(Dispatchers.Main) {
                    onEvent?.invoke()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("WebSocketClient", "WebSocket failure: ${t.message}")
                reconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("WebSocketClient", "WebSocket closed: $reason")
                if (isConnected) reconnect()
            }
        })
    }

    fun disconnect() {
        isConnected = false
        webSocket?.close(1000, "User disconnect")
        webSocket = null
    }

    private fun reconnect() {
        if (!isConnected) return
        val url = baseURL ?: return
        val currentScope = scope ?: return

        webSocket?.close(1001, "Reconnecting")
        webSocket = null

        val delay = retryDelay
        retryDelay = minOf(retryDelay * 2, maxRetryDelay)

        currentScope.launch {
            delay(delay)
            if (isConnected) {
                connect(url, currentScope)
                onEvent?.invoke()
            }
        }
    }
}
