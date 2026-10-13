# DESIGN.md — Glyde

> Single source of truth for look, feel and motion. All UI code must use these tokens.
> Items marked **(proposed)** are defaults chosen to be sensible, not decisions from the Glyde docs. Change them here and everything follows.
> Items marked **(confirmed)** come from the brand or the UI/UX spec.

## 1. Design intent

Glyde should feel like **Uber's polish applied to a scheduled shuttle**: map-first, calm, fast, confident. The emotional goal is *"I know exactly when I leave and when I arrive."*

Principles:
1. **Certainty over decoration.** Time, location and status are always the most visible things.
2. **One primary action per screen**, large and thumb-reachable.
3. **The map is the home.** UI floats over it; it is never hidden unless the task needs it.
4. **Motion explains.** Animation shows where things came from and where they went; it never exists just to impress, and never blocks the user.
5. **Instant feel.** Optimistic UI, skeletons, no blank screens, no spinners longer than necessary.
6. **Few elements, strong hierarchy.** Big bold type, generous space, one accent colour.

## 2. Brand colour

| Token | Value | Status |
|---|---|---|
| `color.brand.primary` | **`#0CC60C`** | confirmed (Glyde green, from logo) |

The logo is the green "G" with an arrow cut-out, supplied on black. Use the logo as supplied; never recolour, stretch or add effects.

### Contrast rules (important)
- Black/near-black text on `#0CC60C` ≈ **9:1**. Use this for buttons and badges.
- `#0CC60C` text on white ≈ **2.3:1**, which fails accessibility. **Never use green as text on white.** Use it for fills, icons ≥24px, selected states, and highlights only.
- White text on `#0CC60C` fails. Do not do it.

## 3. Colour tokens

### Light theme (default for passenger app)
| Token | Value | Use |
|---|---|---|
| `bg.base` | `#FFFFFF` | screens |
| `bg.subtle` | `#F5F5F5` | cards on white, inputs |
| `bg.sheet` | `#FFFFFF` | bottom sheet |
| `ink.primary` | `#0B0B0B` | main text, primary dark buttons |
| `ink.secondary` | `#5C5C5C` | supporting text |
| `ink.tertiary` | `#8F8F8F` | hints, disabled text |
| `border.default` | `#E3E3E3` | dividers, card borders |
| `brand.primary` | `#0CC60C` | primary accent (confirmed) |
| `brand.pressed` | `#0AA80A` | pressed state **(proposed)** |
| `brand.tint` | `#E7F9E7` | selected backgrounds, subtle highlights **(proposed)** |
| `brand.onPrimary` | `#0B0B0B` | text/icons on green |

### Dark theme (default for Driver app and dashboards' map views) **(proposed)**
| Token | Value |
|---|---|
| `bg.base` | `#000000` |
| `bg.subtle` | `#141414` |
| `bg.sheet` | `#1B1B1B` |
| `ink.primary` | `#FFFFFF` |
| `ink.secondary` | `#B5B5B5` |
| `ink.tertiary` | `#7A7A7A` |
| `border.default` | `#2A2A2A` |

On dark, `#0CC60C` works well as text and icon colour (≈9:1 on black).

### Semantic **(proposed)**
| Token | Value | Use |
|---|---|---|
| `status.success` | `#0CC60C` | boarded, paid, verified |
| `status.warning` | `#F5A524` | "Almost full", "Last seats available", expiring |
| `status.danger` | `#E5484D` | failed scan, payment failure, SOS |
| `status.info` | `#2F80ED` | informational banners |

### Seat states
| State | Style |
|---|---|
| Available | white fill, `border.default` 1.5px |
| Selected | `brand.primary` fill, dark check |
| Unavailable (segment conflict) | `#E3E3E3` fill, no border, 40% opacity icon, non-interactive |
| Yours (confirmed ticket) | `brand.primary` fill with dark ring |

### HQ heatmap (confirmed by spec)
Green zone = high supply / low demand. Red zone = high demand / low supply. Because brand green means "good", add a legend and text labels so colour is never the only signal.

## 4. Typography

Font: **Poppins** **(proposed; matches the Glyde marketing site)**. Fallback: system sans.

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 34 / 40 | 700 | big ETA, success screens |
| `title1` | 28 / 34 | 700 | screen titles, "Where to?" |
| `title2` | 22 / 28 | 600 | section headers, sheet titles |
| `headline` | 17 / 24 | 600 | card titles, bus ETA |
| `body` | 16 / 24 | 400 | default text |
| `callout` | 14 / 20 | 500 | secondary info, chips |
| `caption` | 12 / 16 | 500 | labels, helper text |
| `mono` | 16 / 24 | 500 | ticket IDs, codes, plate numbers |

