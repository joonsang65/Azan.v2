import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOPIC_DATA } from '../data/topicData';

type TopicKey = keyof typeof TOPIC_DATA;
type VisaTabKey = 'overview' | 'extension' | 'change' | 'work' | 'links';
type TopikTabKey = 'pbt' | 'ibt' | 'speaking' | 'schedule';
type RegisterTabKey = 'steps' | 'info' | 'documents' | 'schedule';
type RegisterDocumentTabKey = 'd4' | 'china' | 'resident';
type ScholarshipTabKey = 'korean' | 'gks' | 'achievement' | 'etc';
type LifeTabKey = 'support' | 'dorm';

type TextSection = {
  title: string;
  items: string[];
  variant?: 'default' | 'warning' | 'steps' | 'table';
  tableColumns?: string[];
  tableRows?: string[][];
};

const VISA_TABS: { key: VisaTabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'extension', label: '연장' },
  { key: 'change', label: '변경' },
  { key: 'work', label: '시간제취업' },
  { key: 'links', label: '공식 링크' },
];

const TOPIK_TABS: { key: TopikTabKey; label: string }[] = [
  { key: 'pbt', label: 'PBT' },
  { key: 'ibt', label: 'IBT' },
  { key: 'speaking', label: '말하기 평가' },
  { key: 'schedule', label: '시험 일정' },
];

const REGISTER_TABS: { key: RegisterTabKey; label: string }[] = [
  { key: 'steps', label: '지원절차' },
  { key: 'info', label: '지원정보' },
  { key: 'documents', label: '비자/서류' },
  { key: 'schedule', label: '학사일정' },
];

const REGISTER_DOCUMENT_TABS: { key: RegisterDocumentTabKey; label: string }[] = [
  { key: 'd4', label: 'D-4 비자' },
  { key: 'china', label: '중국' },
  { key: 'resident', label: '국내 체류자' },
];

const SCHOLARSHIP_TABS: { key: ScholarshipTabKey; label: string }[] = [
  { key: 'korean', label: '한국어과정' },
  { key: 'gks', label: 'GKS' },
  { key: 'achievement', label: '성적/TOPIK' },
  { key: 'etc', label: '기타' },
];

const KOREAN_SCHOLARSHIPS = [
  {
    title: '신입생 장학',
    items: ['입학성적 우수자 첫 학기 수강료 50%~100% 또는 2개 및 4개 학기 수강료 100% 면제'],
  },
  {
    title: '아주 가족 장학',
    items: [
      '형제·자매가 아주대학교 학부 또는 국제교육센터(어학과정) 재학 중일 경우 1년 또는 2개 학기 수강료 50% 면제',
      '신입생 대상',
      '직계 가족에 한함',
      '형제·자매가 학부 졸업생일 경우 첫 학기 수강료 50% 면제',
    ],
  },
  {
    title: 'SDG 장학',
    items: ['전쟁, 천재지변 등으로 긴급 지원 및 사회적 배려가 필요한 경우 등록금의 50%~100% 면제'],
  },
];

const GKS_SCHOLARSHIPS = [
  {
    title: '목적',
    items: ['외국인 학생에게 대한민국 고등교육기관에서 수학할 기회를 부여하여 국제교류 촉진 및 국가 간 우호증진을 도모'],
  },
  {
    title: '장학기간',
    items: ['5년: 한국어 연수 1년 + 학부과정 4년'],
  },
  {
    title: '지원자격',
    items: [
      '초청대상국 국적을 소지한 자',
      '초청연도 기준 고등학교 졸업(예정)자',
      '고등학교 수학성적이 백분율 환산 시 80점 이상이거나 성적 상위 20% 이내인 자',
    ],
  },
  {
    title: '선발일정',
    items: ['후보자 추천: 11월 초', '장학생 선발: 12월경', '장학생 입국: 2월경'],
  },
  {
    title: '지원내역',
    items: [
      '최초 입국 및 최종 귀국 시 보통석 항공권',
      '월 생활비 80만원',
      '의료보험비, 정착지원비, 귀국지원비',
      '한국어능력우수자(TOPIK Speaking 5급 이상) 장학금 추가 지급',
    ],
  },
];

const ACHIEVEMENT_SCHOLARSHIPS = [
  {
    title: '학업우수장학 1',
    items: ['선발기준: 전체 1등', '장학금액: 다음 학기 수강료 100% 면제'],
  },
  {
    title: '학업우수장학 2',
    items: ['선발기준: 각 레벨 1등(전체 1등 제외)', '장학금액: 다음 학기 수강료 50% 면제'],
  },
  {
    title: 'TOPIK I 장학',
    items: [
      '선발기준: 재학 중 최초로 1급 또는 2급 취득 시',
      'TOPIK 응시료(40,000원) 100% 실비 지원',
      '학생 당 학년도에 1회',
    ],
  },
  {
    title: 'TOPIK II 장학',
    items: [
      '선발기준: 재학 중 최초로 3급 이상 취득 시',
      '재학생 중 3급 이상 성적 보유자가 1개 급 이상 승급 시',
      '예: 3급→4급, 4급→6급',
      'TOPIK 응시료(55,000원) 100% 실비 지원',
      '학생 당 학년도에 최대 2회',
    ],
  },
];

const ETC_SCHOLARSHIPS = [
  {
    title: 'GKS 정부 초청 장학',
    items: ['등록금, 생활비, 항공료 등 지원', '상세 내용은 GKS 공식 안내에서 확인'],
  },
  {
    title: '근로장학',
    items: ['학내에서 행정지원 등의 업무를 수행하는 경우 근로시간에 대해 장학금 지급'],
  },
  {
    title: '반장장학',
    items: ['반별 반장 역할 수행에 대한 장학금 지급'],
  },
];

const SCHOLARSHIP_LINKS = [
  { title: '아주대 국제교육센터 — 한국어과정 장학', url: 'https://cie.ajou.ac.kr/cie/korean/scholarship.do' },
  { title: '아주대 GKS 정부초청장학(학부)', url: 'https://www.ajou.ac.kr/iadmissions/gks/gks01.do' },
  { title: '국립국제교육원', url: 'https://www.niied.go.kr' },
];

const LIFE_TABS: { key: LifeTabKey; label: string }[] = [
  { key: 'support', label: '생활지원' },
  { key: 'dorm', label: '기숙사' },
];

