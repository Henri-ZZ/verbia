# Product Requirements Document (PRD): Verbia

**Product Name:** Verbia  
**Chrome Extension Title:** Verbia — AI Reply & Writing Assistant  
**Tagline:** *Tell me what you want to say, in any language.*  
**Philosophy:** *User provides the meaning. Verbia handles the expression.*  
**Document Version:** 1.0 (MVP to V1 Launch)  
**Status:** Approved / In Development  

---

## 1. Executive Summary & Vision

### 1.1 The Core Problem
When knowledge workers and global professionals communicate across borders or in non-native languages (or across shifting contextual tones like GitHub, Discord, Slack, and executive email), replying is high-friction and cognitive-heavy:
1. They read an incoming thread.
2. They translate or parse it mentally.
3. They copy the discussion text.
4. They open an external AI tab (ChatGPT / Claude).
5. They draft prompt instructions (*"Act as a professional colleague, reply politely to this..."*).
6. They wait for generic output, tweak it, copy it.
7. They switch back to the original tab and paste the text into the comment box.

This **10-step tab-hopping loop** breaks creative momentum and produces stiff, generic, or robotic replies.

### 1.2 The Verbia Solution
Verbia is an in-context Chrome extension that reads conversation threads right where the user works. The user does not write prompts or copy/paste:
- The user speaks or types raw intent in their **own thinking language** (e.g. Mandarin, Japanese, Spanish, German).
- Verbia extracts thread context (parent message, tone, technical terminology).
- Verbia synthesizes both into a culturally resonant, naturally phrased native reply ready to insert with a single click.

**What Verbia is NOT:**
- A simple literal machine translator (like Google Translate).
- A grammar/spell-check utility (like Grammarly).
- A standalone AI chat sidebar / chatbot.
- An autonomous auto-responder.

---

## 2. Target Personas & Use Cases

| Persona | Primary Friction | Verbia Workflow & Value |
|---|---|---|
| **Multilingual Remote Worker** | Thinks faster in native tongue; worries about phrasing nuances and cultural tone in English. | Speaks raw thought in native language via microphone; gets an authentic native English reply. |
| **Open Source Contributor / Engineer** | Needs concise, technically accurate replies on GitHub/Linear without sounding blunt or overly verbose. | Verbia recognizes thread code references and drafts a precise, collaborative answer. |
| **Client Account / Sales Lead** | Needs high-stakes diplomacy and professional poise across email and messaging. | Adapts casual thoughts into polished, relationship-preserving phrasing. |
| **Community Member** | Wants to engage casually on Discord, Reddit, or X without sounding like a corporate robot. | Adopts colloquial, natural phrasing matching the forum culture. |

---

## 3. Key Product Pillars & Principles

1. **Context-Bounded Intelligence**: Verbia only inspects the active thread/input element when invoked. No background tracking or tab recording.
2. **Freedom of Thought**: The user's thinking language should never limit how they communicate.
3. **Full User Control**: Verbia drafts; the user decides. No automated message transmission.
4. **Zero Context Switching**: Everything happens inline inside the active input field.

---

## 4. Product Architecture & Technical Specifications

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Viewport                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Active Thread / Comment Box (Slack, Gmail, GitHub)  │   │
│   │                                                     │   │
│   │  [ Verbia Inline Capsule Widget ]                   │   │
│   │    - Mic Icon (Voice Input via Web Speech / Whisper) │   │
│   │    - Quick Thought Input (Type in any language)      │   │
│   │    - Tone Selector Capsule                           │   │
│   └──────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ Active DOM Thread Context + User Intent
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Verbia Processing Layer                  │
│                                                             │
│  1. Thread Extractor: Parent post, topic, technical tokens  │
│  2. Intent Parser: Cross-lingual pragmatic extraction       │
│  3. Tone & Register Matcher: Community / Dev / Exec / Casual│
│  4. LLM Synthesis Engine (Low-latency streaming)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Polished Native Draft
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Inline Candidate & Insertion UI              │
│  - "Insert into reply" (1-click DOM injection)              │
│  - Tone adjustment pills (More casual / More formal / etc.) │
│  - Re-voice / Edit intent toggle                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Functional Requirements (P0, P1, P2)