Rules: numbers that change (fare, ETA, seats left) use **tabular figures** so they don't jitter. Max two weights per screen. Letter-spacing tight on `display`/`title1` (−0.5), default elsewhere.

## 5. Spacing, radius, elevation

- Spacing scale (dp): `4, 8, 12, 16, 20, 24, 32, 48`. Screen side padding **20**.
- Radius: `sm 8`, `md 12`, `lg 16`, `xl 24` (bottom sheet top corners), `pill 999` (buttons, chips).
- Tap target: **min 48×48**; primary buttons **56 high**, full-width inside sheets.
- Elevation: sheet and floating cards use a soft shadow (`0 -4 24 rgba(0,0,0,0.12)` for sheet). No heavy borders on floating elements.
- Driver app (tablet-first): scale type up one step, increase all tap targets to **64**, and use a 2–3 column card grid.

## 6. Iconography and imagery
- One icon family, **outline, 2px stroke**, rounded caps (e.g. Lucide or Phosphor). 24px default, 20px in chips.
- Bus markers on map: top-down bus glyph, brand green when available, dark grey when full or inactive, rotates with heading.
- User location: dark dot with a soft green pulse ring **(proposed)**, to stay on-brand instead of the default blue.

## 7. Core components

| Component | Spec |
|---|---|
| **PrimaryButton** | Pill, 56h, `brand.primary` fill, `onPrimary` text, `headline` weight. Pressed: scale 0.97 + `brand.pressed`. Disabled: `#E3E3E3` fill, `ink.tertiary` text. Loading: label replaced by inline spinner, width unchanged. |
| **SecondaryButton** | Pill, 56h, `ink.primary` fill with white text (light theme) or `bg.subtle` fill. |
| **BottomSheet** | Snap points: collapsed (~18%), half (~50%), full (~92%). Grabber 36×4, `xl` top radius. Map visible and interactive above it at collapsed/half. |
| **LocationInput** | Stacked pickup and drop-off rows joined by a dotted connector line. "+" (add stop) at the end of the pickup row. Recents/saved list below. |
| **BusCard** | Horizontal. Left: bus icon. Centre: ETA (`headline`) + capacity icon with seats left. Right: fare. Selected: 2px `brand.primary` border + `brand.tint` background. "Last seats available" / "Almost full" as `warning` chip. "Last bus" as a distinct chip. |
| **SeatGrid** | Grid matching bus layout, 48×48 seats, 8 gap, driver position shown. States per section 3. Live fare summary pinned under the grid. |
| **TicketCard** | Ticket stub shape with semicircle cut-outs at the sides (same as promo card). Large QR centred, Ticket ID in `mono`, key facts below. |
| **PromoCard** | Coupon style with ticket-stub edge cut-outs, title, validity, icon, dismiss ×. Tap opens Promotions page. |
| **StatusChip** | Pill, `callout`, tinted background of the status colour, dark text. |
| **MetricCard** (dashboards) | Big number (`display`), label (`caption`), delta chip. Count-up on load. |
| **Toast / Banner** | Slides from top (toast) or pinned (banner) with `status.*` accent. Persistent banner for location-denied. |
| **Skeleton** | Rounded blocks with shimmer, same dimensions as final content. |

## 8. The Uber-grade interaction system (the important part)

These are the behaviours that make Uber feel premium. Each is required unless marked optional.

### 8.1 Map-first home with draggable sheet
- Map fills the screen. Sheet anchors at the bottom with "Where to?" as the only prompt.
- Sheet drag is **interruptible and velocity-aware**: a flick snaps to the next snap point; slow drag settles to nearest. Uses spring physics, never fixed-duration tweens.
- As the sheet moves up, the map's **camera padding shifts** so the content of interest (route, bus) stays centred in the visible area above the sheet.
- Content inside the sheet fades and slides in with the snap (opacity 0→1, translateY 12→0), staggered.
- Back or swipe-down collapses the sheet; it never loses entered data.

