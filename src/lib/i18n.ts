import type { Locale } from '$lib/stores/locale';

type Dict = Record<string, { en: string; sw: string }>;

const dictionary: Dict = {
  save: { en: 'Save', sw: 'Hifadhi' },
  cancel: { en: 'Cancel', sw: 'Ghairi' },
  delete: { en: 'Delete', sw: 'Futa' },
  edit: { en: 'Edit', sw: 'Hariri' },
  loading: { en: 'Loading…', sw: 'Inapakia…' },
  error: { en: 'Error', sw: 'Hitilafu' },
  retry: { en: 'Try again', sw: 'Jaribu tena' },
  search: { en: 'Search', sw: 'Tafuta' },
  noData: { en: 'No data yet', sw: 'Hakuna data bado' },
  confirm: { en: 'Confirm', sw: 'Thibitisha' },
  back: { en: 'Back', sw: 'Nyuma' },
  next: { en: 'Next', sw: 'Ifuatayo' },
  previous: { en: 'Previous', sw: 'Iliyotangulia' },
  page: { en: 'Page', sw: 'Ukurasa' },
  of: { en: 'of', sw: 'ya' },
  actions: { en: 'Actions', sw: 'Vitendo' },
  status: { en: 'Status', sw: 'Hali' },
  date: { en: 'Date', sw: 'Tarehe' },
  name: { en: 'Name', sw: 'Jina' },
  email: { en: 'Email', sw: 'Barua pepe' },
  phone: { en: 'Phone', sw: 'Nambari ya simu' },
  amount: { en: 'Amount', sw: 'Kiasi' },
  total: { en: 'Total', sw: 'Jumla' },
  due: { en: 'Due', sw: 'Deni' },
  paid: { en: 'Paid', sw: 'Imelipwa' },
  unpaid: { en: 'Unpaid', sw: 'Haijalipwa' },
  invoice: { en: 'Invoice', sw: 'Ankara' },
  attendance: { en: 'Attendance', sw: 'Mahudhurio' },
  notifications: { en: 'Notifications', sw: 'Arifa' },
  settings: { en: 'Settings', sw: 'Mipangilio' },
  logout: { en: 'Logout', sw: 'Toka' },
  profile: { en: 'Profile', sw: 'Wasifu' },
  dashboard: { en: 'Dashboard', sw: 'Dashibodi' },
  students: { en: 'Students', sw: 'Wanafunzi' },
  teachers: { en: 'Teachers', sw: 'Walimu' },
  subjects: { en: 'Subjects', sw: 'Masomo' },
  groups: { en: 'Groups', sw: 'Vikundi' },
  parents: { en: 'Parents', sw: 'Wazazi' },
  scheduling: { en: 'Scheduling', sw: 'Upangaji' },
  reports: { en: 'Reports', sw: 'Ripoti' },
  markAllRead: { en: 'Mark all read', sw: 'Weka yote kama yamesomwa' },
  noNotifications: { en: 'No notifications yet', sw: 'Hakuna arifa bado' },
  darkMode: { en: 'Dark mode', sw: 'Hali ya giza' },
  lightMode: { en: 'Light mode', sw: 'Hali ya mwanga' },
  systemMode: { en: 'System', sw: 'Mfumo' },
  language: { en: 'Language', sw: 'Lugha' },
  today: { en: 'Today', sw: 'Leo' },
  week: { en: 'Week', sw: 'Wiki' },
  month: { en: 'Month', sw: 'Mwezi' },
};

/**
 * Translate a key to the current locale.
 * Falls back to English if the key is missing.
 */
export function t(key: string, currentLocale: Locale = 'en'): string {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[currentLocale] ?? entry.en;
}

/**
 * Get the full dictionary for a locale (useful for prefilling).
 */
export function getDictionary(locale: Locale): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(dictionary)) {
    result[key] = value[locale] ?? value.en;
  }
  return result;
}
