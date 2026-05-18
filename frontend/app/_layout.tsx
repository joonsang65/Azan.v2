import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { getToken } from './services/api';

function RootLayoutNav() {
  const { userProfileStatus } = useAppContext();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token = await getToken();
      const inAuthGroup = segments[0] === 'auth';

      if (!token && !inAuthGroup) {
        // 토큰이 없고 인증 페이지가 아니면 로그인 페이지로 리다이렉트
        router.replace('/auth/login');
      } else if (token && inAuthGroup) {
        // 토큰이 있고 인증 페이지면 메인 페이지로 리다이렉트
        router.replace('/(tabs)');
      }
      setIsReady(true);
    }

    checkAuth();
  }, [userProfileStatus.email, segments]);

  if (!isReady) return null;

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
      <RootLayoutNav />
    </AppProvider>
  );
}