### 5.1 Core Interaction & Input (P0 - MVP)
- **FR-01: In-line Extension Trigger**: Floating, unobtrusive pill inside supported `contenteditable` and `<textarea>` inputs (Gmail, LinkedIn, GitHub, Slack Web, Reddit, X).
- **FR-02: Thread Context Detection**: Automatically reads parent comment / incoming message without manual text selection.
- **FR-03: Multilingual Raw Thought Input**: Text input supporting 50+ source languages.
- **FR-04: Voice Thought Input**: Integrated microphone button supporting live voice capture in native language.
- **FR-05: 1-Click Insertion**: Replaces or populates active compose box with formatted native response.
- **FR-06: Manual Tone Shifter**: Quick pills to re-tone draft (e.g. *Casual, Professional, Technical, Diplomatic*).

### 5.2 Privacy & Guardrails (P0 - MVP)
- **FR-07: Explicit Action Only**: Activation occurs only upon user focus or extension shortcut.
- **FR-08: Zero Automated Sending**: Extension never triggers `<form submit>` or "Send" button events.
- **FR-09: Data Retention**: Zero persistence of thread content on server side; ephemeral processing only.

### 5.3 User Onboarding & Marketing Site (P0 - MVP)
- **FR-10: High-Fidelity Landing Page**: Editorial Botanical Modern aesthetic; realistic hero interactive demo; video walkthrough section; transparent pricing and FAQ.
- **FR-11: Chrome Web Store Deep Link**: Seamless install CTA (`Add to Chrome`).

### 5.4 Personalization & Pro Features (P1 - V1.1)
- **FR-12: Custom Tone Presets**: User-defined custom tone archetypes (e.g., "YC Founder", "Senior Staff Engineer").
- **FR-13: Deep Thread Memory**: Ability to reference historical conversations across extended threads.
- **FR-14: Industry Terminology Vault**: Custom glossary for domain-specific jargon and acronyms.

---

## 6. Non-Functional Requirements

- **Latency**: End-to-end draft generation < 1.2s for average reply length (< 80 words).
- **Security**: Local client token encryption; SOC2-compliant ephemeral inference API.
- **Reliability**: 99.9% uptime for AI reply inference gateway; graceful degradation to standard paste.
- **Accessibility**: Keyboard navigation (`Tab`, `Cmd/Ctrl + Enter` to insert), ARIA labels on voice triggers.

---

## 7. Monetization & Tiering Strategy

| Tier | Pricing | Inclusions |
|---|---|---|
| **Free** | $0/month | 50 context-aware replies/mo • 10+ core languages • Voice dictation input • Standard extension widget |
| **Pro** | $12/month | Unlimited context-aware replies • 60+ languages • Custom tone presets & industry profiles • Priority latency & deep thread memory |

---

## 8. Success Metrics (KPIs)

1. **Activation Rate**: % of installs completing their first inline reply within 24 hours (Target: > 65%).
2. **Acceptance / Insertion Rate**: % of generated drafts accepted with < 15% manual editing (Target: > 78%).
3. **Time Saved per Reply**: Measured reduction in drafting time vs. baseline tab-hopping (Target: ~45 seconds saved per interaction).
4. **Daily Active Usage (DAU/MAU)**: Ratio of weekly active users invoking Verbia daily (Target: > 40%).

---

## 9. Brand & Design System Reference
- **Theme:** Editorial Botanical Modern
- **Key Colors:** Deep Forest Green (`#0F6E56`), Pale Jade (`#7FA28D`), Soft Tint (`#C7D5C4`), Warm Ivory (`#F2EDE2` / `#FBF9F5`).
- **Brand Geometry:** Layered V motif symbolizing *Context + Intent = Expression*.
