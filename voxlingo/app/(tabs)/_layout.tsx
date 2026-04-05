import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1565c0',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Travel',
          tabBarIcon: () => null,
          tabBarLabel: '🎙️ Travel',
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: () => null,
          tabBarLabel: '📷 Camera',
        }}
      />
    </Tabs>
  );
}
