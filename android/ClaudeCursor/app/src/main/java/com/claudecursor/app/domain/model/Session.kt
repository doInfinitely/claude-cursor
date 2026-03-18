package com.claudecursor.app.domain.model

data class Session(
    val name: String,
    val status: String,
    val shell: String? = null,
    val port: Int? = null,
    val pid: Int? = null,
    val createdAt: String? = null,
    val needsAction: Boolean = false,
    val actionType: String? = null,
    val needsActionSnippet: String? = null,
    val confidence: Double? = null,
    val description: String? = null
) {
    val isRunning: Boolean get() = status == "running"

    val actionRank: Int get() = if (!needsAction) 10 else when (actionType) {
        "approval" -> 0
        "completed" -> 1
        "prompt" -> 2
        "flagged" -> 3
        else -> 4
    }
}