### 8.2 Smooth, living vehicles
- Bus markers **never teleport**. Interpolate between GPS ticks over the tick interval (linear), and rotate to heading using the **shortest arc**.
- Bus markers glide into view on first appearance (scale 0.6→1, opacity 0→1, 250ms).
- If a GPS tick is late, hold position and dim the marker slightly after 10s; show "Reconnecting…" only after a longer gap.
- The selected/assigned bus has a **soft green pulse ring** (scale 1→1.8, opacity 0.4→0, 1.6s loop).

### 8.3 Route drawing
- On route confirmation, the polyline **draws itself** from pickup to drop-off (600ms, ease-out), then the camera animates to fit route + padding (400ms).
- Pickup and drop-off pins drop in with a small bounce (spring) and a light haptic.
- Intermediate stops appear as small dots fading in sequentially (30ms stagger).

### 8.4 "Instant results" feel
- No Search button. Results appear automatically once pickup + at least one drop-off are set.
- Available-bus list loads with **skeleton cards** (never a blank sheet), then replaces in place.
- List items enter with 40ms stagger, max 8 items animated, the rest appear instantly.
- Fares and ETAs **count/roll to new values** (200ms) rather than snapping, especially when stops are added in multi-stop.
- Optimistic UI: tapping a bus highlights it immediately, before any network work.

### 8.5 Progressive disclosure and one primary action
- Each step shows only what's needed: Where to → Buses → Seats → Pay → Ticket. Each is a sheet state or a short push, never a long form.
- The primary button is always at the bottom, thumb-reachable, and **morphs** with state (Proceed to Payment → Confirm & Pay → View Ticket).
- Secondary details (fare breakdown, trip summary) are expandable, collapsed by default.

### 8.6 State-driven homepage
- Same screen, different sheet content by state: Idle (Where to?) → Active trip card (pre-boarding) → In-trip (route progress). The sheet **morphs** between these with a shared-element style transition, never a hard cut.
- Active trip card shows: pickup → drop-off, live bus ETA, a tappable QR chip. ETA text updates with a gentle cross-fade/roll.
- App restores directly into the active trip state on relaunch.

### 8.7 Boarding and ticket moments
- Opening a ticket: card rises from the sheet (shared-element / scale-up 0.96→1, 260ms).
- Tapping QR expands to full-screen: scale + brightness boost on supported devices, tap again to collapse.
- **Scan success:** QR shrinks and fades out, a green check draws (Lottie or stroke animation, ~700ms), success haptic, then the screen transitions to In-Trip. The ticket details clear from view as the spec requires.
- **Scan failure (driver side):** overlay with shake (±6dp, 3 cycles, 300ms), error haptic, audio alert; auto-dismiss after 2–3s as specified.
- Approaching pickup: sheet shows a **countdown ring** for the waiting window; ring turns `warning` in the final 20%.

### 8.8 Seat selection
- Seats scale to 1.08 with spring on select, fill to green over 120ms, light haptic.
- Unavailable seats do not respond to press except a very subtle "nope" (2dp horizontal nudge) and no haptic.
- Fare summary row updates with the roll animation as seats are added/removed.

### 8.9 Payment
- Payment method rows are selectable cards with a radio that fills with a short spring.
- Processing: button shows spinner; the rest of the screen dims slightly and is non-interactive.
- Success: confetti is **not** used. Use a calm green check draw + success haptic + auto-advance after the animation. Failure: inline error banner slides in, button returns to enabled, retry is one tap.

### 8.10 Notifications and alerts in motion
- In-app trip alerts ("Bus approaching", "Arriving at drop-off") appear as a top banner sliding in with spring, auto-dismiss in 5s, swipe-up to dismiss, with haptic.
- Driver "Approaching [Stop]" modal enters from bottom with audio; ESC or tap acknowledges.

### 8.11 Driver app specifics
- Big glanceable cards, minimal text, high contrast on dark theme.
- Boarding counter (Scanned / Expected / Pending) **counts up** on every successful scan with a brief green flash on the card.
- Timeline: current stop pulses; passing a stop animates the line fill downward.
- SOS is always visible, red, and requires a deliberate confirm step (hold-to-confirm or two-step), never one accidental tap.

### 8.12 Dashboards (web)
- Metric cards **count up** on load (600ms) and flash subtly on live update.
- Live map markers glide; table rows highlight briefly (green→transparent, 800ms) when updated.
- Heatmap layers cross-fade (300ms) when toggled; no pop-in.

## 9. Motion tokens

All durations and easings come from here. No ad-hoc values.

