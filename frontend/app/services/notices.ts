import type { Notice, NoticeCategory } from '../types';
import { apiRequest } from './api';

const seedNotices: Notice[] = [
  {
    id: 'n1',
    title: 'Visa Extension Document Submission',
    category: 'Visa',
    summary: 'Submit the required documents for visa extension before the deadline.',
    date: '2026-04-10',
    isCritical: true,
    description:
      'Students who need to extend their visa must prepare passport copies, certificate of enrollment, residence documents, and financial proof.',
    link: '/notices/n1',
  },
  {
    id: 'n2',
    title: 'TOPIK Registration Schedule Open',
    category: 'TOPIK',
    summary: 'TOPIK registration for the next exam session is now available.',
    date: '2026-04-12',
    isCritical: false,
    description:
      'Please check the registration dates, test center availability, and payment instructions before applying.',
    link: '/notices/n2',
  },
  {
    id: 'n3',
    title: 'Course Registration Change Period',
    category: 'Academic',
    summary: 'Students can modify registered courses during the add/drop period.',
    date: '2026-04-08',
    isCritical: true,
    description:
      'Make sure to review course capacity, prerequisites, and timetable conflicts before making changes.',
    link: '/notices/n3',
  },
  {
    id: 'n4',
    title: 'International Student Spring Festival',
    category: 'Events',
    summary: 'Join the spring cultural exchange event hosted on campus.',
    date: '2026-04-18',
    isCritical: false,
    description:
      'The event includes club booths, performances, and international food experiences for students.',
    link: '/notices/n4',
  },
];

const validCategories: NoticeCategory[] = [
  'Visa',
  'TOPIK',
  'Academic',
  'Events',
  'Scholarship',
  'Dormitory',
];

const priorityPatterns = [
  /원서접수 기간\s*:\s*[^○■※/]+/,
  /지원자 정보 정정 신청 기간\s*:\s*[^○■※/]+/,
  /지원자 사진 정정 신청 기간\s*:\s*[^○■※/]+/,
  /수험표 출력 기간\s*[^○■※/]+/,
  /시험 일자\s*:\s*[^○■※/]+/,
  /시험 방식\s*:\s*[^○■※/]+/,
  /접수 방법\s*:\s*[^○■※/]+/,
  /성적 발표\s*[^○■※/]+/,
  /환불기간\s*[^○■※/]+/,
];

const priorityKeywords =
  /(변경|마감|신청|접수|원서접수|유의|공지|시행|연장|제출|확인|필수|환불|시험 일자|수험표)/;
const greetingPattern = /^(안녕하세요|감사합니다|한국어능력시험센터입니다)/;

type AppNoticeShape = Partial<Notice> & {
  sourceUrl?: string;
};

type WorkerNoticeShape = {
  bbs_id?: string | number | null;
  body?: string | null;
  eng_body?: string | null;
  category?: string | null;
  category_final?: string | null;
  created_at?: string | null;
  deadline?: string | null;
  deadline_at?: string | null;
  deadline_text?: string | null;
  dedupe_hash?: string | null;
  description?: string | null;
  id?: string | null;
  isCritical?: boolean | null;
  is_notice?: boolean | null;
  image_urls?: string[] | null;
  imageUrls?: string[] | null;
  link?: string | null;
  meta?: Record<string, unknown> | null;
  notice_tag?: string | null;
  ntt_id?: string | number | null;
  preview?: string | null;
  published_at?: string | null;
  published_at_final?: string | null;
  raw_body?: string | null;
  source?: string | null;
  source_notice_id?: string | null;
  source_url?: string | null;
  summary?: string | null;
  title?: string | null;
  url?: string | null;
  keyword?: string | null;
};

type RemotePayload =
  | WorkerNoticeShape[]
  | {
      notices?: WorkerNoticeShape[];
      items?: WorkerNoticeShape[];
      results?: WorkerNoticeShape[];
      data?: WorkerNoticeShape[];
      oia?: WorkerNoticeShape[];
      topik?: WorkerNoticeShape[];
    };

