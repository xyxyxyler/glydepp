import { Skeleton, size, space, useTheme, useToast } from '@glyde/ui';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useNetwork } from '@/features/network/useNetwork';
import { useProfile } from '@/features/profile/useProfile';
import { ProfileForm } from '@/screens/ProfileSetup';

/** Account → Edit profile: the Profile Setup form, saving in place. */
export default function EditProfile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { state, save } = useProfile();
  const { network } = useNetwork();

  if (state.status === 'signed-out') return <Redirect href="/landing" />;
  return (
    <View style={[styles.root, { backgroundColor: colors.bg.base, paddingTop: insets.top }]}>
      <ScreenHeader backLabel="Back to account" />
      {state.status === 'loading' ? (
        <View style={styles.pad}>
          <Skeleton height={size.button * 5} radius="lg" />
        </View>
      ) : (
        <ProfileForm
          initial={state.profile}
          loadFailed={state.loadFailed}
          stopNames={network?.stops.map((s) => s.name) ?? []}
          save={save}
          title="Edit profile"
          submitLabel="Save"
          onSaved={() => {
            toast.show({ tone: 'success', title: 'Profile updated' });
            router.back();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, pad: { paddingHorizontal: space.screenX } });
