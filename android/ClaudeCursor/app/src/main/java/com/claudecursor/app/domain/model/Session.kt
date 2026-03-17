package com.claudecursor.app.domain.model

data class Session(
    val name: String,
    val status: String,
    val shell: String? = null,
    val port: Int? = null,
    val pid: Int? = null,
    val createdAt: String? = null
) {
    val isRunning: Boolean get() = status == "running"
}
