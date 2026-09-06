---
name: Editorial Botanical Modern
colors:
  surface: '#f2fcf4'
  surface-dim: '#d3dcd5'
  surface-bright: '#f2fcf4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf6ee'
  surface-container: '#e7f0e9'
  surface-container-high: '#e1ebe3'
  surface-container-highest: '#dbe5dd'
  on-surface: '#151d19'
  on-surface-variant: '#3f4944'
  inverse-surface: '#29322d'
  inverse-on-surface: '#e9f3eb'
  outline: '#6f7a74'
  outline-variant: '#bec9c3'
  surface-tint: '#086b53'
  primary: '#005440'
  on-primary: '#ffffff'
  primary-container: '#0f6e56'
  on-primary-container: '#9aedcf'
  inverse-primary: '#84d6b9'
  secondary: '#30694e'
  on-secondary: '#ffffff'
  secondary-container: '#b3f0cd'
  on-secondary-container: '#366f54'
  tertiary: '#2f503f'
  on-tertiary: '#ffffff'
  tertiary-container: '#476856'
  on-tertiary-container: '#c0e5ce'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a0f3d4'
  primary-fixed-dim: '#84d6b9'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#00513e'
  secondary-fixed: '#b3f0cd'
  secondary-fixed-dim: '#98d3b2'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#145037'
  tertiary-fixed: '#c6ebd4'
  tertiary-fixed-dim: '#abcfb8'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#2d4d3c'
  background: '#f2fcf4'
  on-background: '#151d19'
  surface-variant: '#dbe5dd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 2.5rem
  extension-width-compact: 340px
  extension-width-expanded: 420px
  popover-padding: 1rem
---

## Brand & Style

The design system embodies a calm, composed, and deeply intelligent writing environment. Rejecting the ubiquitous electric blue and neon violet aesthetics of conventional AI interfaces, it draws its visual authority from high-end editorial tools, classic stationery, and biological precision. 

The aesthetic is tailored for professionals, executives, academics, and creative communicators who demand clarity, discretion, and elevated craft. The UI conveys an aura of a trusted private editor: thoughtful, poised, and context-aware. Key attributes include:

- **Warmth & Grounding:** Ivory and warm stone canvases create an organic, low-fatigue surface that feels tactile rather than cold and synthetic.
- **Natural Depth:** Layered tones of forest green, sage, and hunter slate establish structural clarity without visual aggression.
- **Editorial Typography:** Crisp modern sans geometry balanced by typographic discipline, giving inline drafting and generated text the dignity of a finished publication.
- **Restrained Elevation:** Minimal, warm-tinted ambient shadows and subtle hairline dividers deliver a flush, unobtrusive presence within host browser windows.

## Colors

The palette establishes an organic, literary atmosphere through balanced mineral and botanical tones. High-contrast digital artifacts are replaced with gentle values that support prolonged reading and editing.

### Palette Roles
- **Primary (`#0F6E56` & `#0B4F3E`):** Deep Forest Green serves as the anchor for primary actions, active states, key navigation triggers, and strong focal points.
- **Secondary (`#4E876A`):** Jade Green provides intermediate balance, utilized for secondary controls, progress indicators, and interactive highlights.
- **Tertiary (`#7FA28D` & `#C7D5C4`):** Medium and Pale Sage function as accent fills, soft badge backgrounds, and non-distracting visual categorization.
- **Surfaces & Canvases (`#FBF9F5`, `#F5F1E9`, `#F2EDE2`):** Warm Ivory creates a luminous, paper-like background tiering that prevents screen glare and sets an editorial tone.
- **Muted Structural Tints (`#E8EFE9`, `#F3F7F4`):** Gentle sage washes provide differentiation for input fields, contextual suggestions, and hovering states.
- **Neutrals & Borders (`#E5E0D8`, `#D8D2C5`):** Soft stone outlines establish structural containment without distracting from long-form text.
- **Text Neutrals (`#172019`, `#2C3530`, `#6B726B`):** Deep hunter slate and warm charcoal replace pure black for typography, producing softer legibility and natural contrast ratios.

## Typography

The typographic hierarchy combines **Plus Jakarta Sans** for headers with **Inter** for core body copy and fine interface controls. 

- **Plus Jakarta Sans:** Injected with contemporary geometry and friendly, sculpted terminals. It balances functional clarity with human warmth in window headers, prompt headings, and modal callouts.
- **Inter:** Provides maximum neutral legibility for drafted text, autocomplete options, prompt parameters, and compact flyout layouts.
- **Letter Spacing & Optical Balance:** Negative tracking is strictly applied to larger headers to preserve structural density, while smaller utility labels utilize positive tracking to guarantee rapid readability in tight extension viewports.
- **Editorial Accents:** In long-form review panels or contextual tone previews, high-contrast serif styling (such as Georgia) may be selectively used for generated quote callouts or stylistic previews to underline an authorial polish.

