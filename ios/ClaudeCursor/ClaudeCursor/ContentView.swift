import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            ServerListView()
        }
        .tint(Theme.accent)
        .preferredColorScheme(.dark)
    }
}
