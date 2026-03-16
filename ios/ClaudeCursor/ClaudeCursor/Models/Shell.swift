import Foundation

struct Shell: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let path: String
}

struct ShellsResponse: Codable {
    let shells: [Shell]
}
