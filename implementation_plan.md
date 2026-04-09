# Pipol UI Redesign — Match Web Version

Transform the current dark-themed React Native app into a pixel-perfect replica of the Pipol web version (light glassmorphic design with yellow #eab308 primary, white glass panels, 3D Mapbox standard style, rounded-[25px] elements).

## Proposed Changes

### Foundation — Theme & Layout

#### [MODIFY] [tailwind.config.js](file:///home/roman/Escritorio/dev/pipol/tailwind.config.js)
- Replace dark palette with light theme colors: `glass` (rgba(255,255,255,0.7)), `glass-border` (rgba(200,200,200,0.3)), body `#F5F5F5`
- Keep `accent` palette (#eab308 primary instead of #F5C518)
- Add `glass-blur`, `glass-sm` utilities for glassmorphism
- Keep the `dark` color available for dark text

#### [MODIFY] [_layout.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/_layout.tsx)
- Glassmorphic bottom tab bar: `bg-white/70 backdrop-blur-lg rounded-[25px] shadow-lg shadow-black/15 border border-gray-200/30`
- Active tab color: `#eab308` (yellow)
- Inactive tab color: `#6B7280` (gray-500)  
- Tab bar floats above content with bottom padding ~45px
- Match web's `px-2 py-1 h-[58px]` inner container
- 5 tabs: Inicio (home), Vibes (film), Descubrir (search+sparkle), Chats (message-square), Perfil (user)

---

### Home Screen

#### [MODIFY] [index.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/index.tsx)
- **Map**: Change from `mapbox://styles/mapbox/dark-v11` → `mapbox://styles/mapbox/standard` (3D buildings visible in screenshots)
- **Search bar**: White glass pill at top with gray placeholder text "¿De qué quieres participar hoy?" and filter icon (funnel) on right side. White background with subtle shadow, not dark bg
- **Floating side buttons**: Left side stack: 2D toggle, bell (notifications), location pin — each white circular with shadow
- **Bottom CTAs**: Two buttons at bottom above tab bar: "Cosas que hacer" (white outlined pill with compass icon) and "Crear un evento" (yellow filled pill with + icon)
- **Markers**: Circular 48x48 white markers with event photo inside (or category icon), with shadow — matching web screenshots
- **Long-press menu**: White card popup with "¿Qué quieres hacer?" options

#### [MODIFY] [FloatingButton.tsx](file:///home/roman/Escritorio/dev/pipol/components/FloatingButton.tsx)
- Change to yellow pill style with rounded-full, bg-accent-400, shadow

---

### Descubrir Screen

#### [MODIFY] [descubrir.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/descubrir.tsx)
- **Background**: White/light gray (`#F5F5F5`)
- **Header**: "Descubrir" in black bold, subtitle in gray
- **Search bar**: White rounded pill with gray placeholder
- **Filter bar**: Horizontal pills (Filtros, icons for categories) with borders
- **Category sections**: White cards with colored icons: Eventos, Planes, Actividades Grupales, Experiencias — each with count and "Ver todos" link
- **Glassmorphic discover events panel**: When triggered, shows a blurred overlay with filters (dropdowns, distance slider with yellow thumb, event list with thumbnails)

---

### Vibes Screen

#### [MODIFY] [vibes.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/vibes.tsx)
- Keep full-screen TikTok style but match web design:
  - Top-left: User avatar + name
  - Top-right: Yellow "Gratis" / price badge
  - Bottom-left: Event title (bold white), description, location + date
  - Right side: Action buttons (heart, chat, share) — white icons
  - Bottom: Yellow rounded "Ver detalles del evento" CTA button with info icon
  - Yellow underline on "Vibes" tab when active

---

### Chats Screen

#### [MODIFY] [chats.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/chats.tsx)
- Light background
- White chat item cards with subtle borders
- Gray text for subtitles, black for titles
- Category badges with colored backgrounds

---

### Perfil Screen

#### [MODIFY] [perfil.tsx](file:///home/roman/Escritorio/dev/pipol/app/(tabs)/perfil.tsx)
- Light background
- White profile card with subtle shadow
- Yellow accent for stats highlights
- Light input/interest picker cards
- Yellow active tab indicator

---

### Event Detail

#### [MODIFY] [[id].tsx](file:///home/roman/Escritorio/dev/pipol/app/event/[id].tsx)
- **Top**: Map preview of event location with marker
- **Bottom sheet style**: White card that slides up with event info
- **Category badge**: Small colored pill (e.g. "Music" in purple)
- **Title**: Large black bold text
- **Date row**: Icon + "Mar 20, 2026 08:00 PM"
- **Audience row**: Icon + "Destinado Para: Todas Las Personas"
- **Attendees row**: Icon + colored avatar circles + count
- **Price row**: Icon + "$3500.00"
- **Bottom**: Heart icon + "Compartir" + yellow "Quiero unirme" CTA
- **Comments section** with text input

---

### Create Event

#### [MODIFY] [create-event.tsx](file:///home/roman/Escritorio/dev/pipol/app/create-event.tsx)
- **Header**: "← Crear evento" with X close button, white bg
- **Scrollable form** with section cards that have yellow left border:
  - "Detalles del Evento" section: Title field, Category dropdown, Description textarea
  - "Fecha y hora" section: Date picker, Start time, End time
  - "Tipo de acceso" section: Gratuito dropdown
  - "Privacidad del evento" section: Público dropdown
  - "Destinado Para" section: Todas las Personas dropdown
  - "Fotos y videos del evento" section: Photo grid + add buttons
- **Bottom**: "← Cancelar" and yellow "Crear Evento" button
- Light background, white inputs/cards, gray labels

---

### Auth Screen

#### [MODIFY] [auth.tsx](file:///home/roman/Escritorio/dev/pipol/app/auth.tsx)
- Light background
- White input fields with gray borders
- Yellow "Entrar" / "Crear cuenta" CTA button
- Yellow "P" logo badge

---

### Supporting Components

#### [MODIFY] [EventCard.tsx](file:///home/roman/Escritorio/dev/pipol/components/EventCard.tsx)
- White card with thumbnail image on left, title + category + date + distance on right
- Light shadow, rounded corners

#### [MODIFY] [CategoryBadge.tsx](file:///home/roman/Escritorio/dev/pipol/components/CategoryBadge.tsx)
- Colored icon + text on light background

---

## Verification Plan

### Build Check
- Run `npx expo export --platform ios 2>&1 | head -30` to verify no TypeScript/build errors

### Manual Visual Verification
Since this is a visual UI redesign, the primary verification is visual comparison:

1. User runs `npx expo start --dev-client` on their device
2. Compare each screen side-by-side with the screenshots in [screenshots-pipol/](file:///home/roman/Escritorio/dev/pipol/screenshots-pipol):
   - **Home**: Full-screen 3D map with glassmorphic search bar, floating buttons, bottom CTAs, bottom nav
   - **Vibes**: Full-screen event cards with overlaid text and yellow CTA
   - **Descubrir**: White background with category sections and filter options
   - **Create Event**: Light form with yellow-bordered section cards
   - **Event Detail**: White card with info rows and yellow join CTA
   - **Auth**: Light theme with yellow CTA

> [!IMPORTANT]
> This is a visual-only change — no business logic, routing, or data flow is altered. All Supabase/auth/events hooks remain identical. The verification is primarily visual comparison against the web screenshots.
