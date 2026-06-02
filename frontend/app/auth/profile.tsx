import React, { useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  Image,
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
import type { InterestCategory, LanguageOption, NoticeCategory, ResidenceType, TopikStatus, TopikLevel, TopikTargetLevel, VisaType } from '../types';

const STATUS_OPTIONS = ['Planned', 'LanguageSchool'] as const;
const VISA_OPTIONS: VisaType[] = ['D-4', 'D-2', 'Other'];
const TOPIK_STATUS_OPTIONS: TopikStatus[] = ['None', 'Passed'];
const TOPIK_LEVEL_OPTIONS: TopikLevel[] = [
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Level 6',
];
const INTEREST_OPTIONS: InterestCategory[] = ['Visa', 'TOPIK', 'Admission', 'Scholarship', 'Life'];
const ADMISSION_YEAR_OPTIONS = getAdmissionYearOptions();
const ADMISSION_MONTH_OPTIONS = ['03', '06', '09', '12'] as const;
type AdmissionMonth = (typeof ADMISSION_MONTH_OPTIONS)[number];
const LANGUAGE_TERM_YEAR_OPTIONS = getLanguageTermYearOptions();
const LANGUAGE_OPTIONS: LanguageOption[] = ['Korean', 'English'];
const LANGUAGE_DETAILS: Record<LanguageOption, { label: string; flag: string }> = {
  Korean: { label: '\uD55C\uAD6D\uC5B4', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
  English: { label: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
};
const RESIDENCE_OPTIONS: ResidenceType[] = ['Dormitory', 'Off-campus'];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    selectedLanguage,
    setSelectedLanguage,
    setUserProfileStatus,
    setSelectedNoticeCategories,
  } = useAppContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [nationality, setNationality] = useState('');
  const [currentStatus, setCurrentStatus] = useState<'Planned' | 'LanguageSchool'>('Planned');
  const [desiredMajor, setDesiredMajor] = useState('');
  const [targetAdmissionYear, setTargetAdmissionYear] = useState(() =>
    String(new Date().getFullYear())
  );
  const [targetAdmissionMonth, setTargetAdmissionMonth] =
    useState<AdmissionMonth>('09');
  const [admissionMenuOpen, setAdmissionMenuOpen] = useState<
    'year' | 'month' | null
  >(null);
  const [languageTermYear, setLanguageTermYear] = useState(() =>
    String(new Date().getFullYear())
  );
  const [languageTermMonth, setLanguageTermMonth] =
    useState<AdmissionMonth>('03');
  const [languageTermMenuOpen, setLanguageTermMenuOpen] = useState<
    'year' | 'month' | null
  >(null);
  const [visaType, setVisaType] = useState<VisaType>('D-4');
  const [visaExpiryDate, setVisaExpiryDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [topikStatus, setTopikStatus] = useState<TopikStatus>('None');
  const [topikLevel, setTopikLevel] = useState<TopikLevel>('Level 4');
  const [topikTargetLevel, setTopikTargetLevel] = useState<TopikTargetLevel>('Level 4');
  const [interests, setInterests] = useState<InterestCategory[]>([]);
  const [residenceType, setResidenceType] = useState<ResidenceType>('Dormitory');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const calendarCells = useMemo(
    () => getMonthCells(calendarMonth),
    [calendarMonth]
  );

  const handleToggleInterest = (category: InterestCategory) => {
    setInterests((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const isLastStep = currentStep === 4;

  const canContinue = () => {
    if (currentStep === 1) {
      return fullName.trim().length > 0;
    }
    if (currentStep === 2) {
      return visaExpiryDate.trim().length > 0;
    }
    if (currentStep === 3) {
      return topikStatus === 'Passed' ? topikLevel.length > 0 && topikTargetLevel.length > 0 : topikTargetLevel.length > 0;
    }
    return true;
  };

  const handleNext = async () => {
    if (!canContinue()) {
      Alert.alert(t(selectedLanguage, 'auth.profile.errorTitle'), t(selectedLanguage, 'auth.profile.errorMessage'));
      return;
    }

    if (isLastStep) {
      setLoading(true);
      try {
        const targetAdmissionTerm = formatAdmissionTerm(
          targetAdmissionYear,
          targetAdmissionMonth
        );
        const languageSchoolSemester = formatLanguageTerm(
          languageTermYear,
          languageTermMonth
        );
        const profileUpdate = {
          name: fullName,
          nationality,
          currentStatus,
          languageSchoolSemester,
          languageInstituteTerm: languageSchoolSemester,
          desiredMajor,
          targetAdmissionTerm,
          visaType,
          visaExpiryDate,
          topikStatus,
          topikLevel,
          topikTargetLevel,
          interests,
          residenceType,
          preferredLanguage: selectedLanguage,
        };
        await authService.updateMe(profileUpdate as any);
        setUserProfileStatus((prev) => ({
          ...prev,
          name: fullName,
          nationality,
          currentStatus,
          languageSchoolSemester,
          languageInstituteTerm: languageSchoolSemester,
          desiredMajor,
          targetAdmissionTerm,
          visaType,
          visaExpiryDate,
          topikStatus,
          topikLevel,
          topikTargetLevel,
          interests,
          residenceType,
          preferredLanguage: selectedLanguage,
        } as any));
        setSelectedNoticeCategories(mapInterestsToNoticeCategories(interests));
        router.replace('/(tabs)');
      } catch (error: any) {
        Alert.alert(
          t(selectedLanguage, 'auth.profile.failedTitle'),
          error.message || t(selectedLanguage, 'auth.profile.failedMessage')
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleMoveMonth = (amount: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + amount);
      return next;
    });
  };

  const handleSelectVisaDate = (date: Date) => {
    setVisaExpiryDate(formatDateKey(date));
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerArea}>
        <Image
          source={require('../../assets/images/azan-logo.png')}
          style={styles.azanLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>{t(selectedLanguage, 'auth.profile.title')}</Text>
        <Text style={styles.headerSubtitle}>{t(selectedLanguage, 'auth.profile.subtitle')}</Text>
      </View>

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

      <View style={styles.stepCard}>
        <Text style={styles.stepLabel}>
          {t(selectedLanguage, 'auth.profile.stepLabel')} {currentStep}/4
        </Text>
        <Text style={styles.stepTitle}>
          {t(selectedLanguage, `auth.profile.step${currentStep}`)}
        </Text>
      </View>

      {currentStep === 1 && (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>{t(selectedLanguage, 'auth.profile.sectionBasicInfo')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t(selectedLanguage, 'auth.profile.namePlaceholder')}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder={t(selectedLanguage, 'auth.profile.nationalityPlaceholder')}
            value={nationality}
            onChangeText={setNationality}
          />
          <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.statusLabel')}</Text>
          <View style={styles.optionRowWrap}>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  currentStatus === status && styles.optionSelected,
                ]}
                onPress={() => setCurrentStatus(status)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    currentStatus === status && styles.statusOptionTextActive,
                  ]}
                >
                  {status === 'Planned'
                    ? t(selectedLanguage, 'auth.profile.statusPlanned')
                    : t(selectedLanguage, 'auth.profile.statusLanguageSchool')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {currentStatus === 'Planned' ? (
            <View>
              <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.admissionTargetLabel')}</Text>
              <View style={styles.admissionPickerRow}>
                <View
                  style={[
                    styles.admissionPickerWrap,
                    admissionMenuOpen === 'year' && styles.dropdownLayerTop,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.languagePickerButton}
                    onPress={() =>
                      setAdmissionMenuOpen((prev) =>
                        prev === 'year' ? null : 'year'
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.languagePickerText}>{targetAdmissionYear}</Text>
                    <Ionicons
                      name={admissionMenuOpen === 'year' ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#475569"
                    />
                  </TouchableOpacity>

                  {admissionMenuOpen === 'year' ? (
                    <View style={styles.admissionDropdown}>
                      {ADMISSION_YEAR_OPTIONS.map((year) => {
                        const selected = targetAdmissionYear === year;

                        return (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.languageOption,
                              selected && styles.languageOptionActive,
                            ]}
                            onPress={() => {
                              setTargetAdmissionYear(year);
                              setAdmissionMenuOpen(null);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.languageOptionText}>{year}</Text>
                            {selected ? (
                              <Ionicons name="checkmark" size={18} color="#1D4ED8" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.admissionPickerWrap,
                    admissionMenuOpen === 'month' && styles.dropdownLayerTop,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.languagePickerButton}
                    onPress={() =>
                      setAdmissionMenuOpen((prev) =>
                        prev === 'month' ? null : 'month'
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.languagePickerText}>
                      {getAdmissionMonthLabel(
                        selectedLanguage,
                        targetAdmissionMonth
                      )}
                    </Text>
                    <Ionicons
                      name={admissionMenuOpen === 'month' ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#475569"
                    />
                  </TouchableOpacity>

                  {admissionMenuOpen === 'month' ? (
                    <View style={styles.admissionDropdown}>
                      {ADMISSION_MONTH_OPTIONS.map((month) => {
                        const selected = targetAdmissionMonth === month;

                        return (
                          <TouchableOpacity
                            key={month}
                            style={[
                              styles.languageOption,
                              selected && styles.languageOptionActive,
                            ]}
                            onPress={() => {
                              setTargetAdmissionMonth(month);
                              setAdmissionMenuOpen(null);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.languageOptionText}>
                              {getAdmissionMonthLabel(selectedLanguage, month)}
                            </Text>
                            {selected ? (
                              <Ionicons name="checkmark" size={18} color="#1D4ED8" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.languageSemesterLabel')}</Text>
              <View style={styles.admissionPickerRow}>
                <View
                  style={[
                    styles.admissionPickerWrap,
                    languageTermMenuOpen === 'year' && styles.dropdownLayerTop,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.languagePickerButton}
                    onPress={() =>
                      setLanguageTermMenuOpen((prev) =>
                        prev === 'year' ? null : 'year'
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.languagePickerText}>{languageTermYear}</Text>
                    <Ionicons
                      name={languageTermMenuOpen === 'year' ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#475569"
                    />
                  </TouchableOpacity>

                  {languageTermMenuOpen === 'year' ? (
                    <View style={styles.admissionDropdown}>
                      {LANGUAGE_TERM_YEAR_OPTIONS.map((year) => {
                        const selected = languageTermYear === year;

                        return (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.languageOption,
                              selected && styles.languageOptionActive,
                            ]}
                            onPress={() => {
                              setLanguageTermYear(year);
                              setLanguageTermMenuOpen(null);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.languageOptionText}>{year}</Text>
                            {selected ? (
                              <Ionicons name="checkmark" size={18} color="#1D4ED8" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.admissionPickerWrap,
                    languageTermMenuOpen === 'month' && styles.dropdownLayerTop,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.languagePickerButton}
                    onPress={() =>
                      setLanguageTermMenuOpen((prev) =>
                        prev === 'month' ? null : 'month'
                      )
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.languagePickerText}>
                      {getAdmissionMonthLabel(selectedLanguage, languageTermMonth)}
                    </Text>
                    <Ionicons
                      name={languageTermMenuOpen === 'month' ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#475569"
                    />
                  </TouchableOpacity>

                  {languageTermMenuOpen === 'month' ? (
                    <View style={styles.admissionDropdown}>
                      {ADMISSION_MONTH_OPTIONS.map((month) => {
                        const selected = languageTermMonth === month;

                        return (
                          <TouchableOpacity
                            key={month}
                            style={[
                              styles.languageOption,
                              selected && styles.languageOptionActive,
                            ]}
                            onPress={() => {
                              setLanguageTermMonth(month);
                              setLanguageTermMenuOpen(null);
                            }}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.languageOptionText}>
                              {getAdmissionMonthLabel(selectedLanguage, month)}
                            </Text>
                            {selected ? (
                              <Ionicons name="checkmark" size={18} color="#1D4ED8" />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder={t(selectedLanguage, 'auth.profile.desiredMajorPlaceholder')}
            value={desiredMajor}
            onChangeText={setDesiredMajor}
          />
        </View>
      )}

      {currentStep === 2 && (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>{t(selectedLanguage, 'auth.profile.sectionVisaInfo')}</Text>
          <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.visaTypeLabel')}</Text>
          <View style={styles.optionRowWrap}>
            {VISA_OPTIONS.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.statusOption, visaType === type && styles.optionSelected]}
                onPress={() => setVisaType(type)}
                activeOpacity={0.85}
              >
                <Text style={[styles.statusOptionText, visaType === type && styles.statusOptionTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.visaExpiryPlaceholder')}</Text>
          <View style={styles.dateInputBox}>
            <Text
              style={[
                styles.dateInputText,
                !visaExpiryDate && styles.dateInputPlaceholder,
              ]}
            >
              {visaExpiryDate || (selectedLanguage === 'Korean' ? '날짜 선택' : 'Select a date')}
            </Text>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={styles.calendarArrow}
                onPress={() => handleMoveMonth(-1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.calendarTitle}>
                {calendarMonth.getFullYear()}
                {selectedLanguage === 'Korean' ? '년 ' : ' '}
                {calendarMonth.getMonth() + 1}
                {selectedLanguage === 'Korean' ? '월' : ''}
              </Text>

              <TouchableOpacity
                style={styles.calendarArrow}
                onPress={() => handleMoveMonth(1)}
                activeOpacity={0.85}
              >
                <Ionicons name="chevron-forward" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {getWeekDays(selectedLanguage).map((day) => (
                <Text key={day} style={styles.weekText}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.monthGrid}>
              {calendarCells.map((cell, index) => {
                const dateKey = formatDateKey(cell.date);
                const isSelected = visaExpiryDate === dateKey;

                return (
                  <TouchableOpacity
                    key={`${dateKey}-${index}`}
                    style={styles.dayCell}
                    onPress={() => handleSelectVisaDate(cell.date)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        isSelected && styles.selectedDayCircle,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !cell.isCurrentMonth && styles.otherMonthDayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {currentStep === 3 && (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>{t(selectedLanguage, 'auth.profile.sectionTopikInfo')}</Text>
          <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.topikStatusLabel')}</Text>
          <View style={styles.optionRowWrap}>
            {TOPIK_STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusOption, topikStatus === status && styles.optionSelected]}
                onPress={() => setTopikStatus(status)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.statusOptionText, topikStatus === status && styles.statusOptionTextActive]}
                >
                  {status === 'None'
                    ? t(selectedLanguage, 'auth.profile.topikNone')
                    : t(selectedLanguage, 'auth.profile.topikPassed')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {topikStatus === 'Passed' ? (
            <>
              <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.currentLevelLabel')}</Text>
              <View style={styles.optionRowWrap}>
                {TOPIK_LEVEL_OPTIONS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.statusOption, topikLevel === level && styles.optionSelected]}
                    onPress={() => setTopikLevel(level)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        topikLevel === level && styles.statusOptionTextActive,
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.groupTitle}>{t(selectedLanguage, 'auth.profile.targetLevelLabel')}</Text>
          <View style={styles.optionRowWrap}>
            {['None', ...TOPIK_LEVEL_OPTIONS].map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.statusOption, topikTargetLevel === level && styles.optionSelected]}
                onPress={() => setTopikTargetLevel(level as TopikTargetLevel)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    topikTargetLevel === level && styles.statusOptionTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {currentStep === 4 && (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>{t(selectedLanguage, 'auth.profile.sectionInterests')}</Text>
          <Text style={styles.groupSubtitle}>{t(selectedLanguage, 'auth.profile.interestsDescription')}</Text>
          <View style={styles.optionColumn}>
            {INTEREST_OPTIONS.map((category) => {
              const selected = interests.includes(category);
              return (
                <TouchableOpacity
                  key={category}
                  style={[styles.interestOption, selected && styles.interestSelected]}
                  onPress={() => handleToggleInterest(category)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.interestText,
                      selected && styles.interestTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.groupTitle}>{getResidenceSectionLabel(selectedLanguage)}</Text>
          <View style={styles.optionRowWrap}>
            {RESIDENCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.statusOption,
                  residenceType === option && styles.optionSelected,
                ]}
                onPress={() => setResidenceType(option)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    residenceType === option && styles.statusOptionTextActive,
                  ]}
                >
                  {getResidenceLabel(selectedLanguage, option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.navButton, currentStep === 1 && styles.navButtonDisabled]}
          activeOpacity={0.8}
          disabled={currentStep === 1}
        >
          <Text style={[styles.navButtonText, currentStep === 1 && styles.navButtonTextDisabled]}>
            {t(selectedLanguage, 'auth.profile.previous')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.navButton, styles.primaryNavButton]}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={[styles.navButtonText, styles.primaryNavButtonText]}>
            {isLastStep
              ? loading
                ? t(selectedLanguage, 'auth.profile.saving')
                : t(selectedLanguage, 'auth.profile.save')
              : t(selectedLanguage, 'auth.profile.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getAdmissionYearOptions() {
  const startYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => String(startYear + index));
}

function getLanguageTermYearOptions() {
  const endYear = Math.max(new Date().getFullYear() + 5, 2029);
  return Array.from(
    { length: endYear - 2024 + 1 },
    (_, index) => String(2024 + index)
  );
}

function formatAdmissionTerm(year: string, month: AdmissionMonth) {
  return `${year}.${month}`;
}

function formatLanguageTerm(year: string, month: AdmissionMonth) {
  return `${year}.${month}`;
}

function getAdmissionMonthLabel(language: LanguageOption, value: AdmissionMonth) {
  if (language === 'English') {
    return `${Number(value)} month`;
  }

  return `${Number(value)}월`;
}

function getWeekDays(language: LanguageOption) {
  return language === 'Korean'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

function getResidenceSectionLabel(language: LanguageOption) {
  return language === 'Korean' ? '거주 형태' : 'Residence Type';
}

function getResidenceLabel(language: LanguageOption, value: ResidenceType) {
  if (language === 'English') {
    return value === 'Dormitory' ? 'Dormitory' : 'Off-campus';
  }

  return value === 'Dormitory' ? '기숙사' : '교외 거주';
}

function mapInterestsToNoticeCategories(interests: InterestCategory[]): NoticeCategory[] {
  return Array.from(
    new Set(
      interests.map((interest) => {
        switch (interest) {
          case 'Admission':
            return 'Academic';
          case 'Life':
            return 'Dormitory';
          default:
            return interest;
        }
      })
    )
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthCells(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDayWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < firstDayWeek; i++) {
    const day = prevMonthDays - firstDayWeek + i + 1;
    cells.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return cells;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingBottom: 42,
    backgroundColor: '#F4F8FF',
    minHeight: '100%',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 18,
  },
  azanLogo: {
    width: 86,
    height: 86,
    borderRadius: 22,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#071B3D',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 340,
  },
  languageSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 30,
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
  admissionPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    zIndex: 20,
  },
  admissionPickerWrap: {
    flex: 1,
    position: 'relative',
  },
  dropdownLayerTop: {
    zIndex: 30,
  },
  admissionDropdown: {
    marginTop: 8,
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
    top: 50,
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
    zIndex: 40,
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
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  stepLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    color: '#071B3D',
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#071B3D',
    marginBottom: 14,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  groupSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  dateInputBox: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#D8E2F1',
    backgroundColor: '#F8FBFF',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  dateInputText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  dateInputPlaceholder: {
    color: '#94A3B8',
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: '#D8E2F1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FBFF',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#071B3D',
  },
  weekRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
  },
  weekText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCircle: {
    backgroundColor: '#4654A7',
  },
  dayText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  otherMonthDayText: {
    color: '#CBD5E1',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  optionRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statusOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8E2F1',
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    backgroundColor: '#E7ECFF',
    borderColor: '#4654A7',
  },
  statusOptionText: {
    color: '#334155',
    fontWeight: '700',
  },
  statusOptionTextActive: {
    color: '#2E347D',
  },
  interestOption: {
    borderWidth: 1,
    borderColor: '#D8E2F1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  interestSelected: {
    backgroundColor: '#E7ECFF',
    borderColor: '#4654A7',
  },
  interestText: {
    color: '#334155',
    fontWeight: '700',
  },
  interestTextSelected: {
    color: '#2E347D',
  },
  optionColumn: {
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4654A7',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonTextDisabled: {
    color: '#94A3B8',
  },
  primaryNavButton: {
    borderColor: '#4654A7',
    backgroundColor: '#4654A7',
  },
  navButtonText: {
    color: '#2E347D',
    fontWeight: '700',
  },
  primaryNavButtonText: {
    color: '#FFFFFF',
  },
});
