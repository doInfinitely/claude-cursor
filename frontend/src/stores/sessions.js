import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref([])
  const shells = ref([])
  const current = ref(null)
  const apiKeyAlert = ref(false)
  let ws = null
  let reconnectTimer = null
  let reconnectDelay = 1000

  async function fetchSessions() {
    const res = await fetch('/api/sessions')
    const data = await res.json()
    sessions.value = data.sessions
  }

  async function fetchShells() {
    const res = await fetch('/api/sessions/shells')
    const data = await res.json()
    shells.value = data.shells
  }

  async function createSession(name, shell) {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, shell })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    const session = await res.json()
    current.value = session.name
    await fetchSessions()
  }

  async function stopSession(name) {
    const res = await fetch(`/api/sessions/${name}/stop`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  async function restartSession(name) {
    const res = await fetch(`/api/sessions/${name}/restart`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  async function removeSession(name) {
    const res = await fetch(`/api/sessions/${name}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    if (current.value === name) {
      current.value = null
    }
    await fetchSessions()
  }

  function select(name) {
    current.value = name
  }

  function connectWs() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${proto}://${location.host}/ws`)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.event === 'apiKeyInvalid') {
          apiKeyAlert.value = true
          return
        }
      } catch {}
      fetchSessions()
    }

    ws.onopen = () => {
      reconnectDelay = 1000
    }

    ws.onclose = () => {
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectWs()
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    }, reconnectDelay)
  }

  function init() {
    fetchSessions()
    fetchShells()
    connectWs()
  }

  async function create({ command, name }) {
    return createSession(name || null, command || null)
  }

  async function fetchNotifyTargets() {
    const res = await fetch('/api/notifications/targets')
    const data = await res.json()
    return data.targets || { discord: [], slack: [] }
  }

  async function fetchNotifyStatus() {
    const res = await fetch('/api/notifications/status')
    const data = await res.json()
    return data || { discord: {}, slack: {} }
  }

  async function updateNotifyConfig(name, config) {
    const res = await fetch(`/api/sessions/${name}/notify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  async function fetchTunnelStatus() {
    const res = await fetch('/api/tunnel/status')
    return await res.json()
  }

  async function setBaseUrl(url) {
    const res = await fetch('/api/tunnel/set-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url || null })
    })
    return await res.json()
  }

  async function fetchApiKeyStatus() {
    const res = await fetch('/api/settings/api-key')
    return await res.json()
  }

  async function saveApiKey(key) {
    const res = await fetch('/api/settings/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    })
    const data = await res.json()
    if (data.valid) {
      apiKeyAlert.value = false
    }
    return data
  }

  async function shareSession(name, expiresIn) {
    const body = expiresIn ? { expiresIn } : {}
    const res = await fetch(`/api/sessions/${name}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    const data = await res.json()
    return data
  }

  async function removeNotifyConfig(name) {
    const res = await fetch(`/api/sessions/${name}/notify`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  return {
    sessions,
    shells,
    current,
    apiKeyAlert,
    init,
    fetchSessions,
    createSession,
    create,
    stopSession,
    restartSession,
    removeSession,
    select,
    fetchNotifyTargets,
    fetchNotifyStatus,
    updateNotifyConfig,
    removeNotifyConfig,
    shareSession,
    fetchTunnelStatus,
    setBaseUrl,
    fetchApiKeyStatus,
    saveApiKey
  }
})
