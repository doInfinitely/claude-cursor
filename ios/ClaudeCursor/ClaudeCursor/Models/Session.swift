import Foundation

struct Session: Codable, Identifiable, Hashable {
    let name: String
    let status: String
    let shell: String?
    let port: Int?
    let pid: Int?
    let createdAt: String?
    let needsAction: Bool?
    let actionType: String?
    let needsActionSnippet: String?
    let confidence: Double?
    let description: String?

    var id: String { name }

    var isRunning: Bool { status == "running" }

    var actionRank: Int {
        guard needsAction == true else { return 10 }
        switch actionType {
        case "approval": return 0
        case "completed": return 1
        case "prompt": return 2
        case "flagged": return 3
        default: return 4
        }
    }
}

struct SessionsResponse: Codable {
    let sessions: [Session]
}

struct ShareInfo: Codable {
    let sessionName: String
    let status: String
}
