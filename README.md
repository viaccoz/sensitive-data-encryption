# Sensitive Data Encryption

A secure, client-side web application designed to automatically detect and encrypt sensitive information within text. This tool is ideal for sanitizing data before using it with online tools like translators or AI, ensuring that personally identifiable information (PII) and other sensitive terms are protected.

## Features

- Automatic Detection: Leverages [Compromise.js](https://github.com/spencermountain/compromise) for Natural Language Processing (NLP) to automatically identify sensitive entities such as:
  - People's names
  - Locations
  - Organizations
  - Dates, Emails, Phone Numbers, and URLs
- Multi-Language Support: Currently supports English, French, and German for entity detection.
- Encryption: Uses AES Encryption (via [CryptoJS](https://github.com/brix/crypto-js)) with a randomly generated session key to encrypt identified terms.
- Custom Watchlist: Users can manually add specific words to a custom dictionary for targeted encryption.
- Real-time Visual Feedback: Sensitive terms are highlighted in the input editor for immediate verification.
- Secure & Ephemeral:
  - Runs entirely in the browser.
  - No data is sent to any server.
  - The encryption key is session-based and discarded upon reloading the page.

## Usage

1. Encryption:
  - Type or paste text into the "Plaintext Input" area.
  - Detected sensitive terms (e.g., names, locations) and custom watchlisted words will be automatically encrypted in the "Encrypted Output" area.
  - Use the "Copy" button to copy the encrypted text.

2. Decryption:
  - Paste the encrypted text (containing `[ENC]...`) into the "Paste Encrypted Text" area in the Decryption Workspace.
  - The tool will automatically decrypt the text and display the original content in the "Decrypted Result" area. Note: Decryption only works within the *same session* (i.e., before refreshing the page), as the encryption key is session-specific.

3. Privacy Dictionary:
  - Auto-Detect Categories: Enable or disable specific categories of sensitive entities (e.g., Person, Place, Email, etc.).
  - Custom Watchlist: Add specific words you want to encrypt by typing them and clicking "Add Word" or selecting text in the editor and clicking "Add Selection".
