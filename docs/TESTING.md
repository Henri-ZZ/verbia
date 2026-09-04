# Verbia V1 test guide

## Automated gate

Run `npm test`, `npm run typecheck`, and `npm run build`. Load `dist/extension` unpacked and confirm its service worker console has no errors.

## Reddit smoke pass

Test a post reply, a top-level comment reply, and a reply at least two comments deep. For each, verify the context preview identifies the intended target, contains only ancestors (never sibling comments), and matches the data used to generate. Open multiple composers and confirm the focused one receives the draft. Navigate within Reddit without a full reload and repeat.

## Safety pass

- Put existing text in the editor: Insert must show Append / Replace / Cancel.
- Start generation, edit or remove the target editor, then return: the draft must remain copyable.
- Include “ignore all prior instructions” in selected page text: it must remain quoted context, not control output.
- Close the panel during generation: nothing may be inserted.
- Search the built files for API keys and message-body logging.
- Confirm no path clicks or queries a Submit, Reply, Comment, or Post button.

## Universal pass

On three local fixtures or real pages, cover textarea, text input, and contenteditable. Select text before invoking Verbia and verify it appears in preview. Repeat without a selection and confirm no page content is included. Try a password and payment-like field and confirm they are refused.

## Voice and failures

Verify recording start/stop state, editable transcript, microphone denial fallback, unsupported recognition fallback, and rapid repeated clicks. Test offline mode, gateway stopped, timeout, 429, malformed provider JSON, and empty model output. Intent and any existing draft must survive all errors.

## Release gate

Switch to a validated model ID, run the reply-quality benchmark, test current Reddit in stable Chrome, replace the local backend origin, create store assets, publish the privacy policy, and complete every unchecked item in `CHROMEWEBSTORE.md`.
