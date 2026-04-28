import { Stack } from 'expo-router';
import React from 'react';
import { AppProvider } from './context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="notices/[id]" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="settings/notification-settings" />
      </Stack>
    </AppProvider>
  );
}
