# Privacy Policy for Verbia

Last updated: 2026-09-13

## What data Verbia handles

When you explicitly open Verbia, it reads the currently focused editor and the minimum context needed for that reply. On sites where automatic mode is available, this can include the thread or email you are replying to; elsewhere it uses only the text you selected, or no page context. When you click Generate, Verbia transmits that context, your intent, output preferences, and non-identifying version metadata to the configured Verbia generation service.

Verbia does not read cookies, browsing history, Reddit account IDs, passwords, payment fields, or unrelated page content. It does not monitor whether you send a draft.

## Voice input (optional)

If you use the speak button, Verbia relies on the browser's built-in speech recognition (Web Speech API). No audio ever reaches Verbia's generation service: the audio goes from your device to the recognition service provided by the browser itself, and only the resulting transcript text is placed into the intent field. Which service processes the audio depends on the browser — Chrome sends it to Google, Microsoft Edge to Azure Cognitive Services, and Safari (macOS/iOS) generally keeps recognition on your device. Voice recognition availability and behavior are therefore controlled by the user's browser, not by Verbia. Microphone access can be granted or denied independently and does not affect any other Verbia feature.

## Storage

Language, tone, length, context-preview, diagnostics, and backend URL preferences are stored locally in Chrome. Active request metadata can be stored for the current browser session. Context, intent, transcripts, drafts, and raw audio are not intentionally persisted by the extension.

## Use and third-party processing

Transmitted content is used only to generate the reply you requested. A production Verbia service may send the request to Google Gemini as a model processor. Development users can configure a local gateway. Verbia does not sell data or use it for advertising, creditworthiness, or unrelated purposes.

## Diagnostics

Metadata-only diagnostics are off by default. If enabled in a future production build, they may include platform, operation result, durations, character-count buckets, and non-content error codes. They will not include page text, intent, transcripts, drafts, audio, or API keys.

## Retention and deletion

The extension stores only your settings. **Reset settings** in Settings restores the defaults. The V1 gateway does not intentionally retain request or response bodies in application logs. Provider processing and retention are governed by the configured provider and deployment agreement.

## User control

You can inspect and remove context before generating, edit every generated draft, copy instead of insert, deny Reddit or microphone access, and reset your settings to defaults. Verbia never sends or submits a website message.

## Changes and contact

This policy will be updated when data practices change. Before public release, the publisher must add a monitored privacy contact and host this policy at the public URL recorded in `CHROMEWEBSTORE.md`.
