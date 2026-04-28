export const TOPIC_DATA = {
  visa: {
    title: 'Visa',
    subtitle: 'D-2 visa extension, change, and part-time work guide',
    sections: [
      {
        title: 'Main Checks',
        items: [
          'Check your alien registration card expiry date first.',
          'Prepare school certificate, transcript, tuition payment proof, and bank balance proof.',
          'Use HiKorea for reservations and official forms.',
        ],
      },
      {
        title: 'Official Link',
        items: ['HiKorea: https://hikorea.go.kr'],
      },
    ],
  },
  topik: {
    title: 'TOPIK',
    subtitle: 'Korean language test schedule and preparation reminders',
    sections: [
      {
        title: 'Main Checks',
        items: [
          'Confirm registration period before the test date.',
          'Bring a valid ID and admission ticket on test day.',
          'Save the score announcement date to your calendar.',
        ],
      },
    ],
  },
  register: {
    title: 'Register',
    subtitle: 'Course registration and academic enrollment guide',
    sections: [
      {
        title: 'Main Checks',
        items: [
          'Check your assigned registration time.',
          'Prepare backup courses before registration opens.',
          'Review credit limits and major requirements.',
        ],
      },
    ],
  },
  scholarship: {
    title: 'Scholarship',
    subtitle: 'Scholarship notices, documents, and deadlines',
    sections: [
      {
        title: 'Main Checks',
        items: [
          'Check GPA, language score, and enrollment requirements.',
          'Prepare application forms before the deadline.',
          'Save scholarship result dates when they are announced.',
        ],
      },
    ],
  },
  life: {
    title: 'Life',
    subtitle: 'Campus life, housing, health, and daily support',
    sections: [
      {
        title: 'Main Checks',
        items: [
          'Check dormitory and housing notices regularly.',
          'Keep emergency contacts and insurance information available.',
          'Review campus service hours before visiting offices.',
        ],
      },
    ],
  },
} as const;
