# Manomaya - Design System Reference

> Source: https://manomaya.lovable.app/ (stripped June 2026)

---

## Philosophy

> No ads. No trackers. No infinite scroll. Movement supports attention, not steals it. Typography invites reading, not scanning. Every element is intentional and minimal.

---

## Color Palette

### Core Theme (Dark Teal + Gold)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --background | 170 52% 24% | #0d2b1e | Page background - deep teal |
| --foreground | 40 30% 94% | #f3f0e8 | Primary text - warm cream |
| --card | 170 50% 20% | #0a2318 | Card backgrounds - darker teal |
| --card-foreground | 40 30% 94% | #f3f0e8 | Card text |
| --popover | 170 50% 20% | #0a2318 | Popover/dropdown backgrounds |
| --popover-foreground | 40 30% 94% | #f3f0e8 | Popover text |
| --primary | 38 52% 62% | #c9a64f | Primary accent - muted gold |
| --primary-foreground | 170 52% 15% | #061a12 | Text on primary (dark teal) |
| --secondary | 170 35% 18% | #0b2419 | Secondary backgrounds |
| --secondary-foreground | 40 30% 94% | #f3f0e8 | Secondary text |
| --muted | 170 30% 28% | #173d2e | Muted/subtle backgrounds |
| --muted-foreground | 40 15% 75% | #b8b0a0 | Secondary/muted text |
| --accent | 38 52% 62% | #c9a64f | Accent (same as primary) |
| --accent-foreground | 170 52% 15% | #061a12 | Text on accent |
| --destructive | 0 84.2% 60.2% | #dc2626 | Error/danger states |
| --destructive-foreground | 210 40% 98% | #f0f4f8 | Text on destructive |
| --border | 170 30% 32% | #1e4d3b | Borders - teal |
| --input | 170 30% 32% | #1e4d3b | Input borders |
| --ring | 38 52% 62% | #c9a64f | Focus ring - gold |
| --radius | 0.25rem | 4px | Border radius |

### Extended Palette

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| --gold | 38 52% 62% | #c9a64f | Gold text/accents |
| --gold-bright | 43 70% 70% | #e0c060 | Bright gold highlights |
| --gold-muted | 38 40% 50% | #a08435 | Subdued gold |
| --teal-deep | 170 52% 24% | #0d2b1e | Deep teal backgrounds |
| --teal-darker | 170 52% 18% | #091f15 | Darker teal |
| --teal-light | 170 40% 35% | #1a6b52 | Lighter teal accents |
| --cream | 40 40% 95% | #f5f0e6 | Light text |
| --cream-warm | 35 35% 94% | #f2ebe0 | Warm white |
| --cream-muted | 40 20% 85% | #ddd7ca | Muted cream |
| --charcoal | 0 0% 17% | #2b2b2b | Dark gray |
| --soft-gray | 170 15% 42% | #5c7a6e | Soft gray-teal |

### Theme Color Meta

- theme-color: #1a5c52
- msapplication-TileColor: #1a5c52

---

## Typography

### Font Families

| Role | Font | Stack |
|------|------|-------|
| Serif (headings, quotes) | **Cormorant Garamond** | Cormorant Garamond, Georgia, serif |
| Sans (body, UI) | **Outfit** | Outfit, system-ui, sans-serif |
| Mono (code) | System monospace | ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace |

### Font Weights Loaded

| Font | Weights |
|------|---------|
| Cormorant Garamond | 300 (Light), 400 (Regular), 500 (Medium) |
| Cormorant Garamond Italic | 300, 400, 500 |
| Outfit | 300 (Light), 400 (Regular), 500 (Medium) |
| Outfit Italic | 300, 400, 500 |

### Font Sizes

| Element | Size | Weight | Font |
|---------|------|--------|------|
| h1 | 3rem (48px) | 400 | Cormorant Garamond |
| h2 | 2.25rem (36px) | 400 | Cormorant Garamond |
| h3 | 1.875rem (30px) | 400 | Cormorant Garamond |
| h4 | 1.5rem (24px) | 400 | Cormorant Garamond |
| h5 | 1.25rem (20px) | 400 | Cormorant Garamond |
| Body | 1rem (16px) | 400 | Outfit |
| Small | 0.875rem (14px) | 400 | Outfit |

### Letter Spacing

- Headings: -0.02em (tight tracking)
- Body: normal

### Line Heights

- Headings: 1.33 to 1.43
- Body: 1.5 to 1.75

---

## Spacing and Layout

### Border Radius

- Default: 0.25rem (4px)
- Cards: 0.375rem (6px)
- Buttons: 0.3125rem (5px)

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| --shadow-soft | 0 8px 40px -12px hsl(var(--primary) / .2) | Subtle gold glow |
| --shadow-glow | 0 0 80px -20px hsl(var(--primary) / .4) | Ambient gold glow |
| --shadow-card | 0 4px 24px -8px rgba(0, 0, 0, .3) | Card elevation |

### Max Width

- Content container: max-w-6xl (72rem / 1152px) with mx-auto px-4
- Narrow content: max-w-3xl (48rem / 768px)

---

## Layout Structure

### Navigation Bar (Sticky Top)

