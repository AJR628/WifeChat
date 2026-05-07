//
//  KeyboardViewController.swift
//  WifeChatKeyboard
//
//  Created by AJ Rhea on 5/3/26.
//

import UIKit

class KeyboardViewController: UIInputViewController, UITextViewDelegate {

    private enum Tone {
        case warm
        case direct
        case short
    }

    private enum Mode {
        case draft
        case generated
    }

    private struct AutocorrectEvent {
        let beforeText: String
        let afterText: String
        let originalWord: String
        let correctedWord: String
        let separator: String
    }

    private let titleLabel = UILabel()
    private let modeLabel = UILabel()
    private let privacyLabel = UILabel()
    private let messageTextView = UITextView()
    private let undoButton = UIButton(type: .system)
    private let toneControl = UISegmentedControl(items: ["Warm", "Direct", "Short"])
    private let primaryActionButton = UIButton(type: .system)
    private let nextKeyboardButton = UIButton(type: .system)
    private let shiftButton = UIButton(type: .system)
    private let keyFeedback = UIImpactFeedbackGenerator(style: .light)
    private let actionFeedback = UIImpactFeedbackGenerator(style: .medium)
    private let textChecker = UITextChecker()

    private var letterButtons: [(button: UIButton, letter: String)] = []
    private var allKeyButtons: [UIButton] = []
    private var isSyncingTextView = false
    private var keyPreviewView: UIView?
    private let keyPreviewLabel = UILabel()
    private var lexiconReplacements: [String: String] = [:]
    private var lexiconKnownWords: Set<String> = []
    private var lastAutocorrectEvent: AutocorrectEvent?

    private var currentText = ""
    private var originalDraftBeforeGeneration: String?
    private var selectedTone: Tone = .warm
    private var mode: Mode = .draft
    private var isShiftEnabled = true
    private var isGenerating = false

