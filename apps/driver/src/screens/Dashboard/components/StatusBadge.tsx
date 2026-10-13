import type { Database } from '@glyde/domain';
import { GlydeText, radius, size, space, StatusIcon, useTheme } from '@glyde/ui';
import { StyleSheet, View } from 'react-native';

type Status = Database['public']['Enums']['driver_status'];
const LABEL: Record<Status, string> = { approved: 'Approved', pending: 'Pending Approval', rejected: 'Rejected' };
const TONE = { approved: 'success', pending: 'warning', rejected: 'danger' } as const;

/** uix-spec 3.2 Approval Status Indicator (icon + words, never colour alone). */
export function StatusBadge({ status }: { status: Status }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.badge, { backgroundColor: colors.statusTint[TONE[status]] }]}
      accessible
      accessibilityLabel={`Account status: ${LABEL[status]}`}
    >
      <StatusIcon tone={TONE[status]} />
      <GlydeText variant="headline">{LABEL[status]}</GlydeText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: size.driverTap,
    paddingLeft: space.xs,
    paddingRight: space.md,
    borderRadius: radius.pill,
  },
});