const LIFE_SUPPORT_SECTIONS = [
  {
    title: '외국인등록증 신청',
    items: [
      '입국일로부터 90일 이내에 관할 출입국 사무소에 외국인 등록증을 신청하여 발급받아야 합니다.',
      '구비서류: 여권',
      '여권사진(3.5cm X 4.5cm) 사진 1매',
      '재학증명서',
      '외국인등록신청서',
      '재정확인서',
      '거주확인증 혹은 임차계약서',
      '수수료 3.5만원',
    ],
  },
  {
    title: '체류기간 연장',
    items: [
      '외국인등록증 상의 체류기한 만료 전에 서류를 구비하여 관할 출입국관리사무소에서 연장해야 합니다.',
      '구비서류: 여권 및 외국인등록증',
      '체류기간연장신청서',
      '학비납입증명서',
      '재학증명서(출석률이 표시된 것)',
      '거주확인증 혹은 임차계약서',
      '수수료 6만원',
    ],
  },
  {
    title: '체류지(거주지) 변경신고',
    items: [
      '외국인은 체류지가 변경되었을 경우 반드시 14일 이내에 신고해야 합니다.',
      '하이코리아 또는 거주지 관할구청, 수원출입국관리소 중 한 곳에서 변경 신청',
      '하이코리아 이용 시 영문버전을 사용하면 공인인증서 필요 없음',
    ],
  },
  {
    title: '도서관 이용 안내',
    items: [
      '1층: 대출열람실, 신간자료실, 참고도서실, 수업자료실, 디지털 도서관개발실, 멀티미디어정보실, 정보지원실',
      '2층: 연속 간행물실',
      '3층: 인문사회과학실, 어문자연과학실',
      '4층: 고시 정보실',
      '각 층 5개의 일반 열람실',
    ],
  },
  {
    title: '학생증',
    items: [
      '아주대학교 포털에 가입하면 국제교육센터에서 확인 후 학생증 발급이 가능합니다.',
      '교내 건물 출입',
      '도서관 출입 및 자료 열람/대출',
      '아주대 학생 할인점 이용(10% 할인)',
    ],
  },
  {
    title: '보건진료소',
    items: [
      '일반 질환 및 외상 등에 대한 처치를 받을 수 있는 보건진료소를 운영하고 있습니다.',
      '위치: 신학생회관(학생회관2) 227호',
      '이용시간: 월~금요일 09:00 ~ 18:00',
      '점심시간: 12:00 ~ 13:00',
      '진료신청: 보건진료소 방문 또는 접수페이지에서 신청',
      '접수페이지: 보건소 신청 → 보건구분(일반진료신청) → 신분구분 → 신분 번호 → 신청',
      '일반진료 신청 시 자가증상 구분 및 자가증상 내용을 간략하게 입력 후 신청완료',
    ],
  },
];

const LIFE_LINKS = [
  { title: '아주대 중앙도서관', url: 'https://library.ajou.ac.kr/' },
  { title: '아주대 캠퍼스맵', url: 'https://www.ajou.ac.kr/kr/intro/way01.do' },
  { title: '보건진료소 진료신청', url: 'https://mhaksa.ajou.ac.kr:30443/public.html#!/e010401' },
  { title: '보건진료소 안내', url: 'https://www.ajou.ac.kr/kr/life/health.do' },
];

const DORM_APPLICATION_SECTIONS = [
  {
    title: '교내기숙사 신청방법 — 신입생',
    items: [
      '온라인 지원 시 4단계의 기숙사 이용 여부에 체크',
      '기숙사 수용인원이 제한적인 관계로 입사 여부는 추후 통보됩니다.',
    ],
  },
  {
    title: '교내기숙사 신청방법 — 재학생',
    items: [
      '국제교육센터에서 신청하며, 학기별 신청기간 및 방법은 단체 메신저방에 올라오는 신청 공지를 확인합니다.',
      '기숙사비 납부기간에 국제교육센터에서 발급한 인보이스에 있는 생활관 계좌로 직접 납부하면 됩니다.',
      '공지는 수료일로부터 4주 전에 발표되며, 학사 일정에 따라 공지일자 변동 가능합니다.',
    ],
  },
  {
    title: '교내기숙사 입실문의',
    items: ['전화: 031-219-3599', '메일: koli@ajou.ac.kr'],
  },
];

const DORM_VIDEO_LINKS = [
  { title: '학교 및 기숙사 영상 — YouTube', url: 'https://www.youtube.com/watch?v=oXmIvtD9Wm8&t=42s' },
];

const DORM_FEE_CARDS = [
  { title: '국제학사 2인실', spring: '1,569,000원', vacation: '898,000원' },
  { title: '화홍관 2인실', spring: '1,201,000원', vacation: '679,000원' },
  { title: '화홍관 4인실', spring: '814,000원', vacation: '516,000원' },
  { title: '남제관 4인실', spring: '728,000원', vacation: '471,000원', note: '남학생 전용' },
];

const DORM_NOTES = [
  '상기 금액은 2025학년도 기준이며 향후 변동될 수 있습니다.',
  '교내 기숙사가 부족할 경우 외부에 거주하여야 합니다.',
  '여름, 겨울 학기 신청자는 기숙사 일정에 따라 일부에 한 달 정도 거주 후 입주가 가능합니다.',
];

const REGISTER_STEPS = [
  '온라인지원',
  '계정생성',
  '지원서 작성 및 제출',
  '심사 및 합격 통보',
  '학비 납부 및 서류 제출',
  '입금 확인',
  '표준입학허가서 발급',
  '비자 신청',
  '레벨테스트',
  '입학',
];

const TUITION_CARDS = [
  { title: '1학기', value: '1,500,000원', detail: '10주' },
  { title: '2학기', value: '3,000,000원', detail: '20주' },
  { title: '전형료', value: '100,000원', detail: '환불 불가' },
  { title: '보험', value: 'D-4 비자', detail: '실손보험 지원' },
];

