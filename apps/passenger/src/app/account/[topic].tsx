import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/ComingSoon';

/** Account sub-pages scheduled in later steps (honest placeholders — no invented content). Promotions: step 6. */
const TOPICS: Record<string, { title: string; body: string }> = {
  promotions: {
    title: 'Promotions',
    body: 'Discounts and offers available to you will be listed here. Coming in step 6.',
  },
};

export default function AccountTopic() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const t = TOPICS[topic ?? ''] ?? { title: 'Not found', body: 'This page doesn’t exist.' };
  return <ComingSoon title={t.title} body={t.body} back />;
}
