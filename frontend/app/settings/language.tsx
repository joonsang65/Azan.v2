import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { t } from '../i18n';
import type { LanguageOption } from '../types';

export default function LanguageSettingsScreen() {
  const {
    selectedLanguage,
    setSelectedLanguage,
    setUserProfileStatus,
  } = useAppContext();

  const languageOptions: LanguageOption[] = ['Korean', 'English'];

  const handleSelectLanguage = (language: LanguageOption) => {
    setSelectedLanguage(language);
    setUserProfileStatus((prev) => ({
      ...prev,
      preferredLanguage: language,
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>
        {t(selectedLanguage, 'settings.language.screenTitle')}
      </Text>
      <Text style={styles.headerSubtitle}>
        {t(selectedLanguage, 'settings.language.screenSubtitle')}
      </Text>

      <View style={styles.card}>
        {languageOptions.map((language) => {
          const isSelected = selectedLanguage === language;
          const languageTitle =
            language === 'Korean'
              ? t(selectedLanguage, 'settings.language.korean')
              : t(selectedLanguage, 'settings.language.english');
          const languageSubtitle =
            language === 'Korean'
              ? t(selectedLanguage, 'settings.language.koreanSubtitle')
              : t(selectedLanguage, 'settings.language.englishSubtitle');

          return (
            <TouchableOpacity
              key={language}
              style={[
                styles.optionRow,
                isSelected && styles.selectedOptionRow,
              ]}
              onPress={() => handleSelectLanguage(language)}
              activeOpacity={0.85}
            >
              <View style={styles.textSection}>
                <Text
                  style={[
                    styles.optionTitle,
                    isSelected && styles.selectedOptionTitle,
                  ]}
                >
                  {languageTitle}
                </Text>
                <Text style={styles.optionSubtitle}>{languageSubtitle}</Text>
              </View>

              <View style={styles.iconSection}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color="#005BAC" />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#CBD5E1" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          {t(selectedLanguage, 'settings.language.current')}
        </Text>
        <Text style={styles.infoText}>
          {selectedLanguage === 'Korean'
            ? t(selectedLanguage, 'settings.language.korean')
            : t(selectedLanguage, 'settings.language.english')}
        </Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  selectedOptionRow: {
    backgroundColor: '#E0F7FF',
  },
  textSection: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  selectedOptionTitle: {
    color: '#005BAC',
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  iconSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
  },
});
