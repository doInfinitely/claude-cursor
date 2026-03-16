import SwiftUI

struct CreateSessionSheet: View {
    let apiClient: APIClient
    var onCreated: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var shells: [Shell] = []
    @State private var selectedShell: Shell?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                sessionSection
                shellSection
                createButton
            }
            .scrollContentBackground(.hidden)
            .background(Theme.bgPrimary)
            .navigationTitle("New Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.accent)
                }
            }
            .task {
                await loadShells()
            }
            .alert("Error", isPresented: .constant(errorMessage != nil)) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private var sessionSection: some View {
        Section("Session Name") {
            TextField("Optional", text: $name)
                .themedField()
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
        }
        .listRowBackground(Theme.bgSecondary)
    }

    private var shellSection: some View {
        Section("Shell") {
            if shells.isEmpty && isLoading {
                ProgressView()
                    .tint(Theme.accent)
            } else {
                ForEach(shells) { shell in
                    shellRow(shell)
                }
            }
        }
        .listRowBackground(Theme.bgSecondary)
    }

    @ViewBuilder
    private func shellRow(_ shell: Shell) -> some View {
        Button {
            selectedShell = shell
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(shell.name)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Theme.textPrimary)
                    Text(shell.path)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.textTertiary)
                }
                Spacer()
                if selectedShell?.id == shell.id {
                    Image(systemName: "checkmark")
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }

    private var createButton: some View {
        Section {
            Button {
                Task { await createSession() }
            } label: {
                HStack {
                    Spacer()
                    if isLoading {
                        ProgressView()
                            .tint(Theme.accentOnDark)
                    } else {
                        Text("Create")
                            .font(.system(size: 16, weight: .semibold))
                    }
                    Spacer()
                }
                .foregroundStyle(Theme.accentOnDark)
                .padding(.vertical, 4)
            }
            .disabled(selectedShell == nil || isLoading)
        }
        .listRowBackground(Theme.accent)
    }

    private func loadShells() async {
        isLoading = true
        defer { isLoading = false }
        do {
            shells = try await apiClient.fetchShells()
            selectedShell = shells.first
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func createSession() async {
        guard let shell = selectedShell else { return }
        isLoading = true
        defer { isLoading = false }
        do {
            try await apiClient.createSession(name: name.isEmpty ? nil : name, shell: shell.path)
            onCreated()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
