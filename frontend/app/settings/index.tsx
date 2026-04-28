import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { authService } from '../services/auth';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive",
        onPress: async () => {
          await authService.logout();
          router.replace("/auth/login");
        }
      }
    ]);
  };

  const menuItems = [
    {
      id: 'profile',
      title: '내 프로필',
      subtitle: '학적 및 개인 정보를 확인하고 수정해요',
      icon: 'person-outline',
      onPress: () => router.push('/settings/profile'),
    },
    {
      id: 'language',
      title: '언어',
      subtitle: '앱에서 사용할 언어를 선택해요',
      icon: 'language-outline',
      onPress: () => router.push('/settings/language'),
    },
    {
      id: 'notification',
      title: '알림 설정',
      subtitle: '중요 카테고리와 알림 빈도를 관리해요',
      icon: 'notifications-outline',
      onPress: () => router.push('/settings/notification-settings'),
    },
    {
      id: 'logout',
      title: '로그아웃',
      subtitle: '앱에서 로그아웃해요',
      icon: 'log-out-outline',
      onPress: handleLogout,
    },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>설정</Text>
      <Text style={styles.headerSubtitle}>
        프로필, 언어, 알림 설정을 관리해보세요
      </Text>

      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.85}
          >
            <View style={styles.leftSection}>
              <View style={styles.iconBox}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.id === 'logout' ? '#DC2626' : '#D95C4F'}
                />
              </View>

              <View style={styles.textBox}>
                <Text
                  style={[
                    styles.menuTitle,
                    item.id === 'logout' && styles.logoutText,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    padding: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  menuContainer: {
    gap: 12,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF1EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  logoutText: {
    color: '#DC2626',
  },
});
