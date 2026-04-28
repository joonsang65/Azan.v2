import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SideMenuProps = {
  onClose: () => void;
};

const menuItems = [
  { key: 'visa', title: 'Visa', icon: 'card-outline' },
  { key: 'topik', title: 'TOPIK', icon: 'language-outline' },
  { key: 'register', title: 'Register', icon: 'document-text-outline' },
  { key: 'scholarship', title: 'Scholarship', icon: 'school-outline' },
  { key: 'life', title: 'Life', icon: 'home-outline' },
];

export default function SideMenu({ onClose }: SideMenuProps) {
  const router = useRouter();

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

      <View style={styles.menu}>
        <View style={styles.header}>
          <Text style={styles.title}>Information</Text>

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
            <Ionicons name={item.icon as any} size={22} color="#E85D4A" />
            <Text style={styles.menuText}>{item.title}</Text>
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
    paddingTop: 60,
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
