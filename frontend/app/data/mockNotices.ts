import { Notice } from '../types';

export const mockNotices: Notice[] = [
  {
    id: 'n1',
    title: 'Visa Extension Document Submission Guide',
    category: 'Visa',
    summary: 'Prepare and submit the required visa extension documents.',
    date: '2026-04-20',
    isCritical: true,
  },
  {
    id: 'n2',
    title: 'TOPIK Registration Schedule for Spring',
    category: 'TOPIK',
    summary: 'Check the TOPIK registration window and payment schedule.',
    date: '2026-04-15',
  },
  {
    id: 'n3',
    title: 'Course Registration Notice for International Students',
    category: 'Academic',
    summary: 'Review course registration changes and important deadlines.',
    date: '2026-04-10',
  },
  {
    id: 'n4',
    title: 'Scholarship Application for Foreign Students',
    category: 'Scholarship',
    summary: 'Submit the scholarship application before the final deadline.',
    date: '2026-04-30',
  },
  {
    id: 'n5',
    title: 'Dormitory Move-in Schedule',
    category: 'Dormitory',
    summary: 'Confirm the move-in date and required dormitory documents.',
    date: '2026-04-08',
  },
];
