# CLAUDE.md — Glyde

> Read this file at the start of every session. Read `DESIGN.md` before touching any UI.
> Never invent features, rules, copy, fares or data that are not in `/docs`. If something is unspecified, check "Open Questions" below, then **ask**.

## 1. What Glyde is

**Glyde — "Commute, Simplified."** A structured, tech-enabled shuttle service for working professionals in Accra, Ghana. Fixed routes, fixed stops, prepaid seats, QR boarding, live bus tracking.

- Pilot routes: **Accra–Dodowa** and **Accra–Oyarifa** (prototype: Accra–Dodowa only).
- Core principles: **Predictability, Comfort, Reliability.** Every UI decision should reduce uncertainty for the commuter.
- It is NOT on-demand ride-hailing. There is no driver matching, no accept/decline. Passengers pick a scheduled bus on a fixed route.

## 2. Source of truth

Place these in `/docs` (convert .docx to .md first so they can be read directly):

| File | Contents |
|---|---|
| `docs/product.md` | Product doc: problem, service operation, QR ticketing, seat logic, corporate phase 2 |
| `docs/uix-spec.md` | Full screen-by-screen UI/UX spec for Passenger, Driver, Bus Owner, HQ apps, plus Group Commute model |
| `docs/roadmap-legal.md` | Company registration and regulatory checklist. **Not relevant to code**; ignore unless asked |

Precedence when documents conflict: `uix-spec.md` > `product.md` > anything in this file. Flag conflicts to the user; do not silently pick one.

## 3. Applications

| App | Users | Form factor |
|---|---|---|
| Passenger App | Commuters | Mobile |
| Driver App | Bus drivers | **Tablet-first**, must also work on mobile |
| Bus Owner Dashboard | Fleet owners | Web |
| HQ / Admin Dashboard | Glyde ops team | Web |

## 4. Tech stack (defaults — edit this section if the stack changes)

