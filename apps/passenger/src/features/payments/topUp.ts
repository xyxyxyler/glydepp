import type { MomoNetwork } from '@/features/booking/pay';
import { supabase } from '@/lib/supabase';

/** Top-up limits and quick picks (decision 2026-10-14), in pesewas. Server enforces the same limits. */
export const TOP_UP = { min: 500, max: 100_000, quickPicks: [2_000, 5_000, 10_000, 20_000] } as const;

export type TopUpResult = { status: 'succeeded'; balancePesewas: number } | { status: 'failed'; reason: string };

/** Add funds to the wallet via MoMo or card (mock PaymentProvider in the prototype). */
export async function topUp(
  amountPesewas: number,
  method: 'momo' | 'card',
  details: { network: MomoNetwork; phone: string } | { testOutcome: 'approve' | 'decline' },
): Promise<TopUpResult> {
  const { data, error } = await supabase.functions.invoke<{
    status: string;
    balance_pesewas?: number;
    reason?: string;
  }>('pay', { body: { action: 'top_up', amount_pesewas: amountPesewas, method, details } });
  if (error || !data)
    return { status: 'failed', reason: 'We couldn’t reach the payment service. Check your connection and try again.' };
  if (data.status === 'succeeded') return { status: 'succeeded', balancePesewas: data.balance_pesewas ?? 0 };
  return { status: 'failed', reason: data.reason ?? 'The payment didn’t go through. Please try again.' };
}
