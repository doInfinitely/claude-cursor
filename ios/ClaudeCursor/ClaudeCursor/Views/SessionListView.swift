import SwiftUI

struct SessionListView: View {
    let server: Server

    @State private var sessions: [Session] = []
    @State private var selectedSession: Session?
    @State private var showingCreateSheet = false
    @State private var errorMessage: String?
    @State private var isLoading = false
    @State private var shareSessionName: String?
    @StateObject private var wsClient = WebSocketClient()

    private var apiClient: APIClient? {
        guard let url = server.baseURL else { return nil }
        return APIClient(baseURL: url)
    }

    private var isShareLink: Bool { server.isShareLink }

    var body: some View {
        VStack(spacing: 0) {
            if isShareLink {
                shareView
            } else {
                fullView
            }
        }
        .background(Theme.bgPrimary)
        .navigationTitle(server.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if !isShareLink {
                ToolbarItem(placement: .primaryAction) {
                    sessionMenu
                }
            }
        }
        .alert("Error", isPresented: .constant(errorMessage != nil)) {
            Button("OK") { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }
        .sheet(isPresented: $showingCreateSheet) {
            if let client = apiClient {
                CreateSessionSheet(apiClient: client) {
                    Task { await loadSessions() }
                }
            }
        }
        .task {
            if isShareLink {
                await resolveShareToken()
            } else {
                await loadSessions()
                setupWebSocket()
            }
        }
        .onDisappear {
            wsClient.disconnect()
        }
    }

    // MARK: - Share link view (scoped to one session)

    private var shareView: some View {
        Group {
            if let token = server.shareToken, let url = server.baseURL {
                if let name = shareSessionName {
                    TerminalWebView(baseURL: url, sessionName: name, sharePath: "/s/\(token)/")
                        .id(token)
                    KeyboardToolbar()
                } else if isLoading {
                    VStack {
                        Spacer()
                        ProgressView()
                            .tint(Theme.accent)
                        Text("Connecting...")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.textTertiary)
                            .padding(.top, 8)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    VStack(spacing: 16) {
                        Spacer()
                        Image(systemName: "link.badge.plus")
                            .font(.system(size: 40))
                            .foregroundStyle(Theme.textTertiary)
                        Text("Link expired or invalid")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.textTertiary)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    // MARK: - Full view (all sessions)

    private var fullView: some View {
        Group {
            SessionTabBar(
                sessions: sessions,
                selected: $selectedSession,
                onCreateTapped: { showingCreateSheet = true },
                onFlagToggle: { name in
                    Task { await toggleFlag(name) }
                }
            )

            if let session = selectedSession, session.isRunning, let url = server.baseURL {
                TerminalWebView(baseURL: url, sessionName: session.name)
                    .id(session.name)
                KeyboardToolbar()
            } else if let session = selectedSession, !session.isRunning {
                stoppedState(session)
            } else {
                emptyState
            }
        }
    }

    private var sessionMenu: some View {
        Menu {
            if let session = selectedSession {
                if session.isRunning {
                    Button("Stop Session", systemImage: "stop.circle") {
                        Task { await stopSession(session.name) }
                    }
                } else {
                    Button("Restart Session", systemImage: "play.circle") {
                        Task { await restartSession(session.name) }
                    }
                }
                Divider()
                Button("Delete Session", systemImage: "trash", role: .destructive) {
                    Task { await deleteSession(session.name) }
                }
            }
            Divider()
            if let url = server.baseURL {
                Button("Copy URL", systemImage: "doc.on.doc") {
                    UIPasteboard.general.string = url.absoluteString
                }
            }
            Button("New Session", systemImage: "plus") {
                showingCreateSheet = true
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .foregroundStyle(Theme.accent)
        }
    }

    private func stoppedState(_ session: Session) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "stop.circle")
                .font(.system(size: 40))
                .foregroundStyle(Theme.textTertiary)
            Text("Session '\(session.name)' is stopped")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.textSecondary)
            Button {
                Task { await restartSession(session.name) }
            } label: {
                Text("Restart")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Theme.accentOnDark)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.accent)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bgPrimary)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "terminal")
                .font(.system(size: 40))
                .foregroundStyle(Theme.textTertiary)
            Text("No session selected")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.textTertiary)
            if sessions.isEmpty && !isLoading {
                Button {
                    showingCreateSheet = true
                } label: {
                    Text("Create Session")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.accentOnDark)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Theme.accent)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.bgPrimary)
    }

    // MARK: - Data loading

    private func resolveShareToken() async {
        guard let client = apiClient, let token = server.shareToken else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let info = try await client.resolveShareToken(token)
            shareSessionName = info.sessionName
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func setupWebSocket() {
        guard let url = server.baseURL else { return }
        wsClient.onEvent = { [self] in
            Task { await loadSessions() }
        }
        wsClient.connect(to: url)
    }

    private func loadSessions() async {
        guard let client = apiClient else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            let fetched = try await client.fetchSessions()
            sessions = fetched
            if selectedSession == nil || !fetched.contains(where: { $0.name == selectedSession?.name }) {
                if let initial = server.initialSessionName,
                   let match = fetched.first(where: { $0.name == initial }) {
                    selectedSession = match
                } else {
                    selectedSession = fetched.sorted { a, b in
                    if a.actionRank != b.actionRank { return a.actionRank < b.actionRank }
                    if a.isRunning != b.isRunning { return a.isRunning }
                    return false
                }.first
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func stopSession(_ name: String) async {
        guard let client = apiClient else { return }
        do {
            try await client.stopSession(name: name)
            await loadSessions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func restartSession(_ name: String) async {
        guard let client = apiClient else { return }
        do {
            try await client.restartSession(name: name)
            await loadSessions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func toggleFlag(_ name: String) async {
        guard let client = apiClient else { return }
        do {
            try await client.toggleFlag(name: name)
            await loadSessions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteSession(_ name: String) async {
        guard let client = apiClient else { return }
        do {
            try await client.deleteSession(name: name)
            if selectedSession?.name == name {
                selectedSession = nil
            }
            await loadSessions()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
