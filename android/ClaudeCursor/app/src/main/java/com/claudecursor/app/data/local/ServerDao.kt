package com.claudecursor.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ServerDao {
    @Query("SELECT * FROM servers ORDER BY name ASC")
    fun getAllServers(): Flow<List<ServerEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(server: ServerEntity): Long

    @Query("DELETE FROM servers WHERE id = :id")
    suspend fun deleteById(id: Long)
}
