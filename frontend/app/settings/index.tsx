import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { t } from '../i18n';
import { authService } from '../services/auth';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedLanguage } = useAppContext();

  const handleLogout = () => {
    Alert.alert(
      t(selectedLanguage, 'settings.logout.alertTitle'),
      t(selectedLanguage, 'settings.logout.alertMessage'),
      [
        {
          text: t(selectedLanguage, 'settings.logout.cancel'),
          style: 'cancel',
        },
        {
          text: t(selectedLanguage, 'settings.logout.title'),
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'profile',
      title: t(selectedLanguage, 'settings.profile.title'),
      subtitle: t(selectedLanguage, 'settings.profile.subtitle'),
      icon: 'person-outline',
      onPress: () => router.push('/settings/profile'),
    },
    {
      id: 'language',
      title: t(selectedLanguage, 'settings.language.title'),
      subtitle: t(selectedLanguage, 'settings.language.subtitle'),
      icon: 'language-outline',
      onPress: () => router.push('/settings/language'),
    },
    {
      id: 'notification',
      title: t(selectedLanguage, 'settings.notifications.title'),
      subtitle: t(selectedLanguage, 'settings.notifications.subtitle'),
      icon: 'notifications-outline',
      onPress: () => router.push('/settings/notification-settings'),
    },
    {
      id: 'logout',
      title: t(selectedLanguage, 'settings.logout.title'),
      subtitle: t(selectedLanguage, 'settings.logout.subtitle'),
      icon: 'log-out-outline',
      onPress: handleLogout,
    },
  ] as const;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 18 }]}>
      <Text style={styles.headerTitle}>{t(selectedLanguage, 'settings.title')}</Text>
      <Text style={styles.headerSubtitle}>
        {t(selectedLanguage, 'settings.subtitle')}
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
                  color="#005BAC"
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
    backgroundColor: '#E0F7FF',
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
    color: '#005BAC',
  },
});