const REGISTER_DOCUMENTS: Record<RegisterDocumentTabKey, TextSection[]> = {
  d4: [
    {
      title: '입학신청',
      items: ['온라인 지원'],
    },
    {
      title: '학력증명서',
      items: [
        '최종학력 졸업증명서 1부 및 전 학년 성적이 기재되어 있는 성적증명서 1부',
        'Apostille 인증서 또는 대한민국 영사관 인증을 받은 증명서 원본 제출',
        '한국어 또는 영어 외 서류의 경우 번역공증 원본 제출',
      ],
    },
    {
      title: '재정증명',
      items: [
        '30일 이내 발급된 KRW 1천만원 이상의 은행잔고 영문 증명서 사본 1부',
        '3개월 이상 예치',
        '화폐 단위는 KRW, USD, 자국 화폐단위로 표시 가능',
        '부모 재직증명서 및 소득증명서 제출',
      ],
    },
    {
      title: '가족관계 증명',
      items: [
        '해당 국가의 가족관계 증명서 또는 출생증명서',
        '가족이 기재되어 있는 증빙 서류',
        '영문성명을 알 수 있는 자료',
      ],
    },
    {
      title: '신원보증서 (필요 시)',
      items: [
        '보증인의 신분증 사본 1부',
        '보증인의 재학 또는 재직증명서 1부',
        '신원보증인은 한국에 거주하는 사람이어야 하며, 없는 경우 부모님 제출 가능',
        '대리접수의 경우 대리인이 신원보증인이 되어야 하며 모든 법적 책임은 대리인에게 있음',
      ],
    },
    {
      title: '여권 사본',
      items: ['본인 사진이 나와있는 페이지 여권 사본 1부'],
    },
  ],
  china: [
    {
      title: '입학신청',
      items: ['온라인 지원'],
    },
    {
      title: '최종학력 증명서 및 성적증명서',
      items: [
        '최종학력 졸업증명서 1부 및 전 학년 성적이 기재되어 있는 성적증명서 1부',
        'Apostille 인증서, 대한민국 영사관 인증, 중국교육부 학력인증보고서 중 한 가지 방법으로 인증 받은 원본 서류',
        '한국어 또는 영어 외 서류의 경우 번역공증 원본 제출',
        '대학교 또는 전문대 재학 중인 경우 고등학교 졸업증명서 원본 1부와 대학교 재학증명서 원본 1부',
      ],
    },
    {
      title: '학력입증서류',
      items: [
        '최종 학력 입증서류',
        '중국 내 학력, 학위 취득자에 한하여 둘 중 택일',
        '중국 한국영사 또는 주한중국공관 영사확인을 받은 학력 입증 서류',
        '중국교육부 운영 학력·학위인증센터 발행 학력/학위 인증보고서',
      ],
    },
    {
      title: '재정입증서류',
      items: [
        '은행잔고증명서',
        '인민폐 4만원 이상 예치',
        '은행잔고 예치 만료일은 최소 신청하고자 하는 두 번째 학기의 종료일 이후',
        '은행 지점 전화번호와 담당자 이름 기재',
        '부모 재직 및 소득증명서',
        '최근 1년간 매월 급여, 보너스, 세금 등 상세내역 포함',
        '증명서 발급 담당자 이름 및 직장 전화번호 기재',
      ],
    },
    {
      title: '가족관계 입증서류',
      items: [
        '친족관계증명서 또는 전가족 호구부 중 택일',
        '공증: 전 가족 신분증 사본 앞, 뒷면',
        '호구부가 분리되어 있는 경우 가족관계증명 원본 제출',
        '부모 이혼 또는 사망 시 사실 확인 증명서 제출',
      ],
    },
    {
      title: '신원보증서 (필요 시)',
      items: [
        '보증인의 신분증 사본 1부',
        '보증인의 재학 또는 재직증명서 원본 1부',
        '신원보증인은 한국에 거주하는 사람이어야 하며, 없는 경우 부모님 제출 가능',
        '대리접수의 경우 대리인이 신원보증인이 되어야 하며 모든 법적 책임은 대리인에게 있음',
      ],
    },
    {
      title: '여권',
      items: ['본인 사진이 나와있는 페이지 여권 사본 1부'],
    },
  ],
  resident: [
    {
      title: '입학신청',
      items: ['온라인 지원'],
    },
    {
      title: '최종학력 졸업증명서 및 성적증명서',
      items: [
        '고등학교 또는 대학교 졸업증명서 사본 1부',
        '지원자가 아주대학교 재학생인 경우 재학증명서로 대체 가능',
        'Apostille 인증서 또는 대한민국 영사관 인증을 받은 증명서 원본 제출',
        '한국어 또는 영어 외 서류의 경우 번역공증 원본 제출',
      ],
    },
    {
      title: '여권',
      items: ['본인 사진이 나와있는 페이지 여권 사본 1부'],
    },
    {
      title: '외국인등록증',
      items: ['외국인등록증 앞, 뒷면 사본 1부'],
    },
    {
      title: '보험',
      items: [
        '한국 체류 중 발생할 수 있는 상해 또는 질병을 대비하여 유학생 보험 가입은 필수입니다.',
        '보험에 가입되지 않은 학생은 국제교육센터 운영팀에 문의 후 신청하시기 바랍니다.',
        '보험 청구 사이트: http://n.foreignerdb.com/SC9999/',
        'ID: 학번, 여권번호, 외국인등록번호 중 하나 / Password(임시 비밀번호): 111111',
        '문의: 031-219-3599 / koli@ajou.ac.kr',
        '보험에 가입하지 않을 경우 학생증 발급이 불가하며 문화체험 등 활동 참여에 제한이 있습니다.',
      ],
    },
  ],
};

const REGISTER_SCHEDULE = [
  {
    term: '26-봄',
    apply: '2025.11.10(월) ~ 2025.12.26(금)',
    levelTest: '2026.02.11(수)',
    orientation: '2026.02.27(금)',
    start: '2026.03.03(화)',
    end: '2026.05.12(화)',
  },
  {
    term: '26-여름',
    apply: '2026.02.09(월) ~ 2026.03.27(금)',
    levelTest: '2026.05.13(수)',
    orientation: '2026.05.29(금)',
    start: '2026.06.01(월)',
    end: '2026.08.11(화)',
  },
  {
    term: '26-가을',
    apply: '2026.05.11(월) ~ 2026.07.10(금)',
    levelTest: '2026.08.12(수)',
    orientation: '2026.09.04(금)',
    start: '2026.09.07(월)',
    end: '2026.11.19(목)',
  },
  {
    term: '26-겨울',
    apply: '2026.08.10(월) ~ 2026.09.25(금)',
    levelTest: '2026.11.20(월)',
    orientation: '2026.11.27(금)',
    start: '2026.12.04(금)',
    end: '2027.02.17(수)',
  },
];

