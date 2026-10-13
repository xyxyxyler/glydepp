import { supabase } from '@/lib/supabase';

export type PayMethod = 'wallet' | 'momo' | 'card';
export type MomoNetwork = 'mtn' | 'telecel' | 'airteltigo';
export type PayDetails =
  { network: MomoNetwork; phone: string } | { testOutcome: 'approve' | 'decline' } | Record<string, never>;
export type PayResult = { status: 'succeeded' } | { status: 'failed'; reason: string } | { status: 'expired' };

/** Pay for a held booking through the `pay` edge function (mock PaymentProvider in the prototype). */
export async function payBooking(paymentId: string, method: PayMethod, details: PayDetails): Promise<PayResult> {
  const { data, error } = await supabase.functions.invoke<PayResult>('pay', {
    body: { payment_id: paymentId, method, details },
  });
  if (error || !data) {
    return { status: 'failed', reason: 'We couldn’t reach the payment service. Check your connection and try again.' };
  }
  return data;
}
