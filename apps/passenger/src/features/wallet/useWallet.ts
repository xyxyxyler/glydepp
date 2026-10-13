import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/** The passenger's wallet balance in pesewas (opens the wallet with the prototype test balance). */
export function useWallet() {
  const [balance, setBalance] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_wallet');
    if (!error && typeof data === 'number') setBalance(data);
  }, []);
  useEffect(() => {
    void supabase.rpc('my_wallet').then(({ data, error }) => {
      if (!error && typeof data === 'number') setBalance(data);
    });
  }, []);
  return { balance, refresh };
}