const TOPIK_CONTENT: Record<TopikTabKey, TextSection[]> = {
  pbt: [
    {
      title: '시험 수준 및 등급',
      items: [
        '시험수준: 토픽 I, 토픽 II',
        '평가등급: 6개 등급(1~6급)',
        '획득한 총점 점수를 기준으로 등급이 판정됩니다.',
        '1급: 80~139점',
        '2급: 140~200점',
        '3급: 120~149점',
        '4급: 150~189점',
        '5급: 190~229점',
        '6급: 230~300점',
      ],
    },
    {
      title: '시험 시간표',
      variant: 'table',
      items: [],
      tableColumns: ['구분', '영역', '입실 완료', '시작', '종료', '시간'],
      tableRows: [
        ['TOPIK I', '듣기, 읽기', '09:20', '10:00', '11:40', '100분'],
        ['TOPIK II 1교시', '듣기, 쓰기', '12:20', '13:00', '14:50', '110분'],
        ['TOPIK II 2교시', '읽기', '15:10', '15:20', '16:30', '70분'],
      ],
    },
    {
      title: '응시료 (한국 기준)',
      items: ['토픽 I: 40,000원', '토픽 II: 55,000원'],
    },
    {
      title: '응시자 유의사항',
      items: [
        '국립국제교육원 한국어능력시험센터(TOPIK)에서는 홈페이지, 수험표를 통해 수험생이 반드시 준수해야 할 사항을 공지하고 있습니다.',
        '이를 위반하는 응시자에게는 기본운영 규정 제18조에 따라 해당 시험의 무효나 취소, 2년 또는 4년간 시험 응시 자격 제한 등의 처분을 하고 있습니다.',
        '홈페이지에 게시된 응시규정 및 각종 공지사항을 반드시 확인해 주시기 바랍니다.',
      ],
    },
    {
      title: '시험당일 준비물',
      items: ['신분증(자세한 사항은 홈페이지 > 토픽 소개 > 응시규정 > 신분증 지침 참고)'],
    },
    {
      title: '입실 시간 및 고사실 확인',
      items: [
        '토픽 I의 경우, 오전 09:20까지 시험실 입실완료(오전 09:20 이후 시험실 입실 절대 불가)',
        '토픽 II의 경우, 오후 12:20까지 시험실 입실완료(오후 12:20 이후 시험실 입실 절대 불가)',
        '본인이 신청한 시험장 또는 배정받은 시험실/좌석과 다른 장소에서 응시 불가',
      ],
    },
    {
      title: '토픽 I의 경우(오전)',
      variant: 'table',
      items: [],
      tableColumns: ['시간', '내용', '비고'],
      tableRows: [
        ['~ 09:20까지', '시험실 입실 완료', '09:20 이후 시험실 입실 절대 불가'],
        ['09:20 ~ 09:50 (30분)', '답안지 작성 안내 및 본인 확인', '휴대폰 및 전자기기 제출'],
        ['09:50 ~ 10:00 (10분)', '문제지 배부 및 듣기 시험 방송', ''],
        ['10:00 ~ 10:40 (40분)', '듣기 시험', ''],
        ['10:40 ~ 11:40 (60분)', '읽기 시험', ''],
      ],
    },
    {
      title: '토픽 II의 경우(오후)',
      variant: 'table',
      items: [],
      tableColumns: ['시간', '내용', '비고'],
      tableRows: [
        ['~ 12:20까지', '시험실 입실 완료', '12:20 이후 시험실 입실 절대 불가'],
        ['12:20 ~ 12:50 (30분)', '답안지 작성 안내 및 1차 본인 확인', '휴대폰 및 전자기기 제출'],
        ['12:50 ~ 13:00 (10분)', '문제지 배부 및 듣기 시험 방송', ''],
        ['13:00 ~ 14:00 (60분)', '듣기 시험', '듣기 시험 정상 종료 시 듣기 답안지 회수'],
        ['14:00 ~ 14:50 (50분)', '쓰기 시험', ''],
        ['14:50 ~ 15:10 (20분)', '쉬는 시간', ''],
        ['15:10 ~ 15:20 (10분)', '답안지 작성 안내 및 2차 본인 확인', ''],
        ['15:20 ~ 16:30 (70분)', '읽기 시험', ''],
      ],
    },
    {
      title: '토픽 II 유의사항',
      items: [
        '시험실에 입실시간 내 반드시 입실. 입실시간이 지났을 경우 입실 불가',
        '입실 지체로 인한 불이익에 대한 책임은 응시자에게 있음',
      ],
    },
    {
      title: '시험 중 유의사항',
      items: [
        '시험 시간에는 시험 포함 중에는 모든 전자기기(스마트워치 등 웨어러블 기기 포함)를 사용할 수 없으며, 소지 적발 시에는 부정행위로 간주합니다.',
        '시험 당일에는 시험시작 40분 전까지 해당 시험실의 지정된 자리에 앉아 시험 감독관의 지시를 따라야 합니다.',
        '시험 시간 중에는 신분증을 자기 책상 위에 놓아야 합니다.',
        '시험 중 책상 위에는 신분증 외에 어떠한 물품도 놓을 수 없으며 적발 시 부정행위로 처리됩니다.',
        '환불 기간에 환불을 신청한 경우, 환불 처리 여부와 상관없이 시험에 응시할 수 없습니다.',
        '시험 시간 관리 책임은 수험생 본인에게 있으며, 시간 내에 답안 작성을 완료하여야 합니다.',
        'TOPIK II 1교시 듣기 평가 시에는 듣기만, 쓰기 평가 시에는 쓰기만 풀어야 하며 이를 위반하면 부정행위로 처리됩니다.',
        '시험 시간 도중에는 퇴실할 수 없으나, 부득이한 경우 감독관의 허락을 받아 다른 응시자에게 방해되지 않도록 조용히 퇴실할 수 있습니다.',
        '시험 중 진행으로 인한 화장실 이용 등으로 인하여 부득이하게 복도로 나갈 시 부정행위 예방을 위한 복도감독관의 확인에 협조하여야 합니다.',
        'TOPIK II 시험 2개 교시 중 어느 하나라도 결시한 응시자는 결시자로 처리됩니다. (1교시 결시자는 2교시 응시 불가)',
        '시험 시간 중 다른 사람에게 피해를 주는 행위(소란, 음식물 섭취 등)는 해서는 안 됩니다.',
        '시험장 내에서는 흡연할 수 없으며, 시설물이 훼손되지 않도록 주의하여야 합니다.',
        '시험 감독관의 지시를 따르지 않는 자 및 부정행위자는 당해 시험의 정지, 무효 또는 합격 취소 처분을 받을 수 있으며, 향후 2년도는 4년간 시험 응시 자격이 제한될 수 있습니다.',
      ],
    },
    {
      title: '본인 확인 관련',
      items: [
        '본인 확인을 위해 수험표와 규정된 신분증(기간 만료 전의 여권, 외국인등록증 등)을 반드시 소지하여야 하며, 시험 당일 신분증을 가져오지 않은 응시자는 시험에 응시할 수 없습니다.',
        '대학(원)생의 학생증, 자격증 등은 신분증으로 인정하지 않으며, 신분증의 사본 및 촬영본 등도 인정하지 않습니다.',
        '감독관의 응시자 본인 확인 절차에 성실하게 응하여야 하며 따르지 않으면 부정행위로 간주될 수 있습니다.',
        '본인 확인이 명확하게 이루어지지 않을 경우, 추가 본인확인 조치를 받을 수 있습니다.',
      ],
    },
    {
      title: '반입 금지 물품 관련',
      items: [
        '반입 금지 물품을 시험실에 가지고 들어온 경우 반드시 1교시 시작 전 감독관 지시에 따라 전원을 끄고 제출해야 합니다.',
        '휴대전화, 스마트기기(스마트워치, 스마트안경 등), 디지털 카메라, 전자사전, MP3 플레이어, 태블릿PC, 카메라펜, 전자계산기, 라디오, 휴대용 미디어 플레이어, 전자담배, 통신 기능 또는 전자식 화면표시기가 있는 시계 등 모든 전자기기는 시험실 반입 금지 물품입니다.',
        '반입 금지 물품을 제출하지 않고 시험 중 소지한 것이 적발될 경우 시험 시간·쉬는 시간을 불문하고 고등교육법 시행령 및 한국어능력시험 기본 운영 규정에 따라 부정행위자로 조치됩니다.',
      ],
    },
    {
      title: '답안지 작성 관련',
      items: ['자세한 사항은 홈페이지 > 토픽 > 유의사항 > 답안작성요령 참고'],
    },
    {
      title: '부정행위 처리',
      items: [
        '부정행위자는 해당 시험 성적이 무효 처리되며 부정행위 유형에 따라 2년 또는 4년간 응시 제한 처분을 받을 수 있습니다.',
        '문제지와 답안지를 유출·배포·대리응시·성적증명서 위조 등의 행위는 민·형사상의 처벌을 받을 수 있습니다.',
      ],
    },
    {
      title: '성적유효기간',
      items: ['한국어능력시험의 성적 유효 기간은 성적발표일로부터 2년입니다.'],
    },
    {
      title: '시험 문제 무단 배포 금지',
      items: [
        '한국어능력시험 문제는 출제자의 창작성 인정되는 저작물로서 저작권자의 허락 없이 무단으로 유출, 복제, 배포할 수 없습니다.',
        '이를 무단으로 업로드·유출·배포한 경우에는 민·형사상의 처벌을 받을 수 있으며, 한국어능력시험 기본운영 규정 제18조에 따라 응시자격이 제한됩니다.',
      ],
    },
  ],
  ibt: [
    {
      title: '시험 효력',
      items: [
        'PBT 시험과 동일한 효력을 가집니다.',
        'PBT 시험과 동일한 등급체계를 적용합니다.',
      ],
    },
    {
      title: '시험 시간표',
      variant: 'table',
      items: [],
      tableColumns: ['구분', '영역', '입실 시작', '입실 완료', '시험 시작', '시험 종료', '시간'],
      tableRows: [
        ['TOPIK I IBT', '듣기 30분, 읽기 40분', '08:30', '08:50', '09:30', '10:40', '70분'],
        ['TOPIK II IBT', '듣기 35분, 읽기 40분, 쓰기 50분', '12:00', '12:20', '13:00', '15:05', '125분'],
      ],
    },
    {
      title: '시험 방법',
      items: [
        '인터넷 기반 시험(IBT)입니다.',
        '인터넷 환경이 구축된 시험장에서 PC 또는 태블릿 등 정보기기를 통해 시험을 실시합니다.',
      ],
    },
    {
      title: '응시료 (한국 기준)',
      items: ['토픽 I IBT: 70,000원', '토픽 II IBT: 95,000원'],
    },
    {
      title: '유의사항',
      items: [
        '해외시험시간은 현지접수기관에 문의하시기 바랍니다.',
        '시험 시작 40분 이전까지 시험실에 입실해야 합니다. 입실 완료 시간 후에는 시험실 입실이 불가하므로 여유 있게 입실하여 주시기 바랍니다.',
        '시험 시작 이후, 시험 종료 시까지 원칙적으로 퇴실이 불가하며, 중도 퇴실자는 시험 종료 시까지 별도 공간에서 대기해야 합니다. 중도 퇴실자는 성적이 나오지 않습니다.',
        '시험시간 도중 질병 등의 사유로 퇴실 및 재입실 시, 별도 감독관에게 확인받아야 합니다.',
        '시험 종료 후 시험실 감독관의 지시가 있을 때까지 퇴실할 수 없습니다.',
        '한국어능력시험(토픽 I, 토픽 II) IBT 평가는 시험 중간에 휴식 시간이 없습니다.',
        '국외 한국어능력시험(토픽 I, 토픽 II) IBT 평가 시간은 국외 현지 시행기관에 확인',
      ],
    },
  ],
  speaking: [
    {
      title: '시험 목적',
      items: [
        '한국어를 모국어로 하지 않는 재외동포·외국인의 의사소통 중심 한국어 학습 방향을 제시합니다.',
        '한국어 의사소통 능력을 측정·평가하여 그 결과를 국내 대학 유학 및 취업 등에 활용합니다.',
      ],
    },
    {
      title: '응시 대상',
      items: [
        '한국어를 모국어로 하지 않는 재외동포 및 외국인',
        '한국어 학습자 및 국내 대학 유학 희망자',
        '국내외 한국 기업체 및 공공기관 취업 희망자',
        '외국 학교에 재학 중이거나 졸업한 재외국민',
      ],
    },
    {
      title: '응시료',
      items: ['80,000원'],
    },
    {
      title: '유효기간',
      items: ['성적 발표일로부터 2년간 유효합니다.'],
    },
    {
      title: '주관기관',
      items: ['교육부 국립국제교육원'],
    },
    {
      title: '시험 활용처',
      items: [
        'GKS 우수자비 장학생 선발',
        '외국인 및 12년 외국 교육과정 이수 재외동포의 국내대학 입학 및 장학생 선발',
        '한국기업체 취업희망자의 선발 및 인사고과',
        '체류 비자 발급 신청',
      ],
    },
    {
      title: '시험 시간표',
      variant: 'table',
      items: [],
      tableColumns: ['구분', '시간'],
      tableRows: [
        ['입실 시작', '16:00'],
        ['입실 완료', '16:20까지'],
        ['시험 시작', '17:00'],
        ['시험 종료', '17:30'],
        ['시험시간', '30분'],
      ],
    },
    {
      title: '유의사항',
      items: [
        '시험 시작 40분 이전까지 시험실에 입실해야 합니다. 입실 완료 시간 후에는 시험실 입실이 불가하므로 여유 있게 입실하여 주시기 바랍니다.',
        '시험 시작 이후, 시험 종료 시까지 원칙적으로 퇴실이 불가하며, 중도 퇴실자는 시험 종료 시까지 별도 공간에서 대기해야 합니다. 중도 퇴실자는 성적이 나오지 않습니다.',
        '시험시간 도중 질병 등의 사유로 퇴실 및 재입실 시, 별도 감독관에게 확인받아야 합니다.',
        '시험 종료 후 시험실 감독관의 지시가 있을 때까지 퇴실할 수 없습니다.',
        '토픽 말하기 평가는 시험 중간에 휴식 시간이 없습니다.',
      ],
    },
  ],
  schedule: [
    {
      title: '2026년 TOPIK PBT 일정',
      variant: 'table',
      items: [],
      tableColumns: ['접수기간', '시험일', '성적발표일'],
      tableRows: [
        ['2025.12.09 ~ 2025.12.15', '2026.01.11', '2026.02.12 15:45'],
        ['2026.01.27 ~ 2026.02.02', '2026.04.12', '2026.05.29 15:00'],
        ['2026.03.10 ~ 2026.03.16', '2026.05.17', '2026.06.25 15:00'],
        ['2026.05.12 ~ 2026.05.18', '2026.07.05', '2026.08.13 15:00'],
        ['2026.08.04 ~ 2026.08.10', '2026.10.18', '2026.12.10 15:00'],
        ['2026.09.01 ~ 2026.09.07', '2026.11.15', '2026.12.22 15:00'],
      ],
    },
    {
      title: '2026년 TOPIK IBT 일정',
      variant: 'table',
      items: [],
      tableColumns: ['접수기간', '시험일', '성적발표일'],
      tableRows: [
        ['2025.12.16 ~ 2025.12.22', '2026.02.28', '2026.03.20 15:00'],
        ['2026.01.13 ~ 2026.01.19', '2026.03.21', '2026.04.10 15:00'],
        ['2026.04.07 ~ 2026.04.13', '2026.06.13', '2026.07.03 15:00'],
        ['2026.07.07 ~ 2026.07.13', '2026.09.12', '2026.10.02 15:00'],
        ['2026.08.18 ~ 2026.08.24', '2026.10.24', '2026.11.13 15:00'],
        ['2026.09.15 ~ 2026.09.21', '2026.11.28', '2026.12.18 15:00'],
      ],
    },
    {
      title: '2026년 TOPIK 말하기 평가 일정',
      variant: 'table',
      items: [],
      tableColumns: ['접수기간', '시험일', '성적발표일'],
      tableRows: [
        ['2026.01.13 ~ 2026.01.19', '2026.03.21', '2026.04.13 15:00'],
        ['2026.04.07 ~ 2026.04.13', '2026.06.13', '2026.07.06 15:00'],
        ['2026.08.18 ~ 2026.08.24', '2026.10.24', '2026.11.16 15:00'],
      ],
    },
    {
      title: '확인 안내',
      items: [
        '시험 일정은 TOPIK 공식 홈페이지 공지를 기준으로 확인해야 합니다.',
        '접수기간과 성적발표일은 시험 운영 상황에 따라 변경될 수 있습니다.',
        '지역별 시험일이 다른 경우 한국 시험일을 우선 표시했습니다.',
      ],
    },
  ],
};

