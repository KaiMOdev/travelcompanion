import { Tabs } from "expo-router";
import { TabBar } from "../../components/TabBar";
import { colors } from "../../theme";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="camera" />
      <Tabs.Screen name="meeting" />
    </Tabs>
  );
}
