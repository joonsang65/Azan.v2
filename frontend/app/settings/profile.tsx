import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { authService } from '../services/auth';
import type {
  AjouAdmissionTarget,
  InterestCategory,
  LanguageInstituteStatus,
  LanguageInstituteTerm,
  LanguageOption,
  ResidenceType,
  TopikLevel,
  TopikStatus,
  TopikTargetLevel,
  TopikTestPlan,
  UserProfileStatus,
  VisaType,
} from '../types';

const LANGUAGE_STATUS_OPTIONS: LanguageInstituteStatus[] = [
  'Planned',
  'Enrolled',
  'Completed',
];
const LANGUAGE_TERM_OPTIONS: LanguageInstituteTerm[] = [
  'Term 1',
  'Term 2',
  'Term 3',
  'Term 4',
];
const ADMISSION_TARGET_OPTIONS: AjouAdmissionTarget[] = [
  'March',
  'June',
  'September',
  'December',
];
const VISA_TYPE_OPTIONS: VisaType[] = ['D-4', 'D-2', 'Other', 'Unknown'];
const TOPIK_STATUS_OPTIONS: TopikStatus[] = ['None', 'Passed'];
const TOPIK_LEVEL_OPTIONS: TopikLevel[] = [
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Level 6',
];
const TOPIK_TARGET_LEVEL_OPTIONS: TopikTargetLevel[] = [
  'None',
  ...TOPIK_LEVEL_OPTIONS,
];
const TOPIK_TEST_PLAN_OPTIONS: TopikTestPlan[] = [
  'Scheduled',
  'PlanningToRegister',
  'NoPlan',
];
const INTEREST_OPTIONS: InterestCategory[] = [
  'Visa',
  'TOPIK',
  'Admission',
  'Scholarship',
  'Life',
];
const LANGUAGE_OPTIONS: LanguageOption[] = ['Korean', 'English'];
const RESIDENCE_OPTIONS: ResidenceType[] = ['Dormitory', 'Off-campus'];
const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

type DropdownKey = 'currentTopik' | 'targetTopik' | null;

