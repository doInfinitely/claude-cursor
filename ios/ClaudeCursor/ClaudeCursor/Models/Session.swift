import Foundation

struct Session: Codable, Identifiable, Hashable {
    let name: String
    let status: String
    let shell: String?
    let port: Int?
    let pid: Int?
    let createdAt: String?

    var id: String { name }

    var isRunning: Bool { status == "running" }
}

struct SessionsResponse: Codable {
    let sessions: [Session]
}

struct ShareInfo: Codable {
    let sessionName: String
    let status: String
}
