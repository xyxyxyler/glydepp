import { useLocalSearchParams } from 'expo-router';

import { ComingSoon } from '@/components/ComingSoon';

/** Account sub-pages scheduled in later steps (honest placeholders — no invented content). */
const TOPICS: Record<string, { title: string; body: string }> = {
  promotions: {
    title: 'Promotions',
    body: 'Discounts and offers available to you will be listed here. Coming in step 6.',
  },
  help: {
    title: 'Help & Support',
    body: 'Ways to reach Glyde support will be listed here. Coming in step 5 — the support contacts still need to be supplied.',
  },
  faqs: { title: 'FAQs', body: 'Answers to common questions will be listed here. Coming in step 5.' },
  verification: {
    title: 'Verification',
    body: 'Your verification status is shown on the Account page. Adding and verifying an email comes in step 5.',
  },
  settings: {
    title: 'Settings',
    body: 'Language (English), privacy and notification preferences. Coming in step 5.',
  },
};

export default function AccountTopic() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const t = TOPICS[topic ?? ''] ?? { title: 'Not found', body: 'This page doesn’t exist.' };
  return <ComingSoon title={t.title} body={t.body} back />;
}
