package com.claudecursor.app.data.remote.dto

import com.claudecursor.app.domain.model.Session
import com.google.gson.annotations.SerializedName

data class SessionDto(
    val name: String,
    val status: String,
    val shell: String? = null,
    val port: Int? = null,
    val pid: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
) {
    fun toDomain(): Session = Session(
        name = name,
        status = status,
        shell = shell,
        port = port,
        pid = pid,
        createdAt = createdAt
    )
}

data class SessionsResponse(
    val sessions: List<SessionDto>
)

data class ShareInfoDto(
    @SerializedName("session_name") val sessionName: String,
    val status: String
)

data class CreateSessionRequest(
    val name: String? = null,
    val shell: String
)
