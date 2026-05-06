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

    private let titleLabel = UILabel()
    private let modeLabel = UILabel()
    private let privacyLabel = UILabel()
    private let messageTextView = UITextView()
    private let undoButton = UIButton(type: .system)
    private let toneControl = UISegmentedControl(items: ["Warm", "Direct", "Short"])
    private let primaryActionButton = UIButton(type: .system)
    private let nextKeyboardButton = UIButton(type: .system)
    private let shiftButton = UIButton(type: .system)

    private var letterButtons: [(button: UIButton, letter: String)] = []
    private var allKeyButtons: [UIButton] = []
    private var isSyncingTextView = false

    private var currentText = ""
    private var originalDraftBeforeGeneration: String?
    private var selectedTone: Tone = .warm
    private var mode: Mode = .draft
    private var isShiftEnabled = true

    // Static keyboard UX scaffold only:
    // - no host app thread/content reading
    // - no auto-send behavior
    // - no live keylogging or network calls while typing
    // - no direct OpenAI calls, backend secrets, or passcodes in the extension
    // - no persistence of draft text
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        configureViews()
        layoutViews()
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
        keyboardStack.spacing = 6

        let rootStack = UIStackView(arrangedSubviews: [
            assistantStack,
            keyboardStack,
        ])
        rootStack.axis = .vertical
        rootStack.spacing = 8
        rootStack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(rootStack)

        let heightConstraint = view.heightAnchor.constraint(greaterThanOrEqualToConstant: 372)
        heightConstraint.priority = .required

        NSLayoutConstraint.activate([
            heightConstraint,
            rootStack.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            rootStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6),
            rootStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6),
            rootStack.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -8),

            messageContainer.heightAnchor.constraint(equalToConstant: 82),
            messageTextView.topAnchor.constraint(equalTo: messageContainer.topAnchor),
            messageTextView.leadingAnchor.constraint(equalTo: messageContainer.leadingAnchor),
            messageTextView.trailingAnchor.constraint(equalTo: messageContainer.trailingAnchor),
            messageTextView.bottomAnchor.constraint(equalTo: messageContainer.bottomAnchor),
            undoButton.topAnchor.constraint(equalTo: messageContainer.topAnchor, constant: 4),
            undoButton.trailingAnchor.constraint(equalTo: messageContainer.trailingAnchor, constant: -4),
            undoButton.widthAnchor.constraint(equalToConstant: 32),
            undoButton.heightAnchor.constraint(equalToConstant: 32),

            toneActionRow.heightAnchor.constraint(equalToConstant: 40),
            primaryActionButton.widthAnchor.constraint(equalToConstant: 104),
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
        nextKeyboardButton.widthAnchor.constraint(equalToConstant: 48).isActive = true
        numbersButton.widthAnchor.constraint(equalToConstant: 48).isActive = true
        spaceButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 132).isActive = true
        returnButton.widthAnchor.constraint(equalToConstant: 76).isActive = true
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
        row.spacing = 4

        buttons.forEach { button in
            button.heightAnchor.constraint(equalToConstant: 44).isActive = true
        }

        return row
    }

    private func makeLetterButton(letter: String) -> UIButton {
        let button = makeKeyButton(title: letter, accessibilityLabel: letter)
        button.addAction(UIAction { [weak self] _ in
            self?.insertLetter(letter)
        }, for: .touchUpInside)
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

        updatePrimaryActionAppearance()
        updateShiftState()
    }

    private func updateControls() {
        let hasText = !currentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty

        modeLabel.text = mode == .generated ? "Ready" : "Draft"
        undoButton.isHidden = mode != .generated || originalDraftBeforeGeneration == nil
        toneControl.isEnabled = mode == .draft
        primaryActionButton.isEnabled = hasText

        switch mode {
        case .draft:
            primaryActionButton.setTitle("Generate", for: .normal)
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
        currentText = textView.text ?? ""
        updateControls()
    }

    private func insertLetter(_ letter: String) {
        let nextLetter = isShiftEnabled ? letter.uppercased() : letter.lowercased()
        setCurrentText(currentText + nextLetter)
        if isShiftEnabled {
            isShiftEnabled = false
            updateControls()
        }
    }

    @objc private func insertSpace() {
        setCurrentText(currentText + " ")
    }

    @objc private func insertReturn() {
        setCurrentText(currentText + "\n")
    }

    @objc private func deleteCharacter() {
        guard !currentText.isEmpty else { return }
        currentText.removeLast()
        setCurrentText(currentText)
    }

    @objc private func toggleShift() {
        isShiftEnabled.toggle()
        updateControls()
    }

    @objc private func toneChanged() {
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
        switch mode {
        case .draft:
            generateLocalPreview()
        case .generated:
            insertCurrentMessage()
        }
    }

    private func generateLocalPreview() {
        guard !currentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        originalDraftBeforeGeneration = currentText
        mode = .generated
        setCurrentText(mockGenerateLocalPreview(for: selectedTone, source: currentText))
    }

    @objc private func restoreOriginalDraft() {
        guard let originalDraft = originalDraftBeforeGeneration else { return }

        originalDraftBeforeGeneration = nil
        mode = .draft
        setCurrentText(originalDraft)
    }

    private func insertCurrentMessage() {
        guard !currentText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        textDocumentProxy.insertText(currentText)
    }

    @objc private func goToNextKeyboard() {
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

}