| Token | Value |
|---|---|
| `motion.instant` | 90ms (press feedback) |
| `motion.fast` | 120–150ms (selection, colour fills) |
| `motion.base` | 220–260ms (most transitions) |
| `motion.slow` | 320–400ms (screen/sheet emphasis, camera moves) |
| `motion.draw` | 600ms (route polyline, check draw) |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.enter` | `cubic-bezier(0, 0, 0, 1)` |
| `ease.exit` | `cubic-bezier(0.4, 0, 1, 1)` |
| `spring.sheet` | `{ damping: 20, stiffness: 200, mass: 1 }` |
| `spring.pop` | `{ damping: 14, stiffness: 260, mass: 0.8 }` (pins, seats, checks) |
| `press.scale` | 0.97 |
| `stagger.list` | 40ms, max 8 items |
| `skeleton.shimmer` | 1200ms loop |
| `pulse.ring` | 1600ms loop |

These are **proposed starting values**; tune them on a real device, then update this table.

## 10. Haptics and sound

| Moment | Haptic | Sound |
|---|---|---|
| Selection (seat, bus, method) | Light impact | none |
| Pin drop, snap to sheet point | Light impact | none |
| Confirm / Pay tap | Medium impact | none |
| Payment success, scan success | Success notification | Short soft chime (driver scan: audible) |
| Failure (scan, payment) | Error notification | Error tone on driver scan |
| Bus approaching | Warning notification | Driver: voice "Approaching [Stop Name]" |
| Arrived at stop | Success notification | Driver: voice "Arrived at stop" |

Respect system silent mode and "reduce motion" / "reduce haptics" settings.

## 11. Required states for every screen

| State | Treatment |
|---|---|
| Loading | Skeleton matching final layout (never a bare spinner on a full screen) |
| Empty | Friendly illustration/icon, one-line explanation, one action ("No buses available" → try a different time or route) |
| Error | Plain-language message, retry action, never a raw error code |
| Offline | Persistent slim banner, last known data shown, actions that need network disabled with reason |
| Permission denied | Persistent banner with a button to open settings (e.g. location, as specified) |
| Success | Short, calm confirmation, then auto-advance or clear next action |

## 12. Accessibility
- Contrast ≥ 4.5:1 for text. Follow section 2 rules for green.
- Never rely on colour alone (seat states, heatmap, status): add icon, label or pattern.
- Tap targets ≥ 48dp (64dp on driver tablet).
- Support dynamic type up to 130% without clipping.
- `reduceMotion`: replace movement with 120ms cross-fades; keep functional feedback (seat selected, scan result).
- Screen-reader labels on all controls, QR has a text alternative (Ticket ID).

## 13. Implementation notes (for Claude Code)

- Create `/packages/ui/tokens.ts` exporting colour, type, spacing, radius, motion and spring tokens from this file. Components import from there only.
- Use Reanimated **shared values and worklets** for sheet, marker, seats and pulse animations so they run on the UI thread. Avoid `setState`-driven animation.
- Build these primitives **before any screen**: `BottomSheet` (with map camera padding hook), `AnimatedBusMarker`, `RouteLine` (draw-on), `PrimaryButton`, `Skeleton`, `RollingNumber`, `CheckDraw`, `PulseRing`, `Toast`.
- Each primitive gets a small preview screen in a dev-only "Gallery" route so motion can be reviewed on-device.
- Keep animation logic in hooks (`useSheetSnap`, `useVehicleInterpolation`) separate from layout.
- If an animation drops frames on a mid-range Android device, simplify it. Smoothness beats flourish.
- Do not copy Uber's brand, icons, illustrations or copy. Copy the **interaction principles** only.

## 14. Screen-to-pattern map (quick reference)

| Glyde screen | Key patterns to apply |
|---|---|
| Home (default) | 8.1, 8.2, 8.6 |
| Trip Search / Where To | 8.1, 8.3, 8.4, 8.5 |
| Available Buses | 8.4, BusCard states, skeletons |
| Seat Selection | 8.8, live fare roll |
| Payment / Success | 8.5, 8.9 |
| Ticket / Active Trip | 8.6, 8.7 |
| In-Trip | 8.2, 8.10 |
| Driver Dashboard | 8.11, dark theme, 64dp targets |
| Owner / HQ dashboards | 8.12, count-up metrics, heatmap cross-fade |
| Group Commute (later) | 8.5, 8.6, daily-ticket zero-friction flow |
