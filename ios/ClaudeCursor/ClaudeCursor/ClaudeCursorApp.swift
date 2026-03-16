import SwiftUI
import SwiftData

@main
struct ClaudeCursorApp: App {
    init() {
        let titleColor = UIColor(red: 0xf9/255, green: 0xf5/255, blue: 0xed/255, alpha: 1)
        let bgColor = UIColor(red: 0x5d/255, green: 0x3d/255, blue: 0x3a/255, alpha: 1)

        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = bgColor
        appearance.titleTextAttributes = [.foregroundColor: titleColor]
        appearance.largeTitleTextAttributes = [.foregroundColor: titleColor]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().tintColor = UIColor(red: 0xbd/255, green: 0xb7/255, blue: 0xfc/255, alpha: 1)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Server.self)
    }
}
