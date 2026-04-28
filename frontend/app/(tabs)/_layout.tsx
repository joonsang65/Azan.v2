import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SideMenu from '../components/common/SideMenu';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => setMenuOpen(true)}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="menu-outline" size={26} color="#0F172A" />
            </Pressable>
          ),
          headerRight: () => (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}
            >
              <Pressable
                onPress={() => router.push('/alerts')}
                style={{ marginRight: 14 }}
              >
                <Ionicons name="notifications-outline" size={22} color="#0F172A" />
              </Pressable>

              <Pressable onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={22} color="#0F172A" />
              </Pressable>
            </View>
          ),
          tabBarActiveTintColor: '#D95C4F',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E2E8F0',
            borderTopWidth: 1,
            height: 64 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            elevation: 10,
            shadowColor: '#0F172A',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: {
              width: 0,
              height: -2,
            },
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '홈',
            headerTitle: 'Ajou International',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="chat"
          options={{
            title: '채팅',
            headerTitle: '챗봇 상담',
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="notices"
          options={{
            title: '공지',
            headerTitle: '공지사항',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="calendar"
          options={{
            title: '캘린더',
            headerTitle: '캘린더',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
    </View>
  );
}
