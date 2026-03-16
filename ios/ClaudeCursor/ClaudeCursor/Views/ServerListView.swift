import SwiftUI
import SwiftData

struct ServerListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Server.name) private var servers: [Server]
    @State private var showingAddSheet = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Servers")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Spacer()
                Button {
                    showingAddSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Theme.accent)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Theme.bgSecondary)

            if servers.isEmpty {
                VStack(spacing: 16) {
                    Spacer()
                    Image(systemName: "server.rack")
                        .font(.system(size: 40))
                        .foregroundStyle(Theme.textTertiary)
                    Text("No servers added")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.textTertiary)
                    Button {
                        showingAddSheet = true
                    } label: {
                        Text("Add Server")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Theme.accentOnDark)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Theme.accent)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .background(Theme.bgPrimary)
            } else {
                List {
                    ForEach(servers) { server in
                        NavigationLink(destination: SessionListView(server: server)) {
                            serverRow(server)
                        }
                        .listRowBackground(Theme.bgSecondary)
                        .listRowSeparatorTint(Theme.border)
                    }
                    .onDelete(perform: deleteServers)
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.bgPrimary)
            }
        }
        .background(Theme.bgPrimary)
        .navigationBarHidden(true)
        .sheet(isPresented: $showingAddSheet) {
            ServerFormSheet()
        }
    }

    private func serverRow(_ server: Server) -> some View {
        HStack(spacing: 12) {
            Image(systemName: server.isShareLink ? "link" : "server.rack")
                .font(.system(size: 16))
                .foregroundStyle(Theme.accent)
                .frame(width: 36, height: 36)
                .background(
                    LinearGradient(
                        colors: [Theme.accent.opacity(0.2), Theme.accent.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(server.name)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                Text(server.url)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.textTertiary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }

    private func deleteServers(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(servers[index])
        }
    }
}
