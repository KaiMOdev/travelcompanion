import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Travel",
          tabBarLabel: "Travel",
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarLabel: "Camera",
        }}
      />
      <Tabs.Screen
        name="meeting"
        options={{
          title: "Meeting",
          tabBarLabel: "Meeting",
        }}
      />
    </Tabs>
  );
}
