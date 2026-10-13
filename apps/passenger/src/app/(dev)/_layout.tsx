import { Redirect, Stack } from 'expo-router';

/** Dev-only routes. Release builds redirect away. */
export default function DevLayout() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