type LocalCrawlerPayload = {
  notices?: WorkerNoticeShape[];
  syncedAt?: string | null;
  sources?: { name: string; path: string; count: number }[];
};

function normalizeCategory(value: string | undefined | null): NoticeCategory {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case 'visa':
      return 'Visa';
    case 'topik':
    case 'topik_notice':
    case 'topik_exam_schedule':
    case '접수':
    case '시행':
    case '기타':
      return 'TOPIK';
    case 'academic':
    case 'exchange':
    case 'work':
    case 'general':
      return 'Academic';
    case 'event':
    case 'events':
      return 'Events';
    case 'scholarship':
      return 'Scholarship';
    case 'dorm':
    case 'dormitory':
      return 'Dormitory';
    default:
      if (value && validCategories.includes(value as NoticeCategory)) {
        return value as NoticeCategory;
      }
      return 'Academic';
  }
}

function normalizeWorkerCategory(raw: WorkerNoticeShape): NoticeCategory {
  const sourceCategory = normalizeCategory(raw.source);

  if (sourceCategory === 'TOPIK') {
    return 'TOPIK';
  }

  if (raw.category_final) {
    return normalizeCategory(raw.category_final);
  }

  if (raw.category) {
    return normalizeCategory(raw.category);
  }

  if (raw.keyword) {
    return normalizeCategory(raw.keyword);
  }

  return sourceCategory;
}

function formatDateKey(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return trimmed.slice(0, 10);
}

function pickDate(raw: WorkerNoticeShape): string {
  return (
    formatDateKey(raw.published_at_final) ||
    formatDateKey(raw.published_at) ||
    formatDateKey(raw.created_at) ||
    new Date().toISOString().slice(0, 10)
  );
}

function pickDeadline(raw: WorkerNoticeShape): string | undefined {
  return formatDateKey(raw.deadline_at) || formatDateKey(raw.deadline);
}

function hasAttachmentOnly(raw: WorkerNoticeShape): boolean {
  const body =
    raw.body?.trim() || raw.raw_body?.trim() || raw.description?.trim();
  const attachments = raw.meta?.attachments;

  return !body && Array.isArray(attachments) && attachments.length > 0;
}

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').replace(/\n+/g, ' ').trim();
}

function shortenSummary(value: string) {
  return value.length > 42 ? `${value.slice(0, 39).trim()}...` : value;
}

function pickPrioritySnippet(text: string) {
  for (const pattern of priorityPatterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return compactText(match[0]);
    }
  }

  return null;
}

function pickSentenceSummary(text: string) {
  const normalized = text
    .replace(/([■○※])/g, '\n$1')
    .replace(/(\d+\))/g, '\n$1')
    .replace(/\n+/g, '\n');

  const sentences = normalized
    .split(/\n|(?<=[.!?])\s+/)
    .map((sentence) => compactText(sentence))
    .filter(Boolean)
    .filter((sentence) => sentence.length > 6);

  const prioritized =
    sentences.find((sentence) => priorityKeywords.test(sentence)) ||
    sentences.find((sentence) => !greetingPattern.test(sentence)) ||
    sentences[0] ||
    text;

  return shortenSummary(prioritized);
}

function pickSummary(raw: WorkerNoticeShape): string {
  const deadline = pickDeadline(raw);
  const attachmentOnly = hasAttachmentOnly(raw);
  const summarySource =
    raw.deadline_text?.trim() ||
    raw.summary?.trim() ||
    raw.preview?.trim() ||
    raw.description?.trim() ||
    raw.body?.trim();

  if (!summarySource) {
    if (attachmentOnly) {
      return '이미지 첨부 공지입니다.';
    }

    return deadline
      ? `마감일 ${deadline}까지 확인 필요`
      : '상세 내용에서 확인하세요.';
  }

  const compact = compactText(summarySource);
  const prioritySnippet = pickPrioritySnippet(compact);

  if (prioritySnippet) {
    return shortenSummary(prioritySnippet);
  }

  return pickSentenceSummary(compact);
}

function isCriticalNotice(raw: WorkerNoticeShape): boolean {
  if (typeof raw.isCritical === 'boolean') {
    return raw.isCritical;
  }

  return Boolean(raw.deadline || raw.deadline_at || raw.is_notice);
}

