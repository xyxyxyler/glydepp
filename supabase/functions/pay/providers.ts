/**
 * PaymentProvider (CLAUDE.md §4: payments are a sandbox/mock behind this interface).
 * A real provider (e.g. Paystack, Hubtel, MTN MoMo API) implements the same `charge`.
 */
export type MomoNetwork = 'mtn' | 'telecel' | 'airteltigo';
export type ChargeRequest =
  | { method: 'momo'; amountPesewas: number; reference: string; network: MomoNetwork; phone: string }
  | { method: 'card'; amountPesewas: number; reference: string; testOutcome: 'approve' | 'decline' };

export type ChargeResult = { ok: true; providerRef: string } | { ok: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

/** Simulated approval time (a MoMo prompt / hosted card page). */
const APPROVAL_DELAY_MS = 1800;

/**
 * MOCK provider for the prototype. Deterministic test inputs so failure can be demoed:
 * - MoMo number ending 000 → declined; ending 111 → not approved in time
 * - Card: the test card page's "Decline" choice → declined
 * Everything else succeeds after a short delay. No money moves.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    await new Promise((r) => setTimeout(r, APPROVAL_DELAY_MS));
    if (request.method === 'momo') {
      if (request.phone.endsWith('000')) return { ok: false, reason: 'Your Mobile Money provider declined the payment.' };
      if (request.phone.endsWith('111')) return { ok: false, reason: 'The payment wasn’t approved on your phone in time.' };
    }
    if (request.method === 'card' && request.testOutcome === 'decline') {
      return { ok: false, reason: 'Your card was declined.' };
    }
    return { ok: true, providerRef: `MOCK-${request.method.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}` };
  }
}