    // Local keyboard generation path:
    // - no host app thread/content reading
    // - no auto-send behavior
    // - no live keylogging or network calls while typing
    // - no direct OpenAI calls, backend secrets, or passcodes in the extension
    // - no persistence of draft text
    // - generation only after the user taps Generate
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        configureViews()
        layoutViews()
        prepareFeedbackGenerators()
        configureKeyPreview()
        loadSupplementaryLexicon()
        updateControls()
        applyCurrentAppearance()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        applyCurrentAppearance()
    }

    private func configureViews() {
        titleLabel.text = "WifeChat"
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.adjustsFontForContentSizeCategory = true

        modeLabel.font = .preferredFont(forTextStyle: .caption1)
        modeLabel.adjustsFontForContentSizeCategory = true
        modeLabel.textAlignment = .right

        privacyLabel.text = "Only text you type here is used."
        privacyLabel.font = .preferredFont(forTextStyle: .caption1)
        privacyLabel.adjustsFontForContentSizeCategory = true
        privacyLabel.numberOfLines = 0

        messageTextView.delegate = self
        messageTextView.font = .preferredFont(forTextStyle: .body)
        messageTextView.adjustsFontForContentSizeCategory = true
        messageTextView.layer.cornerRadius = 10
        messageTextView.layer.borderWidth = 1
        messageTextView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 36)
        messageTextView.accessibilityLabel = "WifeChat message"
        messageTextView.autocorrectionType = .no
        messageTextView.spellCheckingType = .no
        messageTextView.text = currentText

        if let undoImage = UIImage(systemName: "arrow.uturn.backward") {
            undoButton.setImage(undoImage, for: .normal)
        } else {
            undoButton.setTitle("Undo", for: .normal)
        }
        undoButton.accessibilityLabel = "Restore original draft"
        undoButton.isHidden = true
        undoButton.addTarget(self, action: #selector(restoreOriginalDraft), for: .touchUpInside)

        toneControl.selectedSegmentIndex = 0
        toneControl.accessibilityLabel = "Tone"
        toneControl.addTarget(self, action: #selector(toneChanged), for: .valueChanged)

        primaryActionButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        primaryActionButton.titleLabel?.adjustsFontForContentSizeCategory = true
        primaryActionButton.layer.cornerRadius = 9
        primaryActionButton.addTarget(self, action: #selector(handlePrimaryAction), for: .touchUpInside)

        if let globeImage = UIImage(systemName: "globe") {
            configureKeyButton(nextKeyboardButton, accessibilityLabel: "Next keyboard")
            nextKeyboardButton.setImage(globeImage, for: .normal)
        } else {
            configureKeyButton(nextKeyboardButton, title: "Globe", accessibilityLabel: "Next keyboard")
            nextKeyboardButton.setTitle("Globe", for: .normal)
        }
        nextKeyboardButton.addTarget(self, action: #selector(goToNextKeyboard), for: .touchUpInside)

        if let shiftImage = UIImage(systemName: "shift") {
            configureKeyButton(shiftButton, accessibilityLabel: "Shift")
            shiftButton.setImage(shiftImage, for: .normal)
        } else {
            configureKeyButton(shiftButton, title: "Shift", accessibilityLabel: "Shift")
            shiftButton.setTitle("Shift", for: .normal)
        }
        shiftButton.addTarget(self, action: #selector(toggleShift), for: .touchUpInside)

        updateTextViewFromState()
        updateControls()
        applyCurrentAppearance()
    }

    private func layoutViews() {
        let headerRow = UIStackView(arrangedSubviews: [titleLabel, modeLabel])
        headerRow.axis = .horizontal
        headerRow.alignment = .firstBaseline
        headerRow.spacing = 8

        let messageContainer = UIView()
        messageContainer.addSubview(messageTextView)
        messageContainer.addSubview(undoButton)
        messageTextView.translatesAutoresizingMaskIntoConstraints = false
        undoButton.translatesAutoresizingMaskIntoConstraints = false

        let toneActionRow = UIStackView(arrangedSubviews: [toneControl, primaryActionButton])
        toneActionRow.axis = .horizontal
        toneActionRow.alignment = .fill
        toneActionRow.distribution = .fill
        toneActionRow.spacing = 8

        let assistantStack = UIStackView(arrangedSubviews: [
            headerRow,
            privacyLabel,
            messageContainer,
            toneActionRow,
        ])
        assistantStack.axis = .vertical
        assistantStack.spacing = 5

        let keyboardStack = UIStackView(arrangedSubviews: [
            makeLetterRow(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"]),
            makeLetterRow(["A", "S", "D", "F", "G", "H", "J", "K", "L"]),
            makeThirdRow(),
            makeUtilityRow(),
        ])
        keyboardStack.axis = .vertical
        keyboardStack.spacing = 7

        let rootStack = UIStackView(arrangedSubviews: [
            assistantStack,
            keyboardStack,
        ])
        rootStack.axis = .vertical
        rootStack.spacing = 8
        rootStack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(rootStack)

        let heightConstraint = view.heightAnchor.constraint(greaterThanOrEqualToConstant: 408)
        heightConstraint.priority = .required

        NSLayoutConstraint.activate([
            heightConstraint,
            rootStack.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            rootStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6),
            rootStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6),
            rootStack.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -8),

            messageContainer.heightAnchor.constraint(equalToConstant: 90),
            messageTextView.topAnchor.constraint(equalTo: messageContainer.topAnchor),
            messageTextView.leadingAnchor.constraint(equalTo: messageContainer.leadingAnchor),
            messageTextView.trailingAnchor.constraint(equalTo: messageContainer.trailingAnchor),
            messageTextView.bottomAnchor.constraint(equalTo: messageContainer.bottomAnchor),
            undoButton.topAnchor.constraint(equalTo: messageContainer.topAnchor, constant: 4),
            undoButton.trailingAnchor.constraint(equalTo: messageContainer.trailingAnchor, constant: -4),
            undoButton.widthAnchor.constraint(equalToConstant: 32),
            undoButton.heightAnchor.constraint(equalToConstant: 32),

            toneActionRow.heightAnchor.constraint(equalToConstant: 42),
            primaryActionButton.widthAnchor.constraint(equalToConstant: 112),
        ])
    }

    private func makeLetterRow(_ letters: [String]) -> UIStackView {
        let buttons = letters.map { makeLetterButton(letter: $0) }
        return makeKeyboardRow(buttons)
    }

    private func makeThirdRow() -> UIStackView {
        let deleteButton = makeKeyButton(accessibilityLabel: "Delete character")
        if let deleteImage = UIImage(systemName: "delete.left") {
            deleteButton.setImage(deleteImage, for: .normal)
        } else {
            deleteButton.setTitle("Del", for: .normal)
        }
        deleteButton.addTarget(self, action: #selector(deleteCharacter), for: .touchUpInside)

        var buttons = [shiftButton]
        buttons.append(contentsOf: ["Z", "X", "C", "V", "B", "N", "M"].map { makeLetterButton(letter: $0) })
        buttons.append(deleteButton)

        return makeKeyboardRow(buttons)
    }

    private func makeUtilityRow() -> UIStackView {
        let numbersButton = makeKeyButton(title: "123", accessibilityLabel: "Numbers keyboard placeholder")
        numbersButton.isEnabled = false

        let spaceButton = makeKeyButton(title: "Space", accessibilityLabel: "Space")
        spaceButton.addTarget(self, action: #selector(insertSpace), for: .touchUpInside)

        let returnButton = makeKeyButton(title: "Return", accessibilityLabel: "Return")
        returnButton.addTarget(self, action: #selector(insertReturn), for: .touchUpInside)

        let row = makeKeyboardRow(
            [nextKeyboardButton, numbersButton, spaceButton, returnButton],
            distribution: .fill
        )
        nextKeyboardButton.widthAnchor.constraint(equalToConstant: 52).isActive = true
        numbersButton.widthAnchor.constraint(equalToConstant: 52).isActive = true
        spaceButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 144).isActive = true
        returnButton.widthAnchor.constraint(equalToConstant: 84).isActive = true
        return row
    }

    private func makeKeyboardRow(
        _ buttons: [UIButton],
        distribution: UIStackView.Distribution = .fillEqually
    ) -> UIStackView {
        let row = UIStackView(arrangedSubviews: buttons)
        row.axis = .horizontal
        row.alignment = .fill
        row.distribution = distribution
        row.spacing = 5

        buttons.forEach { button in
            button.heightAnchor.constraint(equalToConstant: 49).isActive = true
        }

        return row
    }

    private func makeLetterButton(letter: String) -> UIButton {
        let button = makeKeyButton(title: letter, accessibilityLabel: letter)
        button.addAction(UIAction { [weak self, weak button] _ in
            guard let self, let button else { return }
            self.showKeyPreview(for: button, text: self.displayedLetter(for: letter))
        }, for: .touchDown)
        button.addAction(UIAction { [weak self] _ in
            self?.insertLetter(letter)
        }, for: .touchUpInside)
        let hideAction = UIAction { [weak self] _ in
            self?.hideKeyPreview()
        }
        button.addAction(hideAction, for: .touchUpOutside)
        button.addAction(hideAction, for: .touchCancel)
        button.addAction(hideAction, for: .touchDragExit)
        letterButtons.append((button, letter))
        return button
    }

    private func makeKeyButton(title: String? = nil, accessibilityLabel: String) -> UIButton {
        let button = UIButton(type: .system)
        configureKeyButton(button, title: title, accessibilityLabel: accessibilityLabel)
        return button
    }

    private func configureKeyButton(
        _ button: UIButton,
        title: String? = nil,
        accessibilityLabel: String
    ) {
        button.setTitle(title, for: .normal)
        button.accessibilityLabel = accessibilityLabel
        button.titleLabel?.font = .preferredFont(forTextStyle: .body)
        button.titleLabel?.adjustsFontForContentSizeCategory = true
        button.titleLabel?.minimumScaleFactor = 0.75
        button.titleLabel?.lineBreakMode = .byTruncatingTail
        button.layer.cornerRadius = 6
        allKeyButtons.append(button)
    }

    private func prepareFeedbackGenerators() {
        keyFeedback.prepare()
        actionFeedback.prepare()
    }

    private func playKeyFeedback() {
        keyFeedback.impactOccurred(intensity: 0.35)
        keyFeedback.prepare()
    }

    private func playActionFeedback() {
        actionFeedback.impactOccurred(intensity: 0.55)
        actionFeedback.prepare()
    }

    // MARK: - Key preview

    private func configureKeyPreview() {
        keyPreviewLabel.textAlignment = .center
        keyPreviewLabel.font = .systemFont(ofSize: 31, weight: .regular)
        keyPreviewLabel.textColor = .label

        let previewView = UIView()
        previewView.backgroundColor = .secondarySystemBackground
        previewView.layer.cornerRadius = 9
        previewView.layer.borderWidth = 1
        previewView.layer.borderColor = UIColor.separator.cgColor
        previewView.layer.shadowColor = UIColor.black.cgColor
        previewView.layer.shadowOpacity = 0.15
        previewView.layer.shadowRadius = 4
        previewView.layer.shadowOffset = CGSize(width: 0, height: 2)
        previewView.isHidden = true
        previewView.isUserInteractionEnabled = false
        previewView.addSubview(keyPreviewLabel)

        keyPreviewLabel.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            keyPreviewLabel.leadingAnchor.constraint(equalTo: previewView.leadingAnchor),
            keyPreviewLabel.trailingAnchor.constraint(equalTo: previewView.trailingAnchor),
            keyPreviewLabel.topAnchor.constraint(equalTo: previewView.topAnchor),
            keyPreviewLabel.bottomAnchor.constraint(equalTo: previewView.bottomAnchor),
        ])

        view.addSubview(previewView)
        keyPreviewView = previewView
    }

    private func showKeyPreview(for button: UIButton, text: String) {
        guard let keyPreviewView else { return }

        keyPreviewLabel.text = text
        keyPreviewLabel.textColor = button.titleColor(for: .normal) ?? .label
        keyPreviewView.backgroundColor = button.backgroundColor ?? .secondarySystemBackground
        keyPreviewView.layer.borderColor = UIColor.separator.cgColor

        let buttonFrame = button.convert(button.bounds, to: view)
        let previewWidth: CGFloat = 46
        let previewHeight: CGFloat = 58
        let horizontalPadding: CGFloat = 4
        let verticalOffset: CGFloat = 8
        let proposedX = buttonFrame.midX - (previewWidth / 2)
        let minX = horizontalPadding
        let maxX = max(minX, view.bounds.width - previewWidth - horizontalPadding)
        let xPosition = min(max(proposedX, minX), maxX)
        let yPosition = max(0, buttonFrame.minY - previewHeight - verticalOffset)

        keyPreviewView.frame = CGRect(
            x: xPosition,
            y: yPosition,
            width: previewWidth,
            height: previewHeight
        )
        keyPreviewView.isHidden = false
        view.bringSubviewToFront(keyPreviewView)
    }

    private func hideKeyPreview() {
        keyPreviewView?.isHidden = true
    }

    private func displayedLetter(for letter: String) -> String {
        isShiftEnabled ? letter.uppercased() : letter.lowercased()
    }

    // MARK: - Appearance and state

    private func applyCurrentAppearance() {
        let isDark = textDocumentProxy.keyboardAppearance == .dark
        let textColor: UIColor = isDark ? .white : .label
        let secondaryTextColor: UIColor = isDark ? .lightGray : .secondaryLabel
        let backgroundColor: UIColor = isDark ? .black : .systemBackground
        let fieldBackgroundColor: UIColor = isDark ? .darkGray : .secondarySystemBackground
        let keyBackgroundColor: UIColor = isDark ? .darkGray : .tertiarySystemBackground

        view.backgroundColor = backgroundColor
        titleLabel.textColor = textColor
        modeLabel.textColor = secondaryTextColor
        privacyLabel.textColor = secondaryTextColor
        messageTextView.textColor = textColor
        messageTextView.backgroundColor = fieldBackgroundColor
        messageTextView.layer.borderColor = UIColor.separator.cgColor
        nextKeyboardButton.setTitleColor(textColor, for: .normal)
        undoButton.tintColor = secondaryTextColor

        allKeyButtons.forEach { button in
            button.backgroundColor = keyBackgroundColor
            button.tintColor = textColor
            button.setTitleColor(textColor, for: .normal)
            button.setTitleColor(.secondaryLabel, for: .disabled)
        }

        keyPreviewLabel.textColor = textColor
        keyPreviewView?.backgroundColor = keyBackgroundColor
        keyPreviewView?.layer.borderColor = UIColor.separator.cgColor

        updatePrimaryActionAppearance()
        updateShiftState()
    }

    private func updateControls() {
        let hasText = !currentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let canUndoAutocorrect = mode == .draft
            && lastAutocorrectEvent?.afterText == currentText

        modeLabel.text = isGenerating ? "Generating" : mode == .generated ? "Ready" : "Draft"
        undoButton.isHidden = (mode != .generated || originalDraftBeforeGeneration == nil) && !canUndoAutocorrect
        toneControl.isEnabled = mode == .draft && !isGenerating
        primaryActionButton.isEnabled = hasText && !isGenerating

        switch mode {
        case .draft:
            primaryActionButton.setTitle(isGenerating ? "Working" : "Generate", for: .normal)
            primaryActionButton.accessibilityLabel = "Generate local preview"
        case .generated:
            primaryActionButton.setTitle("Insert", for: .normal)
            primaryActionButton.accessibilityLabel = "Insert message into current app"
        }

        updateShiftState()
        updatePrimaryActionAppearance()
    }

    private func updatePrimaryActionAppearance() {
        let enabled = primaryActionButton.isEnabled
        primaryActionButton.backgroundColor = enabled ? .systemBlue : .tertiarySystemFill
        primaryActionButton.tintColor = enabled ? .white : .secondaryLabel
        primaryActionButton.setTitleColor(enabled ? .white : .secondaryLabel, for: .normal)
    }

    private func updateShiftState() {
        letterButtons.forEach { button, letter in
            let title = isShiftEnabled ? letter.uppercased() : letter.lowercased()
            button.setTitle(title, for: .normal)
            button.accessibilityLabel = title
        }

        shiftButton.backgroundColor = isShiftEnabled ? .systemBlue : .tertiarySystemBackground
        shiftButton.tintColor = isShiftEnabled ? .white : .label
    }

    private func updateTextViewFromState() {
        isSyncingTextView = true
        messageTextView.text = currentText
        isSyncingTextView = false
    }

    private func setCurrentText(_ text: String) {
        currentText = text
        updateTextViewFromState()
        updateControls()
    }

    func textViewDidChange(_ textView: UITextView) {
        guard !isSyncingTextView else { return }
        clearLastAutocorrectEvent()
        currentText = textView.text ?? ""
        updateControls()
    }

    private func insertLetter(_ letter: String) {
        clearLastAutocorrectEvent()
        hideKeyPreview()
        playKeyFeedback()
        let nextLetter = isShiftEnabled ? letter.uppercased() : letter.lowercased()
        setCurrentText(currentText + nextLetter)
        if isShiftEnabled {
            isShiftEnabled = false
            updateControls()
        }
    }

    @objc private func insertSpace() {
        playKeyFeedback()
        setCurrentText(autocorrectedTextBeforeAdding(separator: " "))
    }

    @objc private func insertReturn() {
        playKeyFeedback()
        setCurrentText(autocorrectedTextBeforeAdding(separator: "\n"))
    }

    @objc private func deleteCharacter() {
        guard !currentText.isEmpty else { return }
        playKeyFeedback()

        if let lastAutocorrectEvent, currentText == lastAutocorrectEvent.afterText {
            clearLastAutocorrectEvent()
            setCurrentText(lastAutocorrectEvent.beforeText)
            return
        }

        clearLastAutocorrectEvent()
        currentText.removeLast()
        setCurrentText(currentText)
    }

    @objc private func toggleShift() {
        playKeyFeedback()
        isShiftEnabled.toggle()
        updateControls()
    }

    @objc private func toneChanged() {
        playKeyFeedback()
        switch toneControl.selectedSegmentIndex {
        case 1:
            selectedTone = .direct
        case 2:
            selectedTone = .short
        default:
            selectedTone = .warm
        }
    }

    @objc private func handlePrimaryAction() {
        playActionFeedback()
        switch mode {
        case .draft:
            generateLocalPreview()
        case .generated:
            insertCurrentMessage()
        }
    }

    private func generateLocalPreview() {
        let source = currentText
        guard !source.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        clearLastAutocorrectEvent()
        isGenerating = true
        updateControls()

        Task { @MainActor in
            let generatedText = await LocalFoundationModelRewriteService.rewrite(
                source: source,
                tone: localRewriteTone(for: selectedTone)
            ) ?? mockGenerateLocalPreview(for: selectedTone, source: source)

            isGenerating = false
            guard mode == .draft, currentText == source else {
                updateControls()
                return
            }

            originalDraftBeforeGeneration = source
            mode = .generated
            clearLastAutocorrectEvent()
            setCurrentText(generatedText)
        }
    }

    @objc private func restoreOriginalDraft() {
        playActionFeedback()

        if let originalDraft = originalDraftBeforeGeneration {
            clearLastAutocorrectEvent()
            originalDraftBeforeGeneration = nil
            mode = .draft
            setCurrentText(originalDraft)
            return
        }

        guard let lastAutocorrectEvent, currentText == lastAutocorrectEvent.afterText else { return }
        clearLastAutocorrectEvent()
        setCurrentText(lastAutocorrectEvent.beforeText)
    }

    private func insertCurrentMessage() {
        guard !currentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        clearLastAutocorrectEvent()
        textDocumentProxy.insertText(currentText)
    }

    @objc private func goToNextKeyboard() {
        playKeyFeedback()
        advanceToNextInputMode()
    }

    private func mockGenerateLocalPreview(for tone: Tone, source: String) -> String {
        let trimmedSource = source.trimmingCharacters(in: .whitespacesAndNewlines)

        // Temporary local UX scaffold only. No network, provider, logging, or storage.
        switch tone {
        case .warm:
            return "I want to say this gently: \(trimmedSource)"
        case .direct:
            return "I want to be clear and respectful: \(trimmedSource)"
        case .short:
            return "Can we talk about this calmly? \(trimmedSource)"
        }
    }

    // MARK: - Autocorrect

    private func loadSupplementaryLexicon() {
        requestSupplementaryLexicon { [weak self] lexicon in
            var replacements: [String: String] = [:]
            var knownWords = Set<String>()

            lexicon.entries.forEach { entry in
                let userInput = entry.userInput.trimmingCharacters(in: .whitespacesAndNewlines)
                let documentText = entry.documentText.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !userInput.isEmpty, !documentText.isEmpty else { return }

                let userInputKey = userInput.lowercased()
                knownWords.insert(userInputKey)
                knownWords.insert(documentText.lowercased())

                if userInputKey != documentText.lowercased() {
                    replacements[userInputKey] = documentText
                }
            }

            self?.lexiconReplacements = replacements
            self?.lexiconKnownWords = knownWords
        }
    }

    private func autocorrectedTextBeforeAdding(separator: String) -> String {
        let textBeforeSeparator = currentText
        let textWithOriginalSeparator = textBeforeSeparator + separator

        guard let wordRange = lastWordRange(in: textBeforeSeparator) else {
            clearLastAutocorrectEvent()
            return textWithOriginalSeparator
        }

        let originalWord = String(textBeforeSeparator[wordRange])
        guard let correctedWord = correctionCandidate(for: originalWord) else {
            clearLastAutocorrectEvent()
            return textWithOriginalSeparator
        }

        let correctedText = String(textBeforeSeparator[..<wordRange.lowerBound])
            + correctedWord
            + String(textBeforeSeparator[wordRange.upperBound...])
            + separator

        guard correctedText != textWithOriginalSeparator else {
            clearLastAutocorrectEvent()
            return textWithOriginalSeparator
        }

        lastAutocorrectEvent = AutocorrectEvent(
            beforeText: textWithOriginalSeparator,
            afterText: correctedText,
            originalWord: originalWord,
            correctedWord: correctedWord,
            separator: separator
        )
        return correctedText
    }

    private func lastWordRange(in text: String) -> Range<String.Index>? {
        guard let lastCharacter = text.last, lastCharacter.isLetter || lastCharacter == "'" else {
            return nil
        }

        var startIndex = text.endIndex
        while startIndex > text.startIndex {
            let previousIndex = text.index(before: startIndex)
            let character = text[previousIndex]
            guard character.isLetter || character == "'" else { break }
            startIndex = previousIndex
        }

        guard startIndex < text.endIndex else { return nil }
        return startIndex..<text.endIndex
    }

    private func correctionCandidate(for word: String) -> String? {
        let lowercasedWord = word.lowercased()

        if let fallbackCorrection = deterministicCorrection(for: lowercasedWord) {
            return preserveCapitalization(original: word, candidate: fallbackCorrection)
        }

        if let lexiconReplacement = lexiconReplacements[lowercasedWord],
           isAcceptableReplacement(lexiconReplacement, for: word) {
            return preserveCapitalization(original: word, candidate: lexiconReplacement)
        }

        guard shouldAttemptTextCheckerCorrection(for: word) else { return nil }

        let language = textCheckerLanguage()
        let nsWord = word as NSString
        let fullRange = NSRange(location: 0, length: nsWord.length)
        let misspelledRange = textChecker.rangeOfMisspelledWord(
            in: word,
            range: fullRange,
            startingAt: 0,
            wrap: false,
            language: language
        )

        guard misspelledRange.location != NSNotFound,
              let guesses = textChecker.guesses(forWordRange: misspelledRange, in: word, language: language),
              let firstGuess = guesses.first,
              isAcceptableReplacement(firstGuess, for: word) else {
            return nil
        }

        return preserveCapitalization(original: word, candidate: firstGuess)
    }

    private func deterministicCorrection(for lowercasedWord: String) -> String? {
        [
            "teh": "the",
            "dont": "don't",
            "im": "I'm",
            "ive": "I've",
            "doesnt": "doesn't",
            "didnt": "didn't",
            "wont": "won't",
            "cant": "can't",
            "youre": "you're",
            "thats": "that's",
            "i": "I",
        ][lowercasedWord]
    }

    private func shouldAttemptTextCheckerCorrection(for word: String) -> Bool {
        let lowercasedWord = word.lowercased()
        guard word == lowercasedWord else { return false }
        guard word.count >= 3 else { return false }
        guard !lexiconKnownWords.contains(lowercasedWord) else { return false }
        return isPlainAlphabeticWord(word)
    }

    private func isAcceptableReplacement(_ candidate: String, for originalWord: String) -> Bool {
        let trimmedCandidate = candidate.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedCandidate.isEmpty else { return false }
        guard trimmedCandidate == candidate else { return false }
        guard trimmedCandidate.lowercased() != originalWord.lowercased() else { return false }
        guard !trimmedCandidate.contains(where: { $0.isWhitespace }) else { return false }
        guard !looksLikePhraseOrStrangePunctuation(trimmedCandidate) else { return false }
        guard trimmedCandidate.count <= originalWord.count + 4 else { return false }

        let maximumEditDistance = max(2, originalWord.count / 3)
        return editDistance(
            between: originalWord.lowercased(),
            and: trimmedCandidate.lowercased()
        ) <= maximumEditDistance
    }

    private func looksLikePhraseOrStrangePunctuation(_ text: String) -> Bool {
        let apostrophe: UnicodeScalar = "'"
        let hyphen: UnicodeScalar = "-"

        return text.unicodeScalars.contains { scalar in
            !CharacterSet.letters.contains(scalar)
                && scalar != apostrophe
                && scalar != hyphen
        }
    }

    private func isPlainAlphabeticWord(_ word: String) -> Bool {
        word.unicodeScalars.allSatisfy { CharacterSet.letters.contains($0) }
    }

    private func preserveCapitalization(original: String, candidate: String) -> String {
        guard let firstOriginal = original.first else { return candidate }
        guard firstOriginal.isUppercase else { return candidate }
        guard original.dropFirst().allSatisfy({ $0.isLowercase }) else { return candidate }
        return candidate.prefix(1).uppercased() + candidate.dropFirst()
    }

    private func textCheckerLanguage() -> String {
        UITextChecker.availableLanguages.first { language in
            language == "en_US" || language == "en-US"
        } ?? UITextChecker.availableLanguages.first { language in
            language.hasPrefix("en")
        } ?? "en_US"
    }

    private func editDistance(between lhs: String, and rhs: String) -> Int {
        let lhsCharacters = Array(lhs)
        let rhsCharacters = Array(rhs)
        var previousRow = Array(0...rhsCharacters.count)

        for lhsIndex in 1...lhsCharacters.count {
            var currentRow = [lhsIndex]

            for rhsIndex in 1...rhsCharacters.count {
                let substitutionCost = lhsCharacters[lhsIndex - 1] == rhsCharacters[rhsIndex - 1] ? 0 : 1
                currentRow.append(min(
                    previousRow[rhsIndex] + 1,
                    currentRow[rhsIndex - 1] + 1,
                    previousRow[rhsIndex - 1] + substitutionCost
                ))
            }

            previousRow = currentRow
        }

        return previousRow.last ?? 0
    }

    private func clearLastAutocorrectEvent() {
        lastAutocorrectEvent = nil
    }

    private func localRewriteTone(for tone: Tone) -> LocalRewriteTone {
        switch tone {
        case .warm:
            return .warm
        case .direct:
            return .direct
        case .short:
            return .short
        }
    }

}
