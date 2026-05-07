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
                You rewrite messages before the user sends them.

                Shared rules:
                - Preserve every essential point, request, boundary, feeling, fact, \
                and timeline.
                - Do not add new facts, promises, apologies, pet names, diagnoses, \
                motives, or emotional claims.
                - Do not remove important details just to make the message smoother.
                - Do not explain, analyze, label, give advice, or mention rewriting.
                - Do not sound robotic, corporate, therapeutic, or like a third person.
                - Return only the rewritten message.
                - Do not use quotation marks unless they were in the original.
                """)

                let response = try await session.respond(
                    to: prompt(for: tone, source: source),
                    options: generationOptions(for: tone)
                )
                let content = cleanOutput(response.content)
                guard !content.isEmpty else { throw RewriteError.emptyResponse }
                return content
            }
            return rewritten
        } catch {
            return nil
        }
    }

    private static func prompt(for tone: LocalRewriteTone, source: String) -> String {
        let lengthGuidance = lengthGuidance(for: source)

        switch tone {
        case .warm:
            return """
            Task:
            - Rewrite to sound warmer, calmer, and less blaming.
            - Keep the same intent, all essential points, and the user's \
            voice/perspective.
            - Change harsh wording into more considerate wording.
            - Turn accusations into "I" statements when natural.
            - Do not shift focus away from the user's concern.
            - Keep roughly the same length unless a shorter version preserves all \
            essential points.

            Length guidance:
            \(lengthGuidance)

            Message:
            \(source)
            """
        case .direct:
            return """
            Task:
            - Rewrite to be clearer, more direct, and respectful.
            - Keep the same intent, all essential points, and the user's \
            voice/perspective.
            - Turn vague or rambling wording into clearer wording.
            - Make hesitant phrasing more confident when natural.
            - Do not soften the point so much that it loses force.
            - Do not make it cold, rude, corporate, or robotic.
            - Do not leave unchanged unless already clear, direct, and respectful.
            - Keep roughly the same length or slightly shorter while preserving all \
            essential points.

            Length guidance:
            \(lengthGuidance)

            Message:
            \(source)
            """
        case .short:
            return """
            Task:
            - Rewrite to be shorter while staying calm and respectful.
            - Keep every essential point, request, fact, boundary, and feeling.
            - Remove repetition, filler, and over-explaining.
            - Combine sentences when natural.
            - Do not remove an important point just to make it short.
            - Do not turn a multi-point message into a single vague sentence.
            - Make it noticeably shorter when possible; if already short, make only \
            a small improvement.

            Length guidance:
            \(lengthGuidance)

            Message:
            \(source)
            """
        }
    }

    private static func generationOptions(for tone: LocalRewriteTone) -> GenerationOptions {
        switch tone {
        case .warm:
            return GenerationOptions(temperature: 0.25, maximumResponseTokens: 240)
        case .direct:
            return GenerationOptions(temperature: 0.2, maximumResponseTokens: 220)
        case .short:
            return GenerationOptions(temperature: 0.2, maximumResponseTokens: 200)
        }
    }

    private static func lengthGuidance(for source: String) -> String {
        let wordCount = source.split { $0.isWhitespace || $0.isNewline }.count

        if wordCount <= 20 {
            return "This is a short input. Do not force extreme shortening or drop nuance."
        } else if wordCount <= 90 {
            return "This is a medium input. Keep all points and improve clarity or concision."
        } else {
            return """
            This is a long input. You may use multiple sentences or paragraphs. \
            Preserve all key points instead of compressing the message into a vague summary.
            """
        }
    }

    private static func cleanOutput(_ rawOutput: String) -> String {
        var output = rawOutput.trimmingCharacters(in: .whitespacesAndNewlines)
        output = removeLeadingPrefix(from: output)
        output = removeWrappingQuotes(from: output)
        output = collapseExcessiveBlankLines(in: output)
        return output.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func removeLeadingPrefix(from text: String) -> String {
        var output = text
        let prefixes = [
            "rewrite:",
            "rewritten:",
            "rewritten message:",
            "output:",
            "message:",
        ]

        for prefix in prefixes {
            let lowered = output.lowercased()
            if lowered.hasPrefix(prefix) {
                output.removeFirst(prefix.count)
                return output.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }

        return output
    }

    private static func removeWrappingQuotes(from text: String) -> String {
        var output = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let quotePairs = [
            ("\"", "\""),
            ("“", "”"),
            ("‘", "’"),
            ("'", "'"),
        ]

        var removedWrappingQuotes = true
        while removedWrappingQuotes {
            removedWrappingQuotes = false
            for quotePair in quotePairs where output.hasPrefix(quotePair.0) && output.hasSuffix(quotePair.1) {
                output.removeFirst(quotePair.0.count)
                output.removeLast(quotePair.1.count)
                output = output.trimmingCharacters(in: .whitespacesAndNewlines)
                removedWrappingQuotes = true
            }
        }

        return output
    }

    private static func collapseExcessiveBlankLines(in text: String) -> String {
        var lines: [String] = []
        var previousLineWasBlank = false

        for line in text.components(separatedBy: .newlines) {
            let isBlank = line.trimmingCharacters(in: .whitespaces).isEmpty
            guard !isBlank || !previousLineWasBlank else { continue }
            lines.append(line.trimmingCharacters(in: .whitespaces))
            previousLineWasBlank = isBlank
        }

        return lines.joined(separator: "\n")
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
