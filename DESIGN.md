---
name: Technological Calm
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444557'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757589'
  outline-variant: '#c5c5da'
  surface-tint: '#2f3eff'
  primary: '#0010cc'
  on-primary: '#ffffff'
  primary-container: '#1929fe'
  on-primary-container: '#c1c5ff'
  inverse-primary: '#bec2ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#393e41'
  on-tertiary: '#ffffff'
  tertiary-container: '#505558'
  on-tertiary-container: '#c5cacd'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bec2ff'
  on-primary-fixed: '#00046a'
  on-primary-fixed-variant: '#0013e7'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#dfe3e7'
  tertiary-fixed-dim: '#c3c7cb'
  on-tertiary-fixed: '#171c1f'
  on-tertiary-fixed-variant: '#43474b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 24px
  sidebar-width: 260px
---

## Brand & Style
The design system is engineered for high-performance SaaS environments where clarity and focus are paramount. The brand personality is "Technological Calm"—a blend of professional authority and reductive minimalism that prevents cognitive overload. 

The aesthetic leverages a **Modern Corporate** style with subtle **Glassmorphism** influences for secondary navigation. It prioritizes high-quality typography and generous whitespace to ensure complex data remains scannable. The emotional response should be one of reliability, precision, and effortless control.

## Colors
The palette is anchored by a vibrant "Electric Indigo" primary color, used strategically for actions and brand moments. The background utilizes a cool-toned light blue-gray to reduce screen glare during extended use.

- **Primary**: Used for primary buttons, active states, and progress indicators.
- **Surface**: Pure white (#FFFFFF) for cards and data containers to provide maximum contrast against the background.
- **Status**: Semantic colors use a slightly desaturated tone to remain visible without being jarring, maintaining the "Calm" narrative.

## Typography
This design system utilizes **Geist**, a typeface designed for legibility in technical environments. The type scale is optimized for data density.

- **Headlines**: Use SemiBold (600) or Bold (700) weight with slight negative letter-spacing for a modern, "engineered" look.
- **Body**: Regular (400) weight is the standard for all data reading.
- **Labels**: Medium (500) weight, used sparingly for table headers and small captions, often in uppercase to create a distinct visual hierarchy from body text.

## Layout & Spacing
The layout follows a **Fluid Grid** model within a maximum container width of 1440px. A standard 12-column system is used for dashboard widgets.

- **Sidebar**: A fixed 260px sidebar is used for primary navigation.
- **Margins**: Consistent 32px padding (xl) for main page containers on desktop, scaling down to 16px (md) on mobile.
- **Rhythm**: All spacing tokens are multiples of 4px, ensuring a strict geometric alignment across all components.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Ambient Shadows**. This design system avoids heavy borders, preferring light-based separation.

- **Level 0 (Background)**: #F8FAFC. The lowest layer.
- **Level 1 (Cards/Surfaces)**: White surface with a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.03)`.
- **Level 2 (Dropdowns/Modals)**: White surface with a more pronounced shadow to indicate interactivity: `0px 10px 30px rgba(0, 0, 0, 0.08)`.
- **Overlays**: A 40% opacity blur (backdrop-filter: blur(8px)) is used behind modals to maintain context while focusing user attention.

## Shapes
The shape language is approachable yet structured. All primary containers (cards, modals) utilize a **12px - 16px** radius to soften the technical nature of the data. Smaller elements like buttons and input fields use an 8px radius (rounded-md equivalent) to maintain a crisp, professional edge within the larger containers.

## Components
Consistent component styling ensures the dashboard remains intuitive.

- **Buttons**: Primary buttons are solid #1929FE with white text. Secondary buttons use a light gray ghost style. All buttons have an 8px corner radius.
- **Cards**: The primary layout unit. Must have 24px internal padding and the Level 1 shadow defined in Elevation.
- **Tables**: Use a "Clean Table" approach—no vertical borders, only 1px #F1F5F9 horizontal dividers. Row hover states should use the background color (#F8FAFC).
- **Status Badges**: Subtly rounded (pill-shaped) with a low-opacity background of the semantic color and high-contrast text (e.g., Success: 10% green background, 100% green text).
- **Inputs**: 1px #E2E8F0 border that shifts to #1929FE on focus. Placeholder text should be #94A3B8.
- **Icons**: 24px stroke-based icons with a consistent 1.5pt line weight.