- Fixed/sticky top, transparent background with blur
- Logo (image + text) on left
- Nav links center (pill-style, active state highlighted)
- Sign In button on right
- Mobile: hamburger menu

### Homepage

- Hero: Logo image (256x256 webp/avif), title MANOMAYA, subtitle A quiet place in a noisy world, Sanskrit tagline, scroll indicator
- Daily Reflection / Quote Card (loaded dynamically from Supabase DB)
- Footer

### Blog Page

- Title Author Blog + subtitle Poetic notes, long-form stories, and mindful reflections
- Post cards in responsive grid: image, Note label, title (serif h3), excerpt, date + Read more link
- Reflections section: text-only cards with truncated quotes and dates
- AI Stories section
- Footer

### Reflections Book Page

- Title + subtitle A living journal of wisdom, preserved for all who seek.
- Tab buttons: Daily Reflections | My Inbox
- Dynamic content per tab
- Footer

### Gallery Page

- Title + subtitle A sanctuary of images for quiet reflection
- Image grid (masonry/responsive layout)
- Footer

### About Page

- Title + Sanskrit subtitle
- Philosophy description paragraph
- Our Philosophy bullet list (4 principles with star markers)
- Social link (@manomaya Instagram)
- Return to Homepage link
- Ram Dass quote block
- Footer

### Footer (Global)

- Quote block: The quieter you become, the more you can hear. -- Ram Dass
- Nav links: Home, Blog, Book, Gallery, About, Contact, Privacy Policy
- Social: @manomaya Instagram
- Visitor counter
- Copyright: 2026 Manomaya -- A quiet place in a noisy world

### Cookie Banner

- Text: This site uses only essential cookies to keep you signed in. No tracking, no surveillance -- just stillness.
- Buttons: [Accept] [Decline]

---

## Design Principles

1. **Dark theme** -- Deep teal (#0d2b1e) background, warm cream (#f3f0e8) text
2. **Gold accents** -- Primary actions and highlights use muted gold (#c9a64f)
3. **Serif headings** -- Cormorant Garamond for all headings and quotes (elegant, contemplative)
4. **Sans body** -- Outfit for body text and UI (clean, modern)
5. **Tight letter-spacing** -- Headings use -0.02em tracking
6. **Soft shadows** -- Gold-tinted shadows for ambient warmth
7. **Generous whitespace** -- Content breathes, no visual clutter
8. **Responsive** -- Mobile-first, works on all screen sizes
9. **Minimal UI** -- Only essential navigation, no sidebars
10. **Content-first** -- Typography and content dominate, UI recedes

---

## Components

### Navigation
- Sticky top bar with blur backdrop
- Logo image (256x256 webp/avif) + text
- Pill-style nav links with active state
- Sign In button (gold outline)

### Cards
- Dark teal background with subtle border
- Gold accent for interactive elements
- Rounded corners (6px)
- Soft box-shadow

### Buttons
- Primary: Gold background, dark teal text
- Secondary: Teal background, cream text
- Subtle: Transparent with border

### Quote Blocks
- Serif font (Cormorant Garamond)
- Gold or cream text
- Author attribution below

### Tags/Badges
- Small, rounded pills
- Background: muted teal
- Text: cream or gold

---

## Tech Stack

- **Framework**: React (Vite)
- **Styling**: Tailwind CSS + CSS custom properties
- **Fonts**: Self-hosted woff2 (Cormorant Garamond, Outfit)
- **Backend**: Supabase (auth + database)
- **Build**: Vite with PWA plugin
- **Hosting**: Lovable (lovable.app)

---

## CSS Variables (Copy-Paste Ready)

`css
:root {
  /* Core palette */
  --background: 170 52% 24%;
  --foreground: 40 30% 94%;
  --card: 170 50% 20%;
  --card-foreground: 40 30% 94%;
  --popover: 170 50% 20%;
  --popover-foreground: 40 30% 94%;
  --primary: 38 52% 62%;
  --primary-foreground: 170 52% 15%;
  --secondary: 170 35% 18%;
  --secondary-foreground: 40 30% 94%;
  --muted: 170 30% 28%;
  --muted-foreground: 40 15% 75%;
  --accent: 38 52% 62%;
  --accent-foreground: 170 52% 15%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 170 30% 32%;
  --input: 170 30% 32%;
  --ring: 38 52% 62%;
  --radius: 0.25rem;

  /* Extended palette */
  --gold: 38 52% 62%;
  --gold-bright: 43 70% 70%;
  --gold-muted: 38 40% 50%;
  --teal-deep: 170 52% 24%;
  --teal-darker: 170 52% 18%;
  --teal-light: 170 40% 35%;
  --cream: 40 40% 95%;
  --cream-warm: 35 35% 94%;
  --cream-muted: 40 20% 85%;
  --charcoal: 0 0% 17%;
  --soft-gray: 170 15% 42%;

  /* Typography */
  --font-serif: "Cormorant Garamond", Georgia, serif;
  --font-sans: "Outfit", system-ui, sans-serif;

  /* Shadows */
  --shadow-soft: 0 8px 40px -12px hsl(var(--primary) / 0.2);
  --shadow-glow: 0 0 80px -20px hsl(var(--primary) / 0.4);
  --shadow-card: 0 4px 24px -8px rgba(0, 0, 0, 0.3);
}
`
