package com.claudecursor.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.claudecursor.app.domain.model.Server

@Entity(tableName = "servers")
data class ServerEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val url: String
) {
    fun toDomain(): Server = Server(id = id, name = name, url = url)

    companion object {
        fun fromDomain(server: Server): ServerEntity =
            ServerEntity(id = server.id, name = server.name, url = server.url)
    }
}
