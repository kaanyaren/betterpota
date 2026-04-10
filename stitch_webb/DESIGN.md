# Design System Documentation

## 1. Overview & Creative North Star: "Organic Precision"

This design system is built to bridge the gap between high-utility field equipment and high-end editorial digital experiences. Our Creative North Star is **Organic Precision**. We reject the "template" look of modern SaaS by embracing intentional asymmetry, expansive whitespace, and a sophisticated tonal palette inspired by deep forest canopies and morning mist.

The goal is to create a UI that feels like a bespoke field journal—authoritative and technical enough for professional use, yet soft and premium enough to stand out in a sea of generic "clean" apps. We achieve this through a "less-is-more" approach where the absence of structural lines forces us to use color and type to guide the user's eye.

---

## 2. Colors: Tonal Architecture

Our palette is rooted in a "Nature-Inspired Technical" aesthetic. We use high-contrast greens against soft, creamy surfaces to maintain readability while conveying a premium, organic feel.

### The "No-Line" Rule
To achieve a signature high-end look, **do not use 1px solid borders for sectioning or card containment.** Boundaries must be defined solely through background color shifts.
- **Example:** A `surface-container-low` (#dafce7) section sitting on top of a `surface` (#e8ffef) background.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the `surface-container` tiers to create depth:
1.  **Base Layer:** `surface` (#e8ffef)
2.  **Sectional Break:** `surface-container-low` (#dafce7)
3.  **Interactive Elements/Cards:** `surface-container-lowest` (#ffffff) to create a subtle "pop" against the background.

### The "Glass & Gradient" Rule
Flat colors can feel "dead." To provide visual soul:
- **Signature Gradients:** For primary CTAs and hero headers, use a subtle linear gradient transitioning from `primary` (#0f5238) to `primary_container` (#2d6a4f).
- **Glassmorphism:** For floating navigation or overlays, use semi-transparent versions of `surface` with a `backdrop-filter: blur(20px)`. This allows the background greens to bleed through, softening the UI.

---

## 3. Typography: The Editorial Voice

We use a dual-typeface system to balance technical utility with modern sophistication.

*   **Space Grotesk (Display & Headline):** This is our "Precision" element. Its technical, slightly quirky letterforms should be used for large titles and numbers to convey an "instrument-like" feel.
*   **Manrope (Title & Body):** This is our "Organic" element. Its humanistic curves ensure high readability in the field.

### Hierarchy Guidelines
- **Display-LG (Space Grotesk):** Reserved for high-impact hero statements. Use tight letter-spacing (-2%) for an editorial feel.
- **Headline-MD (Space Grotesk):** For section headers. Always paired with generous top-margin (48px+) to allow the layout to breathe.
- **Body-LG (Manrope):** The workhorse for descriptions. Ensure line-height is at least 1.6 for maximum clarity.

---

## 4. Elevation & Depth: Tonal Layering

We avoid traditional "drop shadows" that create muddy UIs. Depth is achieved through light and tone.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on `surface-container-low` backgrounds to create a soft, natural lift. This mimics fine paper layered on a desk.
*   **Ambient Shadows:** If a "floating" effect is mandatory (e.g., a bottom navigation bar), use a highly diffused shadow: `box-shadow: 0 20px 40px rgba(3, 32, 20, 0.06)`. Note the use of `on_surface` (#032014) as the shadow tint rather than pure black.
*   **The "Ghost Border" Fallback:** If a container needs more definition (e.g., in high-glare field conditions), use the `outline_variant` (#bfc9c1) at 15% opacity. Never use 100% opaque borders.

---

## 5. Components

### Buttons
- **Primary:** Rounded (`full` scale), using the Signature Gradient (`primary` to `primary_container`). Typography: `label-md` in Manrope, uppercase with 1px tracking.
- **Secondary:** Surface-container-lowest background with `primary` text. No border.
- **Tertiary:** Text-only in `primary`, using a subtle `primary_fixed` background on hover.

### Cards & Lists
- **Rule:** Forbid the use of divider lines.
- **Separation:** Use vertical whitespace (8px, 16px, 24px) or a tonal shift from `surface` to `surface-container`.
- **Corner Radius:** All cards must use `xl` (1.5rem) or `lg` (1rem) rounding to maintain the "soft" organic feel.

### Input Fields
- **Style:** Background-filled using `surface-container-high`.
- **States:** On focus, transition the background to `surface-container-highest` and add a "Ghost Border" of `primary` at 20% opacity.
- **Typography:** Labels use `label-sm` in Manrope to keep the interface looking clean and professional.

### "Field-Ready" Chips
- **Selection Chips:** Use `secondary_container` with `on_secondary_container` text. These should be small and pill-shaped (`full` roundedness) to mimic physical toggles on a device.

---

## 6. Do's and Don'ts

### Do
- **Use Intentional Asymmetry:** Align text to the left but allow imagery or cards to bleed off-edge or sit slightly off-center to break the "grid" feel.
- **Embrace White Space:** If you think there is enough space, add 20% more. This system relies on "breathing room" to feel premium.
- **Color-Coded Utility:** Use `tertiary` (#005413) for success states or "online" indicators to maintain the nature-inspired palette.

### Don't
- **Don't use pure black (#000000):** Use `on_background` (#032014) for text to keep the contrast soft and sophisticated.
- **Don't use hard shadows:** They break the "Organic" feel. If it doesn't look like light hitting paper, it's too heavy.
- **Don't clutter:** If a screen has more than 5 distinct interactive elements, consider nesting them into a "Surface Container Highest" bottom sheet.