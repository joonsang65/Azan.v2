// app/data/mockTasks.ts

import { Task } from '../types';

export const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Prepare visa extension documents',
    dueDate: '2026-04-12',
    category: 'Visa',
    isDone: false,
  },
  {
    id: 't2',
    title: 'Check TOPIK registration schedule',
    dueDate: '2026-04-10',
    category: 'TOPIK',
    isDone: false,
  },
  {
    id: 't3',
    title: 'Review dormitory application notice',
    dueDate: '2026-04-08',
    category: 'Dormitory',
    isDone: true,
  },
];
