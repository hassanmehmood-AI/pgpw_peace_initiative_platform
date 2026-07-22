---
name: PeaceGangPeaceWorld
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5d5f5f'
  on-secondary: '#ffffff'
  secondary-container: '#dfe0e0'
  on-secondary-container: '#616363'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191c1e'
  on-tertiary-container: '#828486'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e1e2e4'
  tertiary-fixed-dim: '#c5c6c8'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
The design system for this platform is built on a "Radical Neutrality" philosophy. It utilizes a high-contrast, black-and-white foundation to create a bridge between conflicting territories, establishing the UI as a neutral ground for peace-building. The aesthetic is urban, professional, and uncompromisingly bold.

The visual direction merges **Minimalism** with **Modern Brutalism**. It uses heavy structural lines, generous whitespace, and impactful typography to convey authority and respect. While the core is monochromatic, the system allows for controlled, vibrant accents to represent diverse community identities without compromising the platform's role as a mediator. Decorative elements may occasionally feature subtle halftone textures to nod to urban grassroots movements, but the functional UI remains crisp and polished.

## Colors
The palette is intentionally stark to emphasize clarity and truth. 

- **Foundation:** Primary Black and White are used for maximum contrast. All critical interface actions and structural boundaries use these two tones.
- **Surfaces:** Light Gray (#F3F4F6) provides subtle depth for secondary containers, while Soft Gray (#E5E7EB) is reserved strictly for hairline borders.
- **Community Accents:** Blue, Red, Yellow, and Purple are designated for community badges, role indicators, and specific affiliation markers. These colors must never be used for primary UI actions (like "Post" or "Save") to maintain the platform's neutral stance.

## Typography
The typography system uses **Montserrat** for headlines to project strength and modern urban energy. Its geometric construction feels architectural and grounded. **Inter** is used for all body text and UI labels to ensure maximum legibility across dense information environments.

Headlines should utilize tight letter-spacing and heavy weights to command attention. Labels and captions use medium to semi-bold weights to ensure they don't disappear against high-contrast backgrounds.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a strict 8px spacing rhythm. 

- **Desktop:** A 12-column grid with 24px gutters. Content is centered within a 1280px max-width container.
- **Mobile:** A 4-column grid with 16px gutters and margins. 
- **Rhythm:** Use "Stack" spacing for vertical rhythm. Components should be separated by `stack-md` as a default, while distinct sections use `stack-lg`. 

The system relies on generous padding within cards and containers to prevent the high-contrast palette from feeling claustrophobic.

## Elevation & Depth
In this design system, depth is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows. 

- **Level 0 (Background):** Pure White (#FFFFFF).
- **Level 1 (Cards/Surface):** Light Gray (#F3F4F6) or White with a 1px Soft Gray (#E5E7EB) border.
- **Level 2 (Active/Hover):** 1px Primary Black (#000000) border.

Shadows are used sparingly and must be "Ambient Shadows"—highly diffused, low-opacity (#000000 at 5-8%) with 0px offset to create a subtle lift for floating modals or primary action buttons.

## Shapes
The shape language balances the "hardness" of the black-and-white theme with "approachable" geometry. UI elements use a standard **8px (0.5rem)** radius to soften the urban aesthetic. 

- **Standard (8px):** Buttons, Input fields, Cards.
- **Large (16px):** Modals, Featured banners.
- **Pill:** Reserved for badges, chips, and affiliation indicators.

## Components

### Buttons
- **Primary:** Solid Black background with White text. No border. 8px radius.
- **Secondary:** White background with a 2px Black border and Black text. 
- **Ghost:** Transparent background with Black text. 

### Community Badges
- **Affiliation Chips:** Use a pill-shaped geometry. The background is a very light tint (10% opacity) of the community color, with a 2px solid border and text in the full-saturation community color (e.g., Crip Blue).

### Input Fields
- White background, 1px Soft Gray border. On focus, the border transitions to 2px Solid Black. Labels sit above the field in `label-bold` style.

### Lists & Feed Items
- Separated by 1px Soft Gray dividers. Feed items use a White background; on hover, the background shifts to Light Gray (#F3F4F6) to indicate interactivity.

### Cards
- Use a White background with a 1px Soft Gray border. For featured content, use a halftone "distress" texture as a subtle background pattern behind the header text to evoke an urban, street-art feel.