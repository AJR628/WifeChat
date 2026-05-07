import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

enum LocalRewriteTone: Sendable {
    case warm
    case direct
    case short
}

enum LocalFoundationModelRewriteService {
    static func rewrite(source: String, tone: LocalRewriteTone) async -> String? {
        let trimmedSource = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSource.isEmpty else { return nil }

        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return await FoundationModelRewriteRunner.rewrite(source: trimmedSource, tone: tone)
        }
        #endif

        return nil
    }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
private enum FoundationModelRewriteRunner {
    private enum RewriteError: Error {
        case timeout
        case emptyResponse
    }

    static func rewrite(source: String, tone: LocalRewriteTone) async -> String? {
        switch SystemLanguageModel.default.availability {
        case .available:
            break
        case .unavailable(.deviceNotEligible),
             .unavailable(.appleIntelligenceNotEnabled),
             .unavailable(.modelNotReady),
             .unavailable:
            return nil
        }

        do {
            let rewritten = try await withTimeout(seconds: 20) {
                let session = LanguageModelSession(instructions: """
                You rewrite relationship messages for WifeChat. WifeChat is not \
                therapy, diagnosis, surveillance, or mind reading. Preserve the \
                user's meaning. Return only the rewritten text. Do not include \
                labels, explanations, quotes, bullets, or commentary.
                """)

                let response = try await session.respond(to: prompt(for: tone, source: source))
                let content = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !content.isEmpty else { throw RewriteError.emptyResponse }
                return content
            }
            return rewritten
        } catch {
            return nil
        }
    }

    private static func prompt(for tone: LocalRewriteTone, source: String) -> String {
        switch tone {
        case .warm:
            return """
            Rewrite the message to sound warmer and less blaming while preserving \
            the user's meaning. Return only the rewritten text.

            Message:
            \(source)
            """
        case .direct:
            return """
            Rewrite the message to be clear, direct, and respectful while \
            preserving the user's meaning. Return only the rewritten text.

            Message:
            \(source)
            """
        case .short:
            return """
            Rewrite the message to be brief, calm, and respectful while preserving \
            the user's meaning. Return only the rewritten text.

            Message:
            \(source)
            """
        }
    }

    private static func withTimeout<T>(
        seconds: UInt64,
        operation: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }

            group.addTask {
                try await Task.sleep(nanoseconds: seconds * 1_000_000_000)
                throw RewriteError.timeout
            }

            guard let result = try await group.next() else {
                throw CancellationError()
            }

            group.cancelAll()
            return result
        }
    }
}
#endif
