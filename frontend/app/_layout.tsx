import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { getToken } from './services/api';

function RootLayoutNav() {
  const { userProfileStatus, isAuthInitialized } = useAppContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthInitialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const isAuthenticated = !!userProfileStatus.email;

    if (!isAuthenticated && !inAuthGroup) {
      // 인증되지 않았는데 인증 페이지가 아니면 로그인으로
      router.replace('/auth/login');
    } else if (isAuthenticated && inAuthGroup) {
      // 인증되었는데 인증 페이지에 있으면 메인으로
      router.replace('/(tabs)');
    }
  }, [isAuthInitialized, userProfileStatus.email, segments]);

  if (!isAuthInitialized) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="alerts" />
      <Stack.Screen name="notices/[id]" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/profile" />
      <Stack.Screen name="settings/language" />
      <Stack.Screen name="settings/notification-settings" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
<<<<<<< HEAD
      <RootLayoutNav />
=======
      <Stack initialRouteName="auth/login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/profile" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="notices/[id]" />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/profile" />
        <Stack.Screen name="settings/language" />
        <Stack.Screen name="settings/notification-settings" />
      </Stack>
>>>>>>> fe77fbc2 (feat: update frontend)
    </AppProvider>
  );
}
