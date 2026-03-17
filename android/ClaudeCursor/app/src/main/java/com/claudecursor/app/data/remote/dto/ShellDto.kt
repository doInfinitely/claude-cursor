package com.claudecursor.app.data.remote.dto

import com.claudecursor.app.domain.model.Shell

data class ShellDto(
    val id: String,
    val name: String,
    val path: String
) {
    fun toDomain(): Shell = Shell(id = id, name = name, path = path)
}

data class ShellsResponse(
    val shells: List<ShellDto>
)
