import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authService } from '../services/auth';
import { useAppContext } from '../context/AppContext';
import { t } from '../i18n';
import type { LanguageOption } from '../types';

const LANGUAGE_OPTIONS: LanguageOption[] = ['Korean', 'English'];
const LANGUAGE_DETAILS: Record<LanguageOption, { label: string; flag: string }> = {
  Korean: { label: '\uD55C\uAD6D\uC5B4', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
  English: { label: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
};

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedLanguage, setSelectedLanguage } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [confirmSecureText, setConfirmSecureText] = useState(true);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !confirmPassword) {
      Alert.alert(
        t(selectedLanguage, 'auth.signup.errorTitle'),
        t(selectedLanguage, 'auth.signup.errorMessage')
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t(selectedLanguage, 'auth.signup.errorTitle'),
        selectedLanguage === 'Korean' ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.'
      );
      return;
    }

    setLoading(true);
    try {
      await authService.register(email, email, password);
      await authService.login(email, password);
      router.replace('/auth/profile');
    } catch (error: any) {
      Alert.alert(
        t(selectedLanguage, 'auth.signup.failedTitle'),
        error.message || t(selectedLanguage, 'auth.signup.failedMessage')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom + 28, 56),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.brandHeader}>
          <Image
            source={require('../../assets/images/azan-logo.png')}
            style={styles.azanLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandSubtitle}>{t(selectedLanguage, 'auth.signup.brandSubtitle')}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t(selectedLanguage, 'auth.signup.title')}</Text>
          <Text style={styles.formDescription}>{t(selectedLanguage, 'auth.signup.description')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder={t(selectedLanguage, 'auth.signup.emailPlaceholder')}
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t(selectedLanguage, 'auth.signup.passwordPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setSecureText((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={secureText ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#2563EB"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {selectedLanguage === 'Korean' ? '비밀번호 확인' : 'Confirm Password'}
            </Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t(selectedLanguage, 'auth.signup.confirmPasswordPlaceholder')}
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={confirmSecureText}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setConfirmSecureText((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={confirmSecureText ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#2563EB"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {loading
                ? t(selectedLanguage, 'auth.signup.loading')
                : t(selectedLanguage, 'auth.signup.button')}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>
              {t(selectedLanguage, 'auth.signup.loginLink')}
            </Text>
          </TouchableOpacity>

          <View style={styles.languageSection}>
            <View style={styles.languageTitleRow}>
              <View style={styles.languageTitleLine} />
              <Text style={styles.languageTitle}>Language Selection</Text>
              <View style={styles.languageTitleLine} />
            </View>

            <View style={styles.languagePickerWrap}>
              <TouchableOpacity
                style={styles.languagePickerButton}
                onPress={() => setLanguageMenuOpen((prev) => !prev)}
                activeOpacity={0.85}
              >
                <View style={styles.languageButtonContent}>
                  <Text style={styles.flagEmoji}>{LANGUAGE_DETAILS[selectedLanguage].flag}</Text>
                  <Text style={styles.languagePickerText}>
                    {LANGUAGE_DETAILS[selectedLanguage].label}
                  </Text>
                </View>
                <Ionicons
                  name={languageMenuOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#475569"
                />
              </TouchableOpacity>

              {languageMenuOpen && (
                <View style={styles.languageDropdown}>
                  {LANGUAGE_OPTIONS.map((language) => {
                    const selected = selectedLanguage === language;
                    return (
                      <TouchableOpacity
                        key={language}
                        style={[styles.languageOption, selected && styles.languageOptionActive]}
                        onPress={() => {
                          setSelectedLanguage(language);
                          setLanguageMenuOpen(false);
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.languageButtonContent}>
                          <Text style={styles.flagEmoji}>{LANGUAGE_DETAILS[language].flag}</Text>
                          <Text style={styles.languageOptionText}>
                            {LANGUAGE_DETAILS[language].label}
                          </Text>
                        </View>
                        {selected && <Ionicons name="checkmark" size={18} color="#1D4ED8" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.collaborationCard}>
          <Image
            source={require('../../assets/images/ajou-logo.png')}
            style={styles.ajouLogo}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  container: {
    paddingHorizontal: 22,
    backgroundColor: '#F4F8FF',
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  azanLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  brandSubtitle: {
    marginTop: 12,
    color: '#64748B',
    lineHeight: 18,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    zIndex: 20,
  },
  formTitle: {
    color: '#071B3D',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  formDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputGroup: {
    position: 'relative',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D8E2F1',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FBFF',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 13,
  },
  primaryButton: {
    backgroundColor: '#4654A7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4654A7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F8FBFF',
  },
  secondaryButtonText: {
    color: '#2E347D',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDE6F5',
  },
  dividerText: {
    marginHorizontal: 18,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  languageSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  languageTitleRow: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageTitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDE6F5',
  },
  languageTitle: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  languagePickerWrap: {
    width: '100%',
    maxWidth: 330,
    position: 'relative',
  },
  languagePickerButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F1',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  flagEmoji: {
    fontSize: 20,
  },
  languagePickerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  languageDropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F1',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  languageOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageOptionActive: {
    backgroundColor: '#E7ECFF',
  },
  languageOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  collaborationCard: {
    marginTop: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ajouLogo: {
    width: 185,
    height: 31,
  },
});
