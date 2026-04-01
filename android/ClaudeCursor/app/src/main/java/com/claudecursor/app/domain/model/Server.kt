package com.claudecursor.app.domain.model

import android.net.Uri

data class Server(
    val id: Long = 0,
    val name: String,
    val url: String,
    val lastSelectedSessionName: String? = null
) {
    val baseURL: String?
        get() {
            val parsed = Uri.parse(url)
            val scheme = parsed.scheme ?: return null
            val host = parsed.host ?: return null
            val port = parsed.port
            val origin = if (port > 0) "$scheme://$host:$port" else "$scheme://$host"
            // Preserve path prefix (e.g. /a/instanceId) but strip /terminal/:name or /s/:token
            val segments = parsed.pathSegments
            val basePath = if (segments.size >= 2 && (segments[segments.size - 2] == "terminal" || segments[segments.size - 2] == "s")) {
                segments.dropLast(2)
            } else {
                segments
            }
            val pathString = if (basePath.isEmpty()) "" else "/" + basePath.joinToString("/")
            return "$origin$pathString"
        }

    val initialSessionName: String?
        get() {
            val parsed = Uri.parse(url)
            val segments = parsed.pathSegments
            // Check last two segments for /terminal/:name (may be prefixed with /a/:instanceId)
            if (segments.size >= 2 && segments[segments.size - 2] == "terminal") {
                return segments[segments.size - 1]
            }
            return null
        }

    val shareToken: String?
        get() {
            val parsed = Uri.parse(url)
            val segments = parsed.pathSegments
            // Check last two segments for /s/:token (may be prefixed with /a/:instanceId)
            if (segments.size >= 2 && segments[segments.size - 2] == "s") {
                return segments[segments.size - 1]
            }
            return null
        }

    val isShareLink: Boolean get() = shareToken != null
}