- **Mobile (Passenger + Driver):** Expo (React Native) + TypeScript + Expo Router
- **Animation/interaction:** `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `lottie-react-native`, `expo-haptics`
- **Maps:** MapLibre + OpenStreetMap tiles. Note: MapLibre for React Native needs a **development build**, not Expo Go. If Expo Go is required, use `react-native-maps` instead and tell the user.
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions)
- **Dashboards:** Next.js + Tailwind + shadcn/ui
- **Push:** Firebase Cloud Messaging
- **QR:** `qrcode` / `react-native-qrcode-svg` to generate; `expo-camera` to scan

### Mocked in the prototype (do not build for real)
- SMS/email OTP → fixed test code
- Payments (MoMo, card) → sandbox/mock provider behind a `PaymentProvider` interface
- Liveness check and Ghana Card/licence validation → stub that returns success
- GPS from real buses → **GPX replay script** writing to Supabase Realtime

## 5. Repo structure

```
/docs                  specs (source of truth)
/apps/passenger        Expo app
/apps/driver           Expo app (tablet-first)
/apps/dashboard        Next.js (Owner + HQ views)
/packages/ui           shared design tokens + primitives (from DESIGN.md)
/packages/domain       seat-overlap logic, ticket state machine, fare calc, types
/supabase              migrations, seed data, edge functions
/scripts               gps-replay, seed
```

Domain logic (seat allocation, ticket validation, missed-booking rules) lives in `/packages/domain` and in the database. **Never in UI components.**

## 6. Domain rules (non-negotiable)

### Seat allocation (segment-aware)
- Stops on a route are ordered and indexed. A booking occupies a seat only for `[pickup_idx, dropoff_idx)`.
- Two bookings on the same bus trip and seat conflict only if their index ranges overlap.
- A bus that looks "full" must still accept a booking whose segment does not overlap existing ones (e.g. A: Madina→Accra, B: Adenta→Madina can share a seat).
- Enforce at the database level (Postgres exclusion constraint on `(trip_id, seat_no, int4range(pickup_idx, dropoff_idx))`), not only in the client.
- Seat grid UI must reflect segment-aware availability, not total occupancy.

### Booking and boarding
- Booking is allowed only if the bus serves the route and **has not passed the selected pickup point**.
- Payment is prepaid. A seat is reserved at booking, **confirmed only when the QR is scanned at boarding**.
- Ticket validation checks: genuine, paid, matches booking/bus, not already used. On success mark used immediately.
- If QR is not scanned within the allowed waiting period: mark user absent, cancel booking, release seat for reassignment.
- Missed-trip deferments: **maximum 2**. After that the prepaid amount is not refunded. If no valid boarding by end of working day after deferment, ticket is invalid and non-refundable.
- Tickets are created **per seat**, even if paid in a single transaction. Each ticket is shareable via a **time-bound link**: after scan the link shows "On Trip"; after drop-off it is fully invalidated.
- Multi-stop booking: each extra stop is a separate person's journey; total fare updates dynamically.
- Drivers **cannot** manually add passengers or override a scan result.
- Scan failure fallback: the scanning device offers manual entry of the Ticket ID / fallback onboarding code. Failure messages: ticket does not exist, or ticket already used.
- Payment failure: show error, allow retry or different method; seat is held briefly, then released.

### Driver
- Driver status: Pending Approval / Approved / Rejected. Only Approved drivers can start a trip.
- "Start Trip" is enabled only after route (bus number, start, end) is set. Trips auto-end at final destination; driver may End Trip early.
- SOS: driver describes issue, confirms, active trip auto-ends, high-priority alert to HQ.
- Approaching or arriving at a stop: modal plus audio alert ("Approaching [Stop Name]", "Arrived at stop").

### Owner / HQ
- Driver invite: owner generates invite code, sent by SMS, **expires in 48 hours**, resend invalidates the old code.
- HQ actions: Broadcast Message, Dynamic Pricing Toggle, Deploy Standby.
- Fare anatomy: base fare + booking fee (fixed per seat) + platform fee (%) − discounts.

### Group Commute (build after passenger vertical slice)
- Monthly, fixed 30-day cycles. Paying members must exactly equal bus seat count. Wallet-only payments. No mid-cycle joins. Fixed seat per member for the cycle. Bus exclusive to the group. Auto-generated morning and evening QR tickets daily. Renewal reminders at 7 days, 3 days, 24 hours. Full rules in `docs/uix-spec.md` sections 8–14.

### Corporate Reserved Service (Phase 2)
- Staff accounts tagged to a company; rides billed to the corporate account; settlement report per cycle. Do not build until asked.

## 7. How to work (rules for Claude Code)

1. **One screen or one feature per task.** Name the spec section (e.g. "Build 2.3 Seat Selection").
2. **Plan first** for anything touching more than 2 files. Show the plan, wait for approval.
3. **Spec first.** Before building a screen, quote back the relevant spec requirements as a checklist, then build against it.
4. **Use tokens only.** No hard-coded colors, spacing, font sizes or animation durations. Everything comes from `/packages/ui` tokens defined in `DESIGN.md`.
5. **Every screen ships with all its states:** loading (skeleton), empty, error, offline, and success. A screen without them is not done.
6. **Every interactive element has press feedback and a haptic** where `DESIGN.md` specifies one.
7. **Run it.** After a change, run the type-check and lint, and start the app if possible. Report what you actually verified. Don't claim it works if you didn't run it.
8. **Small commits**, one per working screen or feature. Message format: `feat(passenger): seat selection grid`.
9. **Fix narrowly.** When something looks wrong, fix that specific thing. Don't rebuild the screen.
10. **No new dependencies without saying why.** Prefer what's in section 4.
11. **Don't touch `/docs`.** If the spec seems wrong, say so.

## 8. Code conventions

- TypeScript strict. No `any` without a comment.
- Functional components, hooks, named exports.
- Co-locate: `ScreenName/index.tsx`, `components/`, `hooks/`, `ScreenName.test.ts`.
- Data access through typed hooks (`useAvailableBuses`, `useTicket`, …), not inline Supabase calls in components.
- Realtime subscriptions are cleaned up on unmount.
- Currency: Ghana cedis, format `GHS 12.50`. Store money as integer pesewas.
- Times: store UTC, display Africa/Accra.
- Accessibility: min tap target 48×48dp, labels on all controls, respect reduce-motion.

## 9. Prototype scope (build in this order)

1. Tokens, motion primitives, bottom sheet, map with animated bus marker
2. Supabase schema, seed (Accra→Dodowa stops), seat-overlap constraint, GPS replay script
3. Passenger: Splash → Landing → Register (test OTP) → Profile → T&C → Permissions → Home
4. Passenger: Where to → Available Buses → Seat Selection → Payment (mock) → Success → Ticket → Pre-boarding → Boarding → In-trip → Trip end
5. Driver: Login → Dashboard Overview → QR scan overlay → Trip timeline and alerts → SOS
6. One dashboard (Bus Owner per-bus view **or** HQ Global Pulse), ask the user which
7. Then: Payments/Activity/Account tabs, Group Commute, Corporate

## 10. Open questions — ASK, do not guess

These are not defined in the docs. If a task depends on one, stop and ask the user (offer multiple-choice options where possible):

- Fare formula (per-stop, per-km, or flat per route?) and actual values
- Booking-fee and platform-fee amounts
- The "allowed pickup waiting period" length
- The ordered stop list for Accra–Dodowa and Accra–Oyarifa, with coordinates
- Bus seat layouts (e.g. 30-seater Toyota Coaster row/column layout)
- Whether the "Ticket ID manual entry" and the "manual onboarding code" are the same fallback or two mechanisms
- Scanner hardware: bus-mounted turnstile, conductor handheld, or driver device (affects Driver app QR screen)
- Ticket share-link expiry duration
- How a deferment is requested and applied
- Group monthly package pricing per bus
- Driver rating calculation
- Which dashboard to build first for the prototype