const VISA_CONTENT: Record<Exclude<VisaTabKey, 'links'>, TextSection[]> = {
  overview: [
    {
      title: 'D-2 비자란?',
      items: [
        '정규 대학(원) 과정 재학 외국인을 위한 유학 체류자격',
        '학부생 → D-2-2 / 석사 → D-2-3 / 박사 → D-2-4',
        '체류기간은 보통 1~2년 단위로 발급, 재학 중 계속 연장 가능',
        '입국 후 90일 이내 반드시 외국인등록증 신청 필요',
      ],
    },
    {
      title: '반드시 확인',
      variant: 'warning',
      items: [
        '비자 만료 전에 연장 신청을 완료해야 합니다.',
        '만료 후 체류 시 과태료 부과 및 강제출국 대상이 될 수 있습니다.',
      ],
    },
    {
      title: '외국인등록증 발급',
      variant: 'steps',
      items: [
        '입국 후 90일 이내 수원출입국·외국인사무소 방문',
        '하이코리아(hikorea.go.kr)에서 방문 예약 필수',
        '여권, 표준입학허가서, 증명사진 2매, 수수료(30,000원) 지참',
        '신청 후 약 2~3주 내 수령',
      ],
    },
    {
      title: '재정요건',
      items: ['체류비 입증: 미화 약 $20,000 이상 (한화 약 2,300만원) 예금잔고증명'],
    },
  ],
  extension: [
    {
      title: '연장 신청 시기',
      variant: 'warning',
      items: [
        '등록금 납부 이후 신청 가능합니다.',
        '비자 만료 전에 납부 완료 + 신청을 마쳐야 합니다.',
        '만료 전 비자 만료 예정자는 반드시 국제교류팀(OIA)과 먼저 상의하세요.',
      ],
    },
    {
      title: '연장 절차',
      variant: 'steps',
      items: [
        '아주대 OIA 국제교류팀 방문 → 사증발급인정번호 신청 서류 제출',
        'OIA에서 수원출입국사무소에 신청',
        '발급된 번호를 이메일로 통보 수령',
        '하이코리아 또는 수원출입국사무소 직접 방문하여 연장 완료',
      ],
    },
    {
      title: '연장 필요 서류 — 공통',
      items: [
        '통합신청서 (출입국사무소 비치 또는 hikorea.go.kr 34호 서식)',
        '여권 원본 + 외국인등록증',
        '표준입학허가서 (등록금 납부 후 발급)',
        '재학증명서',
        '성적증명서',
        '예금잔고증명서 ($20,000 이상, 등록금 납부액 제외 후)',
        '체류지 입증서류 (기숙사 확인서 또는 임대차계약서)',
        '수수료 (60,000원)',
      ],
    },
  ],
  change: [
    {
      title: 'D-4 → D-2 변경 (어학연수 → 학위과정)',
      variant: 'steps',
      items: [
        '등록금 납부 완료 후 표준입학허가서 발급',
        '수원출입국사무소에 체류자격 변경허가 직접 신청',
        '학기 시작 이전에 반드시 완료 (개강 후 변경 시 과태료)',
      ],
    },
    {
      title: 'D-4 → D-2 추가 필요 서류',
      items: [
        '한국어 어학연수 수료(예정) 증명서 (출석률·기간 명시)',
        '본국 최종학력증명서 + 가족관계증명서 (원본 + 번역본)',
      ],
    },
    {
      title: 'D-2 → E-3 변경 (졸업 후 연구)',
      items: [
        '졸업 후 연구과제 참여 시 적용 (석사학위 이상 + 해당 분야 3년 이상 경력)',
        '고용계약 90일 전부터 신청 가능, 계약 시작일 최소 1개월 전 신청 권장',
        '근무기간 최소 3개월 이상이어야 E-3 발급 가능 (미만 시 C-4 단기취업)',
        '수원출입국사무소 사전 허가 필수 — OIA 통해 진행',
      ],
    },
  ],
  work: [
    {
      title: '시간제취업 기본 원칙',
      items: [
        'D-2 비자는 기본적으로 영리·취업활동 불가',
        '단, 학교 확인 + 출입국사무소 허가 시 아르바이트 수준 허용',
      ],
    },
    {
      title: '허가 시간 기준 (주당)',
      items: [
        'TOPIK 미소지: 주 최대 10시간 (주중·주말·방학 포함)',
        '학부 1~2학년 + TOPIK 소지: 주 최대 20시간',
        '학부 3학년 이상 + TOPIK 소지: 주 최대 25시간',
        '석·박사 + TOPIK 4급 이상: 주 최대 30시간 (주말·방학 무제한)',
      ],
    },
    {
      title: '허가 없이 가능한 활동',
      items: [
        '재학 중인 학교의 조교 (수업조교 포함)',
        '근로장학생',
        '일시적 사례금 지급 업무',
      ],
    },
    {
      title: '신청 방법',
      variant: 'steps',
      items: [
        '직접 방문: hikorea.go.kr → 방문 예약 후 수원출입국사무소',
        '온라인 신청: hikorea.go.kr → 전자민원 → "유학생(D-2) 시간제취업 허가" 선택',
      ],
    },
  ],
};

