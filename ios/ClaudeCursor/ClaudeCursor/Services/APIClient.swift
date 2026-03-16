import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case httpError(Int, url: String)
    case decodingError

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .httpError(let code, let url):
            return "HTTP \(code): \(url)"
        case .decodingError:
            return "Failed to decode response"
        }
    }
}

actor APIClient {
    let baseURL: String

    init(baseURL: URL) {
        self.baseURL = baseURL.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func url(_ path: String) -> URL? {
        URL(string: "\(baseURL)\(path)")
    }

    private func request<T: Decodable>(_ method: String, path: String, body: Data? = nil) async throws -> T {
        guard let url = url(path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        if let body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidURL }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(http.statusCode, url: url.absoluteString)
        }
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(T.self, from: data)
    }

    private func requestVoid(_ method: String, path: String, body: Data? = nil) async throws {
        guard let url = url(path) else { throw APIError.invalidURL }
        var req = URLRequest(url: url)
        req.httpMethod = method
        if let body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (_, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidURL }
        guard (200...299).contains(http.statusCode) else {
            throw APIError.httpError(http.statusCode, url: url.absoluteString)
        }
    }

    func fetchSessions() async throws -> [Session] {
        let response: SessionsResponse = try await request("GET", path: "/api/sessions")
        return response.sessions
    }

    func fetchShells() async throws -> [Shell] {
        let response: ShellsResponse = try await request("GET", path: "/api/sessions/shells")
        return response.shells
    }

    func createSession(name: String?, shell: String) async throws {
        var params: [String: String] = ["shell": shell]
        if let name, !name.isEmpty { params["name"] = name }
        let body = try JSONEncoder().encode(params)
        try await requestVoid("POST", path: "/api/sessions", body: body)
    }

    func stopSession(name: String) async throws {
        try await requestVoid("POST", path: "/api/sessions/\(name)/stop")
    }

    func restartSession(name: String) async throws {
        try await requestVoid("POST", path: "/api/sessions/\(name)/restart")
    }

    func deleteSession(name: String) async throws {
        try await requestVoid("DELETE", path: "/api/sessions/\(name)")
    }

    func resolveShareToken(_ token: String) async throws -> ShareInfo {
        return try await request("GET", path: "/api/sessions/share/\(token)")
    }
}
