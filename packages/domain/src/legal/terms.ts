/**
 * Terms & Conditions shown during onboarding (uix-spec 2.1).
 *
 * PLACEHOLDER: Glyde has not supplied its legal terms yet (shared by the passenger and driver apps). The sections below only restate rules
 * already in docs/product.md and CLAUDE.md §6 so the screen can be built and tested. Replace the
 * whole TERMS object with the real text and bump `version` — acceptance is stored per version.
 */
export const TERMS = {
  version: 'placeholder-2026-10-14',
  title: 'Terms & Conditions',
  notice: 'PLACEHOLDER — the full legal terms will be supplied by Glyde before launch.',
  sections: [
    {
      heading: 'The service',
      body: 'Glyde is a structured shuttle service on fixed routes with fixed stops. Seats are booked in advance through the app and confirmed with a QR code ticket when you board.',
    },
    {
      heading: 'Prepaid bookings',
      body: 'All bookings are paid in advance. A seat is reserved when you book and is confirmed only when your QR code is scanned at boarding.',
    },
    {
      heading: 'Boarding and missed pickups',
      body: 'If your QR code is not scanned within the allowed waiting period at your pickup point, you are marked absent, the booking is cancelled and the seat is released to other passengers.',
    },
    {
      heading: 'Deferments and refunds',
      body: 'A limited number of missed-trip deferments is allowed (a maximum of two). Once the allowed number of missed bookings is exceeded, the prepaid amount is not refunded. If no valid boarding takes place by the end of the working day after a deferment, the ticket becomes invalid and the fare is not refunded.',
    },
    {
      heading: 'Tickets',
      body: 'A ticket is created for each seat, even when several seats are paid for together. Each ticket can be shared through a time-limited link. After the ticket is scanned the link shows that the trip is in progress, and after drop-off it is no longer valid.',
    },
    {
      heading: 'On the bus',
      body: 'Each ticket can be used once. Drivers cannot add passengers manually or override a scan result.',
    },
  ],
} as const;
