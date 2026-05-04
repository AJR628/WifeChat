//
//  KeyboardViewController.swift
//  WifeChatKeyboard
//
//  Created by AJ Rhea on 5/3/26.
//

import UIKit

class KeyboardViewController: UIInputViewController {

    private let titleLabel = UILabel()
    private let privacyLabel = UILabel()
    private let draftTextView = UITextView()
    private let toneControl = UISegmentedControl(items: ["Warm", "Direct", "Short"])
    private let generateButton = UIButton(type: .system)
    private let insertButton = UIButton(type: .system)
    private let nextKeyboardButton = UIButton(type: .system)

    // Phase 1 static scaffold only:
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
    }

    override func viewWillLayoutSubviews() {
        nextKeyboardButton.isHidden = !needsInputModeSwitchKey
        super.viewWillLayoutSubviews()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        applyCurrentAppearance()
    }

    private func configureViews() {
        titleLabel.text = "WifeChat"
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        titleLabel.adjustsFontForContentSizeCategory = true

        privacyLabel.text = "Only text you type here is used."
        privacyLabel.font = .preferredFont(forTextStyle: .caption1)
        privacyLabel.adjustsFontForContentSizeCategory = true
        privacyLabel.numberOfLines = 0

        draftTextView.font = .preferredFont(forTextStyle: .body)
        draftTextView.layer.cornerRadius = 10
        draftTextView.layer.borderWidth = 1
        draftTextView.textContainerInset = UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8)
        draftTextView.accessibilityLabel = "Draft"

        toneControl.selectedSegmentIndex = 0

        generateButton.setTitle("Generate", for: .normal)
        generateButton.isEnabled = false

        insertButton.setTitle("Insert", for: .normal)
        insertButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        insertButton.addTarget(self, action: #selector(insertStaticText), for: .touchUpInside)

        nextKeyboardButton.setTitle("Next Keyboard", for: .normal)
        nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)

        applyCurrentAppearance()
    }

    private func layoutViews() {
        let headerStack = UIStackView(arrangedSubviews: [titleLabel, privacyLabel])
        headerStack.axis = .vertical
        headerStack.spacing = 2

        let buttonStack = UIStackView(arrangedSubviews: [generateButton, insertButton])
        buttonStack.axis = .horizontal
        buttonStack.distribution = .fillEqually
        buttonStack.spacing = 10

        let rootStack = UIStackView(arrangedSubviews: [
            headerStack,
            draftTextView,
            toneControl,
            buttonStack,
            nextKeyboardButton,
        ])
        rootStack.axis = .vertical
        rootStack.spacing = 10
        rootStack.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(rootStack)

        NSLayoutConstraint.activate([
            view.heightAnchor.constraint(greaterThanOrEqualToConstant: 300),
            rootStack.topAnchor.constraint(equalTo: view.topAnchor, constant: 12),
            rootStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            rootStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12),
            rootStack.bottomAnchor.constraint(lessThanOrEqualTo: view.bottomAnchor, constant: -8),
            draftTextView.heightAnchor.constraint(equalToConstant: 96),
        ])
    }

    private func applyCurrentAppearance() {
        let isDark = textDocumentProxy.keyboardAppearance == .dark
        let textColor: UIColor = isDark ? .white : .label
        let secondaryTextColor: UIColor = isDark ? .lightGray : .secondaryLabel
        let backgroundColor: UIColor = isDark ? .black : .systemBackground
        let fieldBackgroundColor: UIColor = isDark ? .darkGray : .secondarySystemBackground

        view.backgroundColor = backgroundColor
        titleLabel.textColor = textColor
        privacyLabel.textColor = secondaryTextColor
        draftTextView.textColor = textColor
        draftTextView.backgroundColor = fieldBackgroundColor
        draftTextView.layer.borderColor = UIColor.separator.cgColor
        nextKeyboardButton.setTitleColor(textColor, for: .normal)
    }

    @objc private func insertStaticText() {
        let staticText: String
        switch toneControl.selectedSegmentIndex {
        case 1:
            staticText = "I want to say this clearly and respectfully."
        case 2:
            staticText = "I care about this and want to talk it through."
        default:
            staticText = "I want to say this kindly and clearly."
        }

        textDocumentProxy.insertText(staticText)
    }

}
