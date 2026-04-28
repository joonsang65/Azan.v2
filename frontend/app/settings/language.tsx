import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import type { LanguageOption } from '../types';

export default function LanguageSettingsScreen() {
  const {
    selectedLanguage,
    setSelectedLanguage,
    setUserProfileStatus,
  } = useAppContext();

  const languageOptions: LanguageOption[] = ['English', 'Korean'];

  const handleSelectLanguage = (language: LanguageOption) => {
    setSelectedLanguage(language);
    setUserProfileStatus((prev) => ({
      ...prev,
      preferredLanguage: language,
    }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>언어 설정</Text>
      <Text style={styles.headerSubtitle}>
        앱에서 사용할 언어를 선택해보세요
      </Text>

      <View style={styles.card}>
        {languageOptions.map((language) => {
          const isSelected = selectedLanguage === language;

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
                  {language === 'English' ? '영어' : '한국어'}
                </Text>
                <Text style={styles.optionSubtitle}>
                  {language === 'English'
                    ? '앱 화면을 영어로 표시합니다.'
                    : '앱 화면을 한국어로 표시합니다.'}
                </Text>
              </View>

              <View style={styles.iconSection}>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={24} color="#D95C4F" />
                ) : (
                  <Ionicons name="ellipse-outline" size={24} color="#CBD5E1" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>현재 언어</Text>
        <Text style={styles.infoText}>
          {selectedLanguage === 'English' ? '영어' : '한국어'}
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
    backgroundColor: '#FFF7F5',
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
    color: '#D95C4F',
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
