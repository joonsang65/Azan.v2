import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { t } from '../../i18n';

type SideMenuProps = {
  onClose: () => void;
};

const menuItems = [
  { key: 'visa', labelKey: 'menu.visa', icon: 'card-outline' },
  { key: 'topik', labelKey: 'menu.topik', icon: 'language-outline' },
  { key: 'register', labelKey: 'menu.register', icon: 'document-text-outline' },
  { key: 'scholarship', labelKey: 'menu.scholarship', icon: 'school-outline' },
  { key: 'life', labelKey: 'menu.life', icon: 'home-outline' },
] as const;

export default function SideMenu({ onClose }: SideMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedLanguage } = useAppContext();

  const handlePress = (key: string) => {
    onClose();
    router.push({
      pathname: '/topic/[topicKey]',
      params: { topicKey: key },
    });
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.dim} onPress={onClose} />

      <View style={[styles.menu, { paddingTop: insets.top + 28 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t(selectedLanguage, 'menu.information')}</Text>

          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close-outline" size={26} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => handlePress(item.key)}
          >
            <Ionicons name={item.icon as any} size={22} color="#38BDF8" />
            <Text style={styles.menuText}>{t(selectedLanguage, item.labelKey)}</Text>
            <Ionicons name="chevron-forward-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    flexDirection: 'row',
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  menu: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 270,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
});
