import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';

/** uix-spec 2.9 Navigation Structure (Passenger App). */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="payments" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