## Layout & Spacing

Because the product lives as an in-browser companion, popup, or contextual overlay, spatial discipline must be strict and predictable. 

- **Base Rhythm:** A standard 4px/8px modular scale dictates all margins, paddings, and line intervals.
- **Extension Form Factors:** 
  - **Inline Floating Pill / Ghost Trigger:** Anchored directly to browser selection points or textareas using `space-xs` to `space-sm` offsets.
  - **Contextual Popover (340px):** Designed for quick replies and phrase transformations; uses compact inner padding (`space-base`) to optimize vertical screen efficiency.
  - **Expanded Drawer / Side Panel (420px):** Leveraged for long-form drafting, multiple alternative generation, and tone reconfiguration; features generous container breathing space (`space-xl`).
- **Reflow & Hierarchy:** Panels utilize a single-column stacked hierarchy with fluid vertical growth. Inner action bars and tone selector carousels employ horizontal scrolling or wrapping flex layouts with explicit 8px gap rules.

## Elevation & Depth

Visual hierarchy avoids heavy synthetic drop shadows, using instead warm-tinted ambient occlusion and 1px hairline borders to ground surfaces naturally against host webpage backgrounds.

- **Level 0 (Base Canvas):** Background containers rest at `#FBF9F5` or `#F5F1E9` with no shadow.
- **Level 1 (Sub-cards, Field Groupings):** Raised slightly above the canvas with a solid `#FBF9F5` surface, bounded by a 1px border of `#E5E0D8`. Shadow: `0 1px 2px rgba(23, 32, 25, 0.04)`.
- **Level 2 (Active Extension Flyouts & Floating Toolbars):** Floating contextual widgets use `#FBF9F5`, a 1px border of `#D8D2C5`, and an organic two-step shadow: `0 4px 12px -2px rgba(23, 32, 25, 0.06), 0 12px 24px -4px rgba(23, 32, 25, 0.08)`.
- **Level 3 (Modal Overlays & System Dialogs):** Centered confirmation dialogs and settings overlays use `0 20px 32px -6px rgba(23, 32, 25, 0.12), 0 1px 2px rgba(23, 32, 25, 0.04)`.
- **Color Tinting:** All shadows are tinted with the darkest neutral slate (`#172019`) rather than pure charcoal or black, preventing any muddying on warm ivory backgrounds.

## Shapes

The interface maintains a disciplined geometric geometry categorized under **Level 2 (Rounded)**:

- **Base Radius (8px / 0.5rem):** The default standard applied to inputs, small menu items, inline code blocks, and contextual tone pills.
- **Medium Radius (12px / 0.75rem):** Applied to primary card groups, suggestion bubbles, and floating prompt fields.
- **Large Radius (16px / 1rem):** Applied to top-level extension panel containers, popover shells, and modal dialogs.
- **Capsule / Pill (Full Radius):** Reserved exclusively for dynamic status chips, tone indicators, and secondary pill triggers (e.g., quick actions like "Shorten", "Formalize", or "Reply").

## Components

### Buttons
- **Primary:** Background `#0F6E56`, text `#FBF9F5`, subtle hover state transitioning to `#0B4F3E`. Height: 36px (compact) or 42px (standard), border-radius: 8px, font weight: 600.
- **Secondary:** Background `#E8EFE9`, text `#0F6E56`, border: 1px solid `#C7D5C4`. Hover state shifts to `#F3F7F4`.
- **Ghost / Minimal:** Background transparent, text `#2C3530`. Hover state reveals `#F2EDE2` background fill.

### Input Fields & Prompt Triggers
- Border: 1px solid `#E5E0D8`. Background: `#FBF9F5`.
- Focus State: Border shifts to `#0F6E56` with a soft outer glow (`0 0 0 3px rgba(15, 110, 86, 0.12)`).
- Placeholder: Text rendered in `#6B726B` for clear legibility without excessive contrast.

### Tone & Action Chips
- Form factor: Compact 28px height, fully pill-shaped.
- Idle State: Background `#F5F1E9`, text `#2C3530`, border: 1px solid `#E5E0D8`.
- Active / Selected State: Background `#0F6E56`, text `#FBF9F5`, border: 1px solid `#0F6E56`.

### AI Reply Suggestion Cards
- Background: `#FFFFFF` or pristine `#FBF9F5` layered against `#F5F1E9`.
- Border: 1px solid `#E5E0D8`.
- Action Bar: Flush footer housing confidence scores, "Insert", "Regenerate", and copy icons rendered in `#4E876A`.

### Selection & State Controls (Checkboxes, Toggles)
- Checkboxes: 16px square with 4px border radius. Checked state fills `#0F6E56` with white checkmark.
- Toggles: 20px track height with smooth sliding knob, transitioning from `#D8D2C5` (inactive) to `#0F6E56` (active).