const VISA_LINKS = [
  { title: '아주대 OIA — 비자 안내', url: 'https://oia.ajou.ac.kr' },
  { title: '하이코리아 — 비자 신청·방문예약', url: 'https://www.hikorea.go.kr' },
  { title: '법무부 출입국·외국인청', url: 'https://www.immigration.go.kr' },
  { title: '국민건강보험공단', url: 'https://www.nhis.or.kr' },
  { title: '정부24 외국인 서비스', url: 'https://www.gov.kr' },
];

export default function TopicScreen() {
  const router = useRouter();
  const { topicKey } = useLocalSearchParams();
  const [activeVisaTab, setActiveVisaTab] = useState<VisaTabKey>('overview');
  const [activeTopikTab, setActiveTopikTab] = useState<TopikTabKey>('pbt');
  const [activeRegisterTab, setActiveRegisterTab] = useState<RegisterTabKey>('steps');
  const [activeRegisterDocTab, setActiveRegisterDocTab] = useState<RegisterDocumentTabKey>('d4');
  const [activeScholarshipTab, setActiveScholarshipTab] = useState<ScholarshipTabKey>('korean');
  const [activeLifeTab, setActiveLifeTab] = useState<LifeTabKey>('support');

  const key = Array.isArray(topicKey) ? topicKey[0] : topicKey;
  const topic = key && key in TOPIC_DATA ? TOPIC_DATA[key as TopicKey] : undefined;

  if (key === 'visa') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.visaHero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.visaTitle}>비자 (Visa)</Text>
          <Text style={styles.visaSubtitle}>D-2 유학 체류자격 안내</Text>
        </View>

        <View style={styles.tabBar}>
          {VISA_TABS.map((tab) => {
            const isActive = activeVisaTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveVisaTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.visaContent}>
          {activeVisaTab === 'links' ? (
            <OfficialLinks />
          ) : (
            VISA_CONTENT[activeVisaTab].map((section) => (
              <VisaSection key={section.title} section={section} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (key === 'topik') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.visaHero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.visaTitle}>TOPIK</Text>
          <Text style={styles.visaSubtitle}>한국어능력시험 안내</Text>
        </View>

        <View style={styles.tabBar}>
          {TOPIK_TABS.map((tab) => {
            const isActive = activeTopikTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveTopikTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.visaContent}>
          {TOPIK_CONTENT[activeTopikTab].map((section) => (
            <VisaSection key={section.title} section={section} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (key === 'register') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.visaHero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.visaTitle}>한국어과정</Text>
          <Text style={styles.visaSubtitle}>Korean Program</Text>
        </View>

        <View style={styles.tabBar}>
          {REGISTER_TABS.map((tab) => {
            const isActive = activeRegisterTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveRegisterTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.visaContent}>
          {activeRegisterTab === 'steps' && <RegisterSteps />}
          {activeRegisterTab === 'info' && <RegisterInfo />}
          {activeRegisterTab === 'documents' && (
            <RegisterDocuments
              activeTab={activeRegisterDocTab}
              onSelectTab={setActiveRegisterDocTab}
            />
          )}
          {activeRegisterTab === 'schedule' && <RegisterSchedule />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (key === 'scholarship') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.visaHero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.visaTitle}>장학제도</Text>
          <Text style={styles.visaSubtitle}>Korean Program & GKS Scholarship</Text>
        </View>

        <View style={styles.tabBar}>
          {SCHOLARSHIP_TABS.map((tab) => {
            const isActive = activeScholarshipTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveScholarshipTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.visaContent}>
          <ScholarshipContent activeTab={activeScholarshipTab} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (key === 'life') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.visaHero}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.visaTitle}>생활안내</Text>
          <Text style={styles.visaSubtitle}>Campus Life Support</Text>
        </View>

        <View style={styles.tabBar}>
          {LIFE_TABS.map((tab) => {
            const isActive = activeLifeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabButton}
                onPress={() => setActiveLifeTab(tab.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.container} contentContainerStyle={styles.visaContent}>
          {activeLifeTab === 'support' ? <LifeSupport /> : <DormInfo />}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Information</Text>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        {topic ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.title}>{topic.title}</Text>
              <Text style={styles.subtitle}>{topic.subtitle}</Text>
            </View>

            {topic.sections.map((section) => (
              <View key={section.title} style={styles.card}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>존재하지 않는 주제</Text>
            <Text style={styles.emptyText}>메뉴에서 다시 선택해주세요.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VisaSection({ section }: { section: TextSection }) {
  const isWarning = section.variant === 'warning';
  const isSteps = section.variant === 'steps';
  const isTable = section.variant === 'table';
  const isCompactTable = (section.tableColumns?.length ?? 0) <= 3;

  return (
    <View style={styles.visaSection}>
      <Text style={styles.visaSectionTitle}>
        {isWarning ? '⚠️ ' : ''}
        {section.title}
      </Text>

      <View
        style={[
          styles.infoCard,
          isWarning && styles.warningCard,
          isSteps && styles.stepCard,
          isTable && styles.tableCard,
        ]}
      >
        {isTable ? (
          isCompactTable ? (
            <View
              style={[
                styles.table,
                styles.compactTable,
              ]}
            >
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                {section.tableColumns?.map((column) => (
                  <View
                    key={column}
                    style={[
                      styles.tableCell,
                      styles.compactTableCell,
                    ]}
                  >
                    <Text style={[styles.tableText, styles.tableHeaderText]}>{column}</Text>
                  </View>
                ))}
              </View>

              {section.tableRows?.map((row, rowIndex) => (
                <View key={`${section.title}-${rowIndex}`} style={styles.tableRow}>
                  {row.map((cell, cellIndex) => (
                    <View
                      key={`${section.title}-${rowIndex}-${cellIndex}`}
                      style={[
                        styles.tableCell,
                        styles.compactTableCell,
                      ]}
                    >
                      <Text style={styles.tableText}>{cell}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  {section.tableColumns?.map((column) => (
                    <View key={column} style={styles.tableCell}>
                      <Text style={[styles.tableText, styles.tableHeaderText]}>{column}</Text>
                    </View>
                  ))}
                </View>

                {section.tableRows?.map((row, rowIndex) => (
                  <View key={`${section.title}-${rowIndex}`} style={styles.tableRow}>
                    {row.map((cell, cellIndex) => (
                      <View key={`${section.title}-${rowIndex}-${cellIndex}`} style={styles.tableCell}>
                        <Text style={styles.tableText}>{cell}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )
        ) : (
          section.items.map((item, index) =>
            isSteps ? (
              <View key={item} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <Text style={styles.infoText}>{item}</Text>
              </View>
            ) : (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.visaBullet} />
                <Text style={[styles.infoText, isWarning && styles.warningText]}>{item}</Text>
              </View>
            )
          )
        )}
      </View>
    </View>
  );
}

function RegisterSteps() {
  return (
    <View style={styles.registerStepList}>
      {REGISTER_STEPS.map((step, index) => (
        <View key={step} style={styles.registerStepItem}>
          <View style={styles.registerStepCard}>
            <View style={styles.registerStepBadge}>
              <Text style={styles.registerStepBadgeText}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.registerStepBody}>
              <Text style={styles.registerStepNumber}>Step. {String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.registerStepText}>{step}</Text>
            </View>
          </View>
          {index < REGISTER_STEPS.length - 1 && (
            <Ionicons
              name="arrow-down"
              size={20}
              color="#94A3B8"
              style={styles.registerStepArrow}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function RegisterInfo() {
  return (
    <>
      <View style={styles.visaSection}>
        <Text style={styles.visaSectionTitle}>지원자격</Text>
        <View style={styles.infoCard}>
          <View style={styles.bulletRow}>
            <View style={styles.visaBullet} />
            <Text style={styles.infoText}>고등학교 졸업 이상 또는 동등 학력</Text>
          </View>
        </View>
      </View>

      <View style={styles.visaSection}>
        <Text style={styles.visaSectionTitle}>학비</Text>
        <View style={styles.tuitionGrid}>
          {TUITION_CARDS.map((card) => (
            <View key={card.title} style={styles.tuitionCard}>
              <Text style={styles.tuitionTitle}>{card.title}</Text>
              <Text style={styles.tuitionValue}>{card.value}</Text>
              <Text style={styles.tuitionDetail}>{card.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.visaSection}>
        <Text style={styles.visaSectionTitle}>추가 안내</Text>
        <View style={[styles.infoCard, styles.warningCard]}>
          {[
            '송금 시 발생하는 각종 은행 수수료는 개인 부담이며 환율 등으로 차액이 발생한 경우 입학 후 추가 납부 필요',
            '정부정책에 따라 유학생의 국민건강보험 가입 의무',
            '전형료 및 보험료 변동 가능',
            '교재비 별도',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.visaBullet} />
              <Text style={[styles.infoText, styles.warningText]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

function RegisterDocuments({
  activeTab,
  onSelectTab,
}: {
  activeTab: RegisterDocumentTabKey;
  onSelectTab: (tab: RegisterDocumentTabKey) => void;
}) {
  return (
    <>
      <View style={styles.subTabBar}>
        {REGISTER_DOCUMENT_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.subTabButton, isActive && styles.subTabButtonActive]}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.infoCard, styles.warningCard, styles.documentNotice]}>
        <Text style={[styles.infoText, styles.warningText]}>
          본인의 비자 종류에 따라 제출서류가 다릅니다. 제출 서류가 한국어, 영어 외 언어로 되어 있을 경우 번역 공증 원본을 제출하세요.
        </Text>
        <Text style={[styles.infoText, styles.warningText]}>
          허위 서류 제출 시 납부한 학비 및 기숙사비는 환불 불가합니다.
        </Text>
      </View>

      {REGISTER_DOCUMENTS[activeTab].map((section, index) => (
        <View key={section.title} style={styles.documentCard}>
          <View style={styles.documentIndex}>
            <Text style={styles.documentIndexText}>{index + 1}</Text>
          </View>
          <View style={styles.documentBody}>
            <Text style={styles.documentTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <View key={item} style={styles.documentBulletRow}>
                <View style={styles.documentBullet} />
                <Text style={styles.documentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

function RegisterSchedule() {
  return (
    <View style={styles.scheduleList}>
      {REGISTER_SCHEDULE.map((item) => (
        <View key={item.term} style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTerm}>{item.term}</Text>
          </View>
          <ScheduleRow label="신청" value={item.apply} />
          <ScheduleRow label="레벨테스트" value={item.levelTest} />
          <ScheduleRow label="신입생설명회" value={item.orientation} />
          <ScheduleRow label="개강" value={item.start} />
          <ScheduleRow label="수료" value={item.end} />
        </View>
      ))}
    </View>
  );
}

function ScheduleRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scheduleRow}>
      <Text style={styles.scheduleLabel}>{label}</Text>
      <Text style={styles.scheduleValue}>{value}</Text>
    </View>
  );
}

function ScholarshipContent({ activeTab }: { activeTab: ScholarshipTabKey }) {
  const sections =
    activeTab === 'korean'
      ? KOREAN_SCHOLARSHIPS
      : activeTab === 'gks'
        ? GKS_SCHOLARSHIPS
        : activeTab === 'achievement'
          ? ACHIEVEMENT_SCHOLARSHIPS
          : ETC_SCHOLARSHIPS;

  return (
    <>
      {sections.map((section) => (
        <ScholarshipCard key={section.title} title={section.title} items={section.items} />
      ))}

      {(activeTab === 'korean' || activeTab === 'gks') && (
        <View style={styles.linkList}>
          {SCHOLARSHIP_LINKS.filter((link) =>
            activeTab === 'korean' ? link.url.includes('cie.ajou.ac.kr') : true
          ).map((link) => (
            <TouchableOpacity
              key={link.url}
              style={styles.linkCard}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.85}
            >
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>{link.title}</Text>
                <Text style={styles.linkUrl}>{link.url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#2F6DF6" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
}

function ScholarshipCard({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.scholarshipCard}>
      <View style={styles.scholarshipIcon}>
        <Ionicons name="school-outline" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.documentBody}>
        <Text style={styles.documentTitle}>{title}</Text>
        {items.map((item) => (
          <View key={item} style={styles.documentBulletRow}>
            <View style={styles.documentBullet} />
            <Text style={styles.documentText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LifeSupport() {
  return (
    <>
      {LIFE_SUPPORT_SECTIONS.map((section) => (
        <ScholarshipCard key={section.title} title={section.title} items={section.items} />
      ))}
      <ExternalLinkList links={LIFE_LINKS} />
    </>
  );
}

function DormInfo() {
  return (
    <>
      {DORM_APPLICATION_SECTIONS.map((section) => (
        <ScholarshipCard key={section.title} title={section.title} items={section.items} />
      ))}

      <View style={styles.visaSection}>
        <Text style={styles.visaSectionTitle}>기숙사비</Text>
        <View style={styles.dormFeeList}>
          {DORM_FEE_CARDS.map((item) => (
            <View key={item.title} style={styles.dormFeeCard}>
              <Text style={styles.dormFeeTitle}>{item.title}</Text>
              {item.note && <Text style={styles.dormFeeNote}>{item.note}</Text>}
              <View style={styles.dormFeeRow}>
                <Text style={styles.dormFeeLabel}>봄, 가을(학기중 4개월)</Text>
                <Text style={styles.dormFeeValue}>{item.spring}</Text>
              </View>
              <View style={styles.dormFeeRow}>
                <Text style={styles.dormFeeLabel}>여름, 겨울(방학중 8주)</Text>
                <Text style={styles.dormFeeValue}>{item.vacation}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.infoCard, styles.warningCard]}>
        {DORM_NOTES.map((item) => (
          <View key={item} style={styles.bulletRow}>
            <View style={styles.visaBullet} />
            <Text style={[styles.infoText, styles.warningText]}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.visaSection}>
        <Text style={styles.visaSectionTitle}>학교 및 기숙사 영상</Text>
        <ExternalLinkList links={DORM_VIDEO_LINKS} />
      </View>
    </>
  );
}

function ExternalLinkList({ links }: { links: { title: string; url: string }[] }) {
  return (
    <View style={styles.linkList}>
      {links.map((link) => (
        <TouchableOpacity
          key={link.url}
          style={styles.linkCard}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.85}
        >
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkTitle}>{link.title}</Text>
            <Text style={styles.linkUrl}>{link.url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#2F6DF6" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OfficialLinks() {
  return (
    <View style={styles.linkList}>
      {VISA_LINKS.map((link) => (
        <TouchableOpacity
          key={link.url}
          style={styles.linkCard}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.85}
        >
          <View style={styles.linkTextWrap}>
            <Text style={styles.linkTitle}>{link.title}</Text>
            <Text style={styles.linkUrl}>{link.url.replace(/^https?:\/\/(www\.)?/, '')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#2F6DF6" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  hero: {
    backgroundColor: '#FFF4BF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3D76B',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#005BAC',
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
  visaHero: {
    backgroundColor: '#2F6DF6',
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
    marginBottom: 4,
  },
  visaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  visaSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#DCE8FF',
  },
  tabBar: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  tabText: {
    minHeight: 24,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5F7A',
  },
  tabTextActive: {
    color: '#2F6DF6',
  },
  tabIndicator: {
    width: 34,
    height: 4,
    borderRadius: 999,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: '#2F6DF6',
  },
  visaContent: {
    padding: 18,
    paddingBottom: 36,
  },
  visaSection: {
    marginBottom: 26,
  },
  visaSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2F6DF6',
    marginBottom: 12,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  warningCard: {
    borderColor: '#FACC5C',
    backgroundColor: '#FFF7D7',
  },
  stepCard: {
    backgroundColor: '#F3F7FF',
  },
  tableCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  table: {
    minWidth: 520,
  },
  compactTable: {
    width: '100%',
    minWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#D8E3F5',
  },
  tableHeaderRow: {
    borderTopWidth: 0,
    backgroundColor: '#F7FAFF',
  },
  tableCell: {
    width: 112,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#D8E3F5',
  },
  compactTableCell: {
    flex: 1,
    width: undefined,
    minWidth: 0,
  },
  tableText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: '#52637C',
  },
  tableHeaderText: {
    fontWeight: '800',
    color: '#1F2937',
  },
  visaBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2F6DF6',
    marginTop: 10,
    marginRight: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    color: '#52637C',
  },
  warningText: {
    color: '#8A6400',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#2F6DF6',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  linkList: {
    gap: 12,
  },
  linkCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
  },
  linkTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  linkTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    color: '#202637',
  },
  linkUrl: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#52637C',
  },
  registerStepList: {
    gap: 4,
  },
  registerStepItem: {
    alignItems: 'center',
  },
  registerStepCard: {
    width: '100%',
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  registerStepBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: '#2F6DF6',
  },
  registerStepBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  registerStepBody: {
    flex: 1,
  },
  registerStepNumber: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#2F6DF6',
    marginBottom: 4,
  },
  registerStepText: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#1F2937',
  },
  registerStepArrow: {
    marginVertical: 6,
  },
  tuitionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tuitionCard: {
    width: '48%',
    minHeight: 122,
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  tuitionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F6DF6',
    marginBottom: 10,
  },
  tuitionValue: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    color: '#1F2937',
  },
  tuitionDetail: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  subTabButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
  },
  subTabButtonActive: {
    borderColor: '#2F6DF6',
    backgroundColor: '#EEF4FF',
  },
  subTabText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#52637C',
  },
  subTabTextActive: {
    color: '#2F6DF6',
  },
  documentNotice: {
    gap: 8,
    marginBottom: 16,
  },
  documentCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  scholarshipCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  scholarshipIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#2F6DF6',
  },
  dormFeeList: {
    gap: 12,
  },
  dormFeeCard: {
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  dormFeeTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#1F2937',
  },
  dormFeeNote: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    color: '#64748B',
  },
  dormFeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF8',
  },
  dormFeeLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#52637C',
  },
  dormFeeValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: '#2F6DF6',
  },
  documentIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#2F6DF6',
  },
  documentIndexText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  documentBody: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  documentBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  documentBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#2F6DF6',
    marginTop: 9,
    marginRight: 8,
  },
  documentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    color: '#52637C',
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    borderWidth: 1,
    borderColor: '#D8E3F5',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  scheduleHeader: {
    marginBottom: 10,
  },
  scheduleTerm: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '800',
    color: '#2F6DF6',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF8',
  },
  scheduleLabel: {
    width: 92,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    color: '#52637C',
  },
  scheduleValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#1F2937',
  },
});
