import { formatGhanaPhone } from '@glyde/domain';
import { GlydeText, hapticFor, radius, size, space, StatusChip, useTheme } from '@glyde/ui';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Driver } from '@/features/driver/useDriver';
import { supabase } from '@/lib/supabase';

/** Signed URL lifetime for the profile photo (private bucket). */
const PHOTO_URL_TTL_S = 3600;

/** Profile menu → Account (read-only driver details) or Settings (voice alerts). */
export function AccountModal({
  mode,
  driver,
  phone,
  voice,
  onVoice,
  onClose,
}: {
  mode: 'account' | 'settings' | null;
  driver: Driver;
  phone: string | null;
  voice: boolean;
  onVoice: (on: boolean) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'account' || !driver.photo_path) return;
    let cancelled = false;
    void supabase.storage
      .from('driver-photos')
      .createSignedUrl(driver.photo_path, PHOTO_URL_TTL_S)
      .then(({ data }) => {
        if (!cancelled && data) setPhoto(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, driver.photo_path]);

  const rows: [string, string | null][] = [
    ['Phone', phone ? formatGhanaPhone(phone) : null],
    ['Date of birth', driver.date_of_birth],
    ['Residential area', driver.residential_area],
    ['Ghana Card', driver.ghana_card_number],
    ['Driver’s licence', driver.licence_number],
  ];

  return (
    <Modal visible={!!mode} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.bg.base }]}>
        <View style={styles.head}>
          <GlydeText variant="title1" style={styles.flex}>
            {mode === 'settings' ? 'Settings' : 'Account'}
          </GlydeText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <X size={size.icon} strokeWidth={size.iconStroke} color={colors.ink.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl }]}>
          {mode === 'settings' ? (
            <View style={[styles.row, { backgroundColor: colors.bg.subtle }]}>
              <View style={styles.flex}>
                <GlydeText variant="headline">Voice alerts</GlydeText>
                <GlydeText variant="callout" tone="secondary">
                  Speak “Approaching [stop]” and “Arrived at stop”, and scan results.
                </GlydeText>
              </View>
              <Switch
                value={voice}
                accessibilityLabel="Voice alerts"
                trackColor={{ true: colors.brand.primary, false: colors.border.default }}
                onValueChange={(v) => {
                  hapticFor('selection');
                  onVoice(v);
                }}
              />
            </View>
          ) : (
            <>
              <View style={styles.profile}>
                <View style={[styles.avatar, { backgroundColor: colors.bg.subtle }]}>
                  {photo && (
                    <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} accessibilityLabel="Profile photo" />
                  )}
                </View>
                <View style={styles.flex}>
                  <GlydeText variant="title2">
                    {driver.first_name} {driver.last_name}
                  </GlydeText>
                  <StatusChip
                    label={
                      driver.status === 'approved'
                        ? 'Approved'
                        : driver.status === 'pending'
                          ? 'Pending Approval'
                          : 'Rejected'
                    }
                    tone={driver.status === 'approved' ? 'success' : driver.status === 'pending' ? 'warning' : 'danger'}
                  />
                </View>
              </View>
              {rows.map(([label, value]) => (
                <View key={label} style={[styles.row, { borderColor: colors.border.default }, styles.divider]}>
                  <GlydeText variant="callout" tone="secondary" style={styles.flex}>
                    {label}
                  </GlydeText>
                  <GlydeText variant="body">{value ?? '—'}</GlydeText>
                </View>
              ))}
              <GlydeText variant="caption" tone="tertiary">
                To change these details, contact your bus owner.
              </GlydeText>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, gap: space.xxs },
  head: { flexDirection: 'row', alignItems: 'center', padding: space.screenX },
  close: { width: size.driverTap, height: size.driverTap, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space.screenX, gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.driverTap,
    borderRadius: radius.md,
    padding: space.md,
  },
  divider: { borderBottomWidth: size.hairline, borderRadius: 0, paddingHorizontal: 0 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md },
  avatar: { width: size.driverTap * 1.5, height: size.driverTap * 1.5, borderRadius: radius.pill, overflow: 'hidden' },
});
