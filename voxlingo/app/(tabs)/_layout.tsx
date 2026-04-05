import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { DestinationProvider } from '../../contexts/DestinationContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <DestinationProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
            borderTopWidth: 1,
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Travel',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '🎙️' : '🎤'}</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="culture"
          options={{
            title: 'Culture',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '📖' : '📚'}</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '🧭' : '🧭'}</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="camera"
          options={{
            title: 'Camera',
            tabBarIcon: ({ focused }) => (
              <Text style={styles.tabIcon}>{focused ? '📸' : '📷'}</Text>
            ),
          }}
        />
      </Tabs>
    </DestinationProvider>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabIcon: {
    fontSize: 20,
  },
});
