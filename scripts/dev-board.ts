/**
 * Dev helper: board a passenger's ticket the way the conductor's scanner will — by calling
 * validate_ticket() signed in as the approved test driver. Lets the passenger journey
 * (boarding → in-trip → drop-off) be tested before the Driver app's scanner exists.
 *
 *   npm run dev:board                 # newest paid, unscanned ticket on a trip today
 *   npm run dev:board -- GLY-7K3QX9   # a specific Ticket ID
 */
import { createClient } from '@supabase/supabase-js';

import { internalEmailForPhone } from '../packages/domain/src/identity.ts';
import type { Database } from '../packages/domain/src/database.types.ts';

process.loadEnvFile(new URL('../.env.local', import.meta.url));
process.loadEnvFile(new URL('../apps/passenger/.env.local', import.meta.url));
const url = process.env.SUPABASE_URL as string;
const admin = createClient<Database>(url, process.env.SUPABASE_SECRET_KEY as string, { auth: { persistSession: false } });

const code = process.argv[2];
const dayStart = new Date();
dayStart.setUTCHours(0, 0, 0, 0); // Africa/Accra is UTC+0

let query = admin
  .from('tickets')
  .select('ticket_code, trip_id, seat_no, created_at, trips!inner(departs_at, status, buses(plate))')
  .eq('status', 'reserved')
  .in('trips.status', ['scheduled', 'active'])
  .gte('trips.departs_at', dayStart.toISOString())
  .order('created_at', { ascending: false })
  .limit(1);
if (code) query = query.eq('ticket_code', code.toUpperCase());
const { data: tickets, error } = await query;
if (error) throw error;
const ticket = tickets?.[0];
if (!ticket) {
  console.log(code ? `No paid, unscanned ticket ${code} on a trip today.` : 'No paid, unscanned tickets on trips today. Book one first.');
  process.exit(1);
}

// Sign in as the approved test driver and scan, exactly like the scanner will.
const driver = createClient<Database>(url, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string, { auth: { persistSession: false } });
const { error: authError } = await driver.auth.signInWithPassword({
  email: internalEmailForPhone(process.env.DRIVER_TEST_PHONE as string),
  password: process.env.DRIVER_TEST_PASSWORD as string,
});
if (authError) throw new Error(`Test driver sign-in failed (npm run seed:driver?): ${authError.message}`);
const { data: result, error: scanError } = await driver.rpc('validate_ticket', { p_trip_id: ticket.trip_id, p_code: ticket.ticket_code });
if (scanError) throw scanError;
console.log(`Scan ${ticket.ticket_code} on ${ticket.trips.buses?.plate} (seat ${ticket.seat_no}):`, result);
console.log(`\nTo drive the bus to the drop-off: npm run gps:replay -- --trip ${ticket.trip_id}`);
