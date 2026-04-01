import Foundation

@MainActor
class WebSocketClient: ObservableObject {
    private var task: URLSessionWebSocketTask?
    private var session = URLSession.shared
    private var retryDelay: TimeInterval = 1
    private var maxRetryDelay: TimeInterval = 16
    private var baseURL: URL?
    private var isConnected = false

    var onEvent: (() -> Void)?

    func connect(to baseURL: URL) {
        self.baseURL = baseURL
        let base = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let wsString = base
            .replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
            + "/ws"
        guard let wsURL = URL(string: wsString) else { return }

        let task = session.webSocketTask(with: wsURL)
        self.task = task
        task.resume()
        isConnected = true
        retryDelay = 1
        listen()
    }

    func disconnect() {
        isConnected = false
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
    }

    private func listen() {
        task?.receive { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success:
                    self.onEvent?()
                    self.listen()
                case .failure:
                    self.reconnect()
                }
            }
        }
    }

    private func reconnect() {
        guard isConnected, let baseURL else { return }
        task?.cancel(with: .abnormalClosure, reason: nil)
        task = nil

        let delay = retryDelay
        retryDelay = min(retryDelay * 2, maxRetryDelay)

        Task { @MainActor in
            try? await Task.sleep(for: .seconds(delay))
            guard self.isConnected else { return }
            self.connect(to: baseURL)
            self.onEvent?()
        }
    }
}
