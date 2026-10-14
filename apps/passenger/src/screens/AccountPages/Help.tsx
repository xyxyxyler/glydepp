import {
  Banner,
  GlydeText,
  hapticFor,
  PrimaryButton,
  radius,
  size,
  space,
  TextField,
  useTheme,
  useToast,
} from '@glyde/ui';
import { Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { PageScaffold } from '@/components/PageScaffold';
import { SUPPORT_CONTACTS } from '@/features/support/contacts';
import { useSupport, type SupportCategory } from '@/features/support/useSupport';
import { formatAccraDate } from '@/features/time/format';

const CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: 'trip', label: 'A trip' },
  { id: 'payment', label: 'A payment' },
  { id: 'ticket', label: 'A ticket' },
  { id: 'account', label: 'My account' },
  { id: 'other', label: 'Something else' },
];
const STATUS: Record<string, string> = { open: 'Received', in_progress: 'In progress', resolved: 'Resolved' };

/** Help & Support (Account tab, uix-spec 2.9): contacts + "Report a problem" saved for HQ. */
export function HelpScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { requests, file } = useSupport();
  const [category, setCategory] = useState<SupportCategory>('trip');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const contacts: { label: string; value: string | null; Icon: LucideIcon; url: (v: string) => string }[] = [
    { label: 'Call us', value: SUPPORT_CONTACTS.phone, Icon: Phone, url: (v) => `tel:${v}` },
    {
      label: 'WhatsApp',
      value: SUPPORT_CONTACTS.whatsapp,
      Icon: MessageCircle,
      url: (v) => `https://wa.me/${v.replace(/\D/g, '')}`,
    },
    { label: 'Email', value: SUPPORT_CONTACTS.email, Icon: Mail, url: (v) => `mailto:${v}` },
  ];
  const anyContact = contacts.some((c) => c.value);

  const send = async () => {
    if (message.trim().length < 10) {
      hapticFor('failure');
      setError('Tell us a little more (at least 10 characters).');
      return;
    }
    setSending(true);
    const r = await file(category, message);
    setSending(false);
    if (r === 'ok') {
      hapticFor('paymentSuccess');
      setMessage('');
      toast.show({ tone: 'success', title: 'Thanks — we’ve got your report', message: 'Our team will look into it.' });
      return;
    }
    hapticFor('failure');
    setError(
      r === 'offline' ? 'You’re offline. Try again when you’re connected.' : 'We couldn’t send that. Please try again.',
    );
  };

  return (
    <PageScaffold title="Help & Support">
      <View style={styles.section}>
        <GlydeText variant="title2">Contact us</GlydeText>
        {anyContact ? (
          contacts
            .filter((c) => c.value)
            .map((c) => (
              <Pressable
                key={c.label}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(c.url(c.value as string))}
                style={({ pressed }) => [
                  styles.contact,
                  { borderColor: colors.border.default },
                  pressed && { backgroundColor: colors.bg.subtle },
                ]}
              >
                <c.Icon size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
                <View style={styles.flex}>
                  <GlydeText variant="body">{c.label}</GlydeText>
                  <GlydeText variant="caption" tone="secondary">
                    {c.value}
                  </GlydeText>
                </View>
              </Pressable>
            ))
        ) : (
          <Banner
            tone="info"
            message="Phone, WhatsApp and email support details are coming soon. Meanwhile, report a problem below."
          />
        )}
      </View>

      <View style={styles.section}>
        <GlydeText variant="title2">Report a problem</GlydeText>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="What is it about?">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  hapticFor('selection');
                  setCategory(c.id);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.ink.primary : colors.bg.base,
                    borderColor: active ? colors.ink.primary : colors.border.default,
                  },
                ]}
              >
                <GlydeText variant="callout" tone={active ? 'inverse' : 'primary'}>
                  {c.label}
                </GlydeText>
              </Pressable>
            );
          })}
        </View>
        <TextField
          label="What happened?"
          value={message}
          onChangeText={(t) => {
            setMessage(t);
            setError(null);
          }}
          placeholder="Include the date, route or Ticket ID if you can."
          multiline
          error={error}
        />
        <PrimaryButton label="Send report" loading={sending} haptic="confirm" onPress={() => void send()} />
      </View>

      {requests && requests.length > 0 && (
        <View style={styles.section}>
          <GlydeText variant="title2">Your reports</GlydeText>
          {requests.map((r) => (
            <View key={r.id} style={[styles.report, { borderColor: colors.border.default }]}>
              <GlydeText variant="caption" tone="secondary">
                {formatAccraDate(Date.parse(r.createdAt))} · {CATEGORIES.find((c) => c.id === r.category)?.label} ·{' '}
                {STATUS[r.status] ?? r.status}
              </GlydeText>
              <GlydeText variant="callout" numberOfLines={3}>
                {r.message}
              </GlydeText>
            </View>
          ))}
        </View>
      )}
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: space.sm },
  contact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.tapMin + space.xs,
    paddingHorizontal: space.md,
    borderWidth: size.hairline,
    borderRadius: radius.lg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    minHeight: size.tapMin - space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    justifyContent: 'center',
  },
  report: { borderWidth: size.hairline, borderRadius: radius.md, padding: space.sm, gap: space.xxs },
});
