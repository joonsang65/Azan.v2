import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type SettingsMenuItemProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  isDanger?: boolean;
  onPress: () => void;
};

export default function SettingsMenuItem({
  title,
  subtitle,
  icon,
  isDanger = false,
  onPress,
}: SettingsMenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.leftSection}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={22} color="#005BAC" />
        </View>

        <View style={styles.textBox}>
          <Text style={[styles.menuTitle, isDanger && styles.logoutText]}>
            {title}
          </Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