export default function ProfileScreen() {
  const { userProfileStatus, setUserProfileStatus, setSelectedLanguage } =
    useAppContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<UserProfileStatus>(userProfileStatus);

  // 전역 상태가 변경되면 로컬 폼 상태 업데이트 (초기 로드 대응)
  useMemo(() => {
    setForm(userProfileStatus);
  }, [userProfileStatus]);

  const [calendarMonth, setCalendarMonth] = useState(() =>
    getInitialCalendarMonth(userProfileStatus.visaExpiryDate)
  );
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);

  const shouldShowLanguageTerm = form.languageInstituteStatus === 'Enrolled';
  const shouldShowAdmissionTarget = form.languageInstituteStatus === 'Planned';

  const calendarCells = useMemo(
    () => getMonthCells(calendarMonth),
    [calendarMonth]
  );

  const updateField = <K extends keyof UserProfileStatus>(
    key: K,
    value: UserProfileStatus[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'visaExpiryUnknown' && value === true
        ? { visaExpiryDate: '' }
        : {}),
      ...(key === 'topikStatus' && value === 'None'
        ? { topikLevel: 'Level 1' as TopikLevel }
        : {}),
    }));
  };

  const handleSelectVisaDate = (date: Date) => {
    setForm((prev) => ({
      ...prev,
      visaExpiryDate: formatDateKey(date),
      visaExpiryUnknown: false,
    }));
  };

  const handleMoveMonth = (amount: number) => {
    setCalendarMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + amount);
      return next;
    });
  };

  const toggleInterest = (category: InterestCategory) => {
    setForm((prev) => {
      const exists = prev.interests.includes(category);

      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((item) => item !== category)
          : [...prev.interests, category],
      };
    });
  };

  const handleSave = async () => {
    try {
      await authService.updateMe(form);
      setUserProfileStatus(form);
      setSelectedLanguage(form.preferredLanguage);
      Alert.alert("성공", "프로필이 저장되었습니다.");
    } catch (e: any) {
      Alert.alert("저장 실패", e.message || "프로필 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>내 프로필</Text>
      <Text style={styles.headerSubtitle}>
        어학당, 비자, TOPIK 정보를 입력하면 필요한 공지를 더 정확히 볼 수 있어요.
      </Text>

      <View style={styles.stepRow}>
        <StepButton
          active={step === 1}
          title="Step 1"
          subtitle="기본 정보 & 어학당"
          onPress={() => setStep(1)}
        />
        <StepButton
          active={step === 2}
          title="Step 2"
          subtitle="비자 & TOPIK"
          onPress={() => setStep(2)}
        />
      </View>

      {step === 1 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>기본 정보 & 어학당 상태</Text>

          <ProfileInput
            label="이름"
            value={form.name}
            placeholder="홍길동"
            onChangeText={(text) => updateField('name', text)}
          />

          <ProfileInput
            label="이메일"
            value={form.email}
            placeholder="student@example.com"
            keyboardType="email-address"
            onChangeText={(text) => updateField('email', text)}
          />

          <OptionField
            label="현재 어학당 상태"
            options={LANGUAGE_STATUS_OPTIONS}
            selectedValue={form.languageInstituteStatus}
            onSelect={(value) => updateField('languageInstituteStatus', value)}
            getLabel={getLanguageInstituteStatusLabel}
          />

          {shouldShowLanguageTerm ? (
            <OptionField
              label="현재 어학당 학기"
              options={LANGUAGE_TERM_OPTIONS}
              selectedValue={form.languageInstituteTerm}
              onSelect={(value) => updateField('languageInstituteTerm', value)}
              getLabel={getLanguageInstituteTermLabel}
            />
          ) : null}

          {shouldShowAdmissionTarget ? (
            <OptionField
              label="아주대 입학 목표 시기"
              options={ADMISSION_TARGET_OPTIONS}
              selectedValue={form.targetAdmissionTerm}
              onSelect={(value) => updateField('targetAdmissionTerm', value)}
              getLabel={getAdmissionTargetLabel}
            />
          ) : null}

          <ProfileInput
            label={
              form.languageInstituteStatus === 'Completed'
                ? '대학교 전공'
                : '희망 전공'
            }
            value={form.desiredMajor}
            placeholder={
              form.languageInstituteStatus === 'Completed'
                ? '대학교 전공을 입력하세요'
                : '희망 전공을 입력하세요'
            }
            onChangeText={(text) => updateField('desiredMajor', text)}
          />

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setStep(2)}
            activeOpacity={0.85}
          >
            <Text style={styles.nextButtonText}>다음 단계</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>비자 & TOPIK & 개인화</Text>

          <OptionField
            label="비자 유형"
            options={VISA_TYPE_OPTIONS}
            selectedValue={form.visaType}
            onSelect={(value) => updateField('visaType', value)}
            getLabel={getVisaTypeLabel}
          />

          <View style={styles.field}>
            <Text style={styles.label}>비자 만료일</Text>
            <View style={styles.dateHeaderRow}>
              <View style={styles.dateInputBox}>
                <Text
                  style={[
                    styles.dateInputText,
                    !form.visaExpiryDate && styles.dateInputPlaceholder,
                  ]}
                >
                  {form.visaExpiryUnknown
                    ? '모름'
                    : form.visaExpiryDate || '날짜 선택'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.unknownButton,
                  form.visaExpiryUnknown && styles.unknownButtonSelected,
                ]}
                onPress={() =>
                  updateField('visaExpiryUnknown', !form.visaExpiryUnknown)
                }
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.unknownButtonText,
                    form.visaExpiryUnknown && styles.unknownButtonTextSelected,
                  ]}
                >
                  모름
                </Text>
              </TouchableOpacity>
            </View>

            {!form.visaExpiryUnknown ? (
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
                    {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
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
                  {WEEK_DAYS.map((day) => (
                    <Text key={day} style={styles.weekText}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.monthGrid}>
                  {calendarCells.map((cell, index) => {
                    const dateKey = formatDateKey(cell.date);
                    const isSelected = form.visaExpiryDate === dateKey;

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
            ) : null}
          </View>

          <OptionField
            label="TOPIK 상태"
            options={TOPIK_STATUS_OPTIONS}
            selectedValue={form.topikStatus}
            onSelect={(value) => updateField('topikStatus', value)}
            getLabel={getTopikStatusLabel}
          />

          {form.topikStatus === 'Passed' ? (
            <DropdownField
              label="현재 취득한 TOPIK 급수"
              value={form.topikLevel}
              options={TOPIK_LEVEL_OPTIONS}
              open={openDropdown === 'currentTopik'}
              onToggle={() =>
                setOpenDropdown((prev) =>
                  prev === 'currentTopik' ? null : 'currentTopik'
                )
              }
              onSelect={(value) => {
                updateField('topikLevel', value);
                setOpenDropdown(null);
              }}
              getLabel={getTopikLevelLabel}
            />
          ) : null}

          <DropdownField
            label="목표 TOPIK 급수"
            value={form.topikTargetLevel}
            options={TOPIK_TARGET_LEVEL_OPTIONS}
            open={openDropdown === 'targetTopik'}
            onToggle={() =>
              setOpenDropdown((prev) =>
                prev === 'targetTopik' ? null : 'targetTopik'
              )
            }
            onSelect={(value) => {
              updateField('topikTargetLevel', value);
              setOpenDropdown(null);
            }}
            getLabel={getTopikTargetLevelLabel}
          />

          <OptionField
            label="TOPIK 시험 계획"
            options={TOPIK_TEST_PLAN_OPTIONS}
            selectedValue={form.topikTestPlan}
            onSelect={(value) => updateField('topikTestPlan', value)}
            getLabel={getTopikTestPlanLabel}
          />

          <View style={styles.field}>
            <Text style={styles.label}>관심 정보</Text>
            <View style={styles.optionGroup}>
              {INTEREST_OPTIONS.map((category) => {
                const isSelected = form.interests.includes(category);

                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                    ]}
                    onPress={() => toggleInterest(category)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        isSelected && styles.optionButtonTextSelected,
                      ]}
                    >
                      {getInterestLabel(category)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <OptionField
            label="선호 언어"
            options={LANGUAGE_OPTIONS}
            selectedValue={form.preferredLanguage}
            onSelect={(value) => updateField('preferredLanguage', value)}
            getLabel={(value) => (value === 'Korean' ? '한국어' : '영어')}
          />

          <OptionField
            label="거주 형태"
            options={RESIDENCE_OPTIONS}
            selectedValue={form.residenceType}
            onSelect={(value) => updateField('residenceType', value)}
            getLabel={(value) => (value === 'Dormitory' ? '기숙사' : '외부 거주')}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(1)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>이전</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>프로필 저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function StepButton({
  active,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.stepButton, active && styles.activeStepButton]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.stepText, active && styles.activeStepText]}>
        {title}
      </Text>
      <Text style={[styles.stepSubText, active && styles.activeStepSubText]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function ProfileInput({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
      />
    </View>
  );
}

function OptionField<T extends string>({
  label,
  options,
  selectedValue,
  onSelect,
  getLabel,
}: {
  label: string;
  options: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionGroup}>
        {options.map((option) => {
          const isSelected = selectedValue === option;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  isSelected && styles.optionButtonTextSelected,
                ]}
              >
                {getLabel(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DropdownField<T extends string>({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
  getLabel,
}: {
  label: string;
  value: T;
  options: T[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownButtonText}>{getLabel(value)}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#475569"
        />
      </TouchableOpacity>

      {open ? (
        <View style={styles.dropdownList}>
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownItem,
                  isSelected && styles.dropdownItemSelected,
                ]}
                onPress={() => onSelect(option)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    isSelected && styles.dropdownItemTextSelected,
                  ]}
                >
                  {getLabel(option)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function getInitialCalendarMonth(dateText: string) {
  const parsed = parseDate(dateText);
  return parsed ?? new Date();
}

function parseDate(dateText: string) {
  const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
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

function getLanguageInstituteStatusLabel(value: LanguageInstituteStatus) {
  switch (value) {
    case 'Planned':
      return '입학 예정';
    case 'Enrolled':
      return '재학 중';
    case 'Completed':
      return '수료 완료';
  }
}

function getLanguageInstituteTermLabel(value: LanguageInstituteTerm) {
  switch (value) {
    case 'Term 1':
      return '1학기';
    case 'Term 2':
      return '2학기';
    case 'Term 3':
      return '3학기';
    case 'Term 4':
      return '4학기';
  }
}

function getAdmissionTargetLabel(value: AjouAdmissionTarget) {
  switch (value) {
    case 'March':
      return '3월 (봄학기)';
    case 'June':
      return '6월 (여름학기)';
    case 'September':
      return '9월 (가을학기)';
    case 'December':
      return '12월 (겨울학기)';
  }
}

function getVisaTypeLabel(value: VisaType) {
  switch (value) {
    case 'D-4':
      return 'D-4 (어학연수)';
    case 'D-2':
      return 'D-2 (유학)';
    case 'Other':
      return '기타';
    case 'Unknown':
      return '잘 모르겠어요';
  }
}

function getTopikStatusLabel(value: TopikStatus) {
  return value === 'None' ? '없음' : '취득 완료';
}

function getTopikLevelLabel(value: TopikLevel) {
  switch (value) {
    case 'Level 1':
      return '1급';
    case 'Level 2':
      return '2급';
    case 'Level 3':
      return '3급';
    case 'Level 4':
      return '4급';
    case 'Level 5':
      return '5급';
    case 'Level 6':
      return '6급';
  }
}

function getTopikTargetLevelLabel(value: TopikTargetLevel) {
  return value === 'None' ? '없음' : getTopikLevelLabel(value);
}

function getTopikTestPlanLabel(value: TopikTestPlan) {
  switch (value) {
    case 'Scheduled':
      return '시험 예정 있음';
    case 'PlanningToRegister':
      return '접수 예정';
    case 'NoPlan':
      return '계획 없음';
  }
}

function getInterestLabel(value: InterestCategory) {
  switch (value) {
    case 'Visa':
      return '비자';
    case 'TOPIK':
      return 'TOPIK';
    case 'Admission':
      return '입학';
    case 'Scholarship':
      return '장학금';
    case 'Life':
      return '생활';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 104,
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
  stepRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  stepButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  activeStepButton: {
    backgroundColor: '#005BAC',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  stepSubText: {
    fontSize: 12,
    color: '#475569',
  },
  activeStepSubText: {
    color: '#E0F7FF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0F172A',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateInputBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dateInputText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  dateInputPlaceholder: {
    color: '#94A3B8',
  },
  unknownButton: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unknownButtonSelected: {
    backgroundColor: '#E0F7FF',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  unknownButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  unknownButtonTextSelected: {
    color: '#005BAC',
  },
  calendarCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#3B6FD8',
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
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionButtonSelected: {
    backgroundColor: '#E0F7FF',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  optionButtonTextSelected: {
    color: '#005BAC',
  },
  dropdownButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#CBD5E1',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dropdownItemSelected: {
    backgroundColor: '#E0F7FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: '#005BAC',
  },
  nextButton: {
    backgroundColor: '#005BAC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#005BAC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