function pickImageUrls(raw: WorkerNoticeShape): string[] {
  const urls = raw.image_urls ?? raw.imageUrls ?? [];

  return Array.isArray(urls)
    ? urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    : [];
}

function normalizeWorkerNotice(raw: WorkerNoticeShape, index: number): Notice {
  const imageUrls = pickImageUrls(raw);

  return {
    id: String(
      raw.id ??
        raw.source_notice_id ??
        raw.ntt_id ??
        raw.bbs_id ??
        raw.dedupe_hash ??
        `notice-${index}`
    ),
    title: raw.title?.trim() || 'Untitled notice',
    category: normalizeWorkerCategory(raw),
    summary: pickSummary(raw),
    date: pickDate(raw),
    deadline: pickDeadline(raw),
    hasAttachmentOnly: hasAttachmentOnly(raw) || imageUrls.length > 0,
    isCritical: isCriticalNotice(raw),
    description:
      raw.description?.trim() ||
      raw.body?.trim() ||
      raw.raw_body?.trim() ||
      undefined,
    engBody: raw.eng_body?.trim() || undefined,
    link: raw.link?.trim() || raw.source_url?.trim() || raw.url?.trim() || undefined,
    imageUrls,
  };
}

function normalizeNotice(
  raw: AppNoticeShape | WorkerNoticeShape,
  index: number
): Notice {
  if (
    'category_final' in raw ||
    'dedupe_hash' in raw ||
    'source_url' in raw ||
    'preview' in raw ||
    'published_at_final' in raw ||
    'published_at' in raw ||
    'deadline_at' in raw ||
    'url' in raw
  ) {
    return normalizeWorkerNotice(raw as WorkerNoticeShape, index);
  }

  const appRaw = raw as AppNoticeShape;

  return {
    id: appRaw.id ?? `notice-${index}`,
    title: appRaw.title?.trim() || 'Untitled notice',
    category: normalizeCategory(appRaw.category),
    summary:
      appRaw.summary?.trim() ||
      appRaw.description?.trim() ||
      (appRaw.hasAttachmentOnly
        ? '이미지 첨부 공지입니다.'
        : appRaw.deadline?.trim()
          ? `마감일 ${appRaw.deadline.trim()}까지 확인 필요`
          : '상세 내용에서 확인하세요.'),
    date: appRaw.date?.trim() || new Date().toISOString().slice(0, 10),
    deadline: appRaw.deadline?.trim(),
    hasAttachmentOnly: appRaw.hasAttachmentOnly ?? false,
    isCritical: appRaw.isCritical ?? false,
    description: appRaw.description?.trim(),
    link: appRaw.link?.trim() || appRaw.sourceUrl?.trim(),
  };
}

function flattenPayload(payload: RemotePayload): WorkerNoticeShape[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return [
    ...(payload.notices ?? []),
    ...(payload.items ?? []),
    ...(payload.results ?? []),
    ...(payload.data ?? []),
    ...(payload.oia ?? []),
    ...(payload.topik ?? []),
  ];
}

function loadBundledCrawlerNotices(): Notice[] {
  const payload = require('../data/generated/crawler-notices.json') as LocalCrawlerPayload;
  const items = flattenPayload(payload);

  return items.map(normalizeNotice);
}


async function fetchRemoteNotices(): Promise<Notice[]> {
  if (process.env.EXPO_PUBLIC_USE_LOCAL_CRAWLER_JSON === 'true') {
    return loadBundledCrawlerNotices();
  }

  const payload = await apiRequest<RemotePayload>('/notices?limit=200');
  const items = flattenPayload(payload);
  const deduped = new Map<string, Notice>();

  items.map(normalizeNotice).forEach((notice) => {
    deduped.set(notice.id, notice);
  });

  return [...deduped.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchNotices(): Promise<Notice[]> {
  try {
    return await fetchRemoteNotices();
  } catch (error) {
    console.warn('Falling back to local notice seed data.', error);
    return seedNotices;
  }
}
