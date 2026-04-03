import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Detect relay path prefix (e.g. /a/instanceId) from current URL
const pathPrefix = (window.location.pathname.match(/^\/a\/[^/]+/) || [''])[0]

export const useSessionStore = defineStore('sessions', () => {
  const sessions = ref([])
  const shells = ref([])
  const current = ref(null)
  const apiKeyAlert = ref(false)
  let ws = null
  let reconnectTimer = null
  let reconnectDelay = 1000

  // Remote servers
  const remoteServers = ref([])
  const remoteSessionsMap = ref({}) // { remoteId: [sessions] }

  // Grid view
  const viewMode = ref('list') // 'list' | 'grid'
  const gridCellWidth = ref(500)

  const remoteSessionsFlat = computed(() => {
    const result = []
    for (const [remoteId, sessions] of Object.entries(remoteSessionsMap.value)) {
      for (const s of sessions) {
        result.push(s)
      }
    }
    return result
  })

  const allSessions = computed(() => {
    const local = sessions.value.map(s => ({
      ...s,
      remote: false,
      displayKey: s.name,
      terminalUrl: s.status === 'running' ? `${pathPrefix}/terminal/${s.name}/` : null,
    }))
    const remote = remoteSessionsFlat.value.map(s => ({
      ...s,
      displayKey: `${s.remoteId}:${s.name}`,
    }))
    return [...local, ...remote]
  })

  const currentTerminalUrl = computed(() => {
    if (!current.value) return null
    // Check if it's a remote compound key
    if (current.value.includes(':')) {
      const session = remoteSessionsFlat.value.find(
        s => `${s.remoteId}:${s.name}` === current.value
      )
      return session?.terminalUrl || null
    }
    // Local session
    const session = sessions.value.find(s => s.name === current.value)
    if (!session || session.status !== 'running') return null
    return `${pathPrefix}/terminal/${session.name}/`
  })

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
        if (msg.event === 'apiKeyValid') {
          apiKeyAlert.value = false
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

  async function checkApiKeyAlert() {
    try {
      const status = await fetchApiKeyStatus()
      apiKeyAlert.value = status.configured && !status.valid
    } catch {}
  }

  function init() {
    fetchSessions()
    fetchShells()
    connectWs()
    fetchRemoteServers()
    checkApiKeyAlert()
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


  async function toggleFlag(name) {
    // Check if this is a remote session (remoteId:sessionName)
    const remoteSession = remoteSessionsFlat.value.find(
      s => `${s.remoteId}:${s.name}` === name
    )
    if (remoteSession) {
      const url = `/api/remote-servers/${remoteSession.remoteId}/sessions/${encodeURIComponent(remoteSession.name)}/flag`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      await refreshRemoteSessions()
      return
    }
    const res = await fetch(`/api/sessions/${name}/flag`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  async function removeNotifyConfig(name) {
    const res = await fetch(`/api/sessions/${name}/notify`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchSessions()
  }

  // Remote servers
  async function fetchRemoteServers() {
    try {
      const res = await fetch('/api/remote-servers')
      const data = await res.json()
      remoteServers.value = data.servers || []
      await refreshRemoteSessions()
    } catch {}
  }

  async function refreshRemoteSessions() {
    const map = {}
    await Promise.allSettled(
      remoteServers.value.map(async (server) => {
        try {
          const res = await fetch(`/api/remote-servers/${server.id}/sessions`)
          const data = await res.json()
          map[server.id] = data.sessions || []
        } catch {
          map[server.id] = []
        }
      })
    )
    remoteSessionsMap.value = map
  }

  async function addRemoteServer(url, label) {
    const res = await fetch('/api/remote-servers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, label })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error)
    }
    await fetchRemoteServers()
  }

  async function removeRemoteServer(id) {
    await fetch(`/api/remote-servers/${id}`, { method: 'DELETE' })
    // Deselect if current is from this remote
    if (current.value && current.value.startsWith(id + ':')) {
      current.value = null
    }
    await fetchRemoteServers()
  }

  // Broadcast input to all running sessions (local + remote)
  async function broadcastInput(keys) {
    const promises = []

    // Local running sessions
    for (const s of sessions.value) {
      if (s.status === 'running') {
        const url = `/api/sessions/${encodeURIComponent(s.name)}/input`
        promises.push(
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys })
          }).then(r => {
            if (!r.ok) console.warn(`[broadcast] local ${s.name} failed: ${r.status}`)
          }).catch(e => console.warn(`[broadcast] local ${s.name} error:`, e))
        )
      }
    }

    // Remote running sessions
    const remoteSessions = remoteSessionsFlat.value
    console.log(`[broadcast] ${sessions.value.filter(s => s.status === 'running').length} local, ${remoteSessions.filter(s => s.status === 'running').length} remote`)
    for (const s of remoteSessions) {
      if (s.status === 'running') {
        const url = `/api/remote-servers/${s.remoteId}/sessions/${encodeURIComponent(s.name)}/input`
        promises.push(
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys })
          }).then(r => {
            if (!r.ok) console.warn(`[broadcast] remote ${s.name} failed: ${r.status}`)
          }).catch(e => console.warn(`[broadcast] remote ${s.name} error:`, e))
        )
      }
    }

    await Promise.allSettled(promises)
  }

  // Grid view
  function setViewMode(mode) {
    viewMode.value = mode
  }

  function setGridCellWidth(width) {
    gridCellWidth.value = width
  }

  return {
    sessions,
    shells,
    current,
    apiKeyAlert,
    remoteServers,
    remoteSessionsMap,
    remoteSessionsFlat,
    allSessions,
    currentTerminalUrl,
    viewMode,
    gridCellWidth,
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
    toggleFlag,
    fetchTunnelStatus,
    setBaseUrl,
    fetchApiKeyStatus,
    saveApiKey,
    fetchRemoteServers,
    refreshRemoteSessions,
    addRemoteServer,
    removeRemoteServer,
    broadcastInput,
    setViewMode,
    setGridCellWidth,
  }
})
