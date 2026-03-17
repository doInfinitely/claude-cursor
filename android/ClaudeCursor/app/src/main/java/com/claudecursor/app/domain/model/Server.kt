package com.claudecursor.app.domain.model

import android.net.Uri

data class Server(
    val id: Long = 0,
    val name: String,
    val url: String
) {
    val baseURL: String?
        get() {
            val parsed = Uri.parse(url)
            val scheme = parsed.scheme ?: return null
            val host = parsed.host ?: return null
            val port = parsed.port
            return if (port > 0) "$scheme://$host:$port" else "$scheme://$host"
        }

    val initialSessionName: String?
        get() {
            val parsed = Uri.parse(url)
            val segments = parsed.pathSegments
            if (segments.size >= 2 && segments[0] == "terminal") {
                return segments[1]
            }
            return null
        }

    val shareToken: String?
        get() {
            val parsed = Uri.parse(url)
            val segments = parsed.pathSegments
            if (segments.size >= 2 && segments[0] == "s") {
                return segments[1]
            }
            return null
        }

    val isShareLink: Boolean get() = shareToken != null
}
