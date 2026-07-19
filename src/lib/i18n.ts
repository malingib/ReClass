import { get } from 'svelte/store';
import { locale, type Locale } from '$lib/stores/locale';

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
  // Action labels
  approve: { en: 'Approve', sw: 'Kubali' },
  pay: { en: 'Pay', sw: 'Lipa' },
  generate: { en: 'Generate', sw: 'Tengeneza' },
  create: { en: 'Create', sw: 'Unda' },
  view: { en: 'View', sw: 'Tazama' },
  download: { en: 'Download', sw: 'Pakua' },
  waive: { en: 'Waive', sw: 'Samehe' },
  remove: { en: 'Remove', sw: 'Ondoa' },
  // Common headings
  overview: { en: 'Overview', sw: 'Mapitio' },
  recent: { en: 'Recent', sw: 'Hivi karibuni' },
  upcoming: { en: 'Upcoming', sw: 'Zinazokuja' },
  details: { en: 'Details', sw: 'Maelezo' },
  summary: { en: 'Summary', sw: 'Muhtasari' },
  history: { en: 'History', sw: 'Historia' },
  // Finance
  revenue: { en: 'Revenue', sw: 'Mapato' },
  fees: { en: 'Fees', sw: 'Ada' },
  payments: { en: 'Payments', sw: 'Malipo' },
  outstanding: { en: 'Outstanding', sw: 'Inayodaiwa' },
  aging: { en: 'Aging', sw: 'Umeraji' },
  payroll: { en: 'Payroll', sw: 'Mshahara' },
  waivers_uc: { en: 'Waivers', sw: 'Msamaha' },
  // Roles / modules
  admin: { en: 'Admin', sw: 'Msimamizi' },
  principal: { en: 'Principal', sw: 'Mkuu wa shule' },
  bursar: { en: 'Bursar', sw: 'Mhasibu' },
  teacher: { en: 'Teacher', sw: 'Mwalimu' },
  parent: { en: 'Parent', sw: 'Mzazi' },
  // Navigation labels (keyed by exact English label)
  'Front office': { en: 'Front office', sw: 'Ofisi ya mbele' },
  'Remedial program': { en: 'Remedial program', sw: 'Mpango wa marekebisho' },
  'M-Pesa payments': { en: 'M-Pesa payments', sw: 'Malipo ya M-Pesa' },
  'Integrations': { en: 'Integrations', sw: 'Jumuisho' },
  'Reporting': { en: 'Reporting', sw: 'Ripoti' },
  'Teaching': { en: 'Teaching', sw: 'Ufundishaji' },
  'My dashboard': { en: 'My dashboard', sw: 'Dashibodi yangu' },
  'Remedial timetable': { en: 'Remedial timetable', sw: 'Ratiba ya marekebisho' },
  'My child': { en: 'My child', sw: 'Mtoto wangu' },
  'Welcome': { en: 'Welcome', sw: 'Karibu' },
  'Fee structure': { en: 'Fee structure', sw: 'Muundo wa ada' },
  'Pay via M-Pesa': { en: 'Pay via M-Pesa', sw: 'Lipa kupitia M-Pesa' },
  'Payment history': { en: 'Payment history', sw: 'Historia ya malipo' },
  'Oversight': { en: 'Oversight', sw: 'Ushiriki' },
  'Program effectiveness': { en: 'Program effectiveness', sw: 'Ufanisi wa mpango' },
  'Teacher attendance': { en: 'Teacher attendance', sw: 'Mahudhurio ya walimu' },
  'Fee definitions': { en: 'Fee definitions', sw: 'Ufafanuzi wa ada' },
  'Teacher stipends': { en: 'Teacher stipends', sw: 'Posho za walimu' },
  'Reconciliation': { en: 'Reconciliation', sw: 'Urekebishaji' },
  'Mobiwave & Daraja': { en: 'Mobiwave & Daraja', sw: 'Mobiwave na Daraja' },
  'School settings': { en: 'School settings', sw: 'Mipangilio ya shule' },
  'Workspace': { en: 'Workspace', sw: 'Sehemu ya kazi' },
};

/**
 * Translate a key to the current locale.
 * Reads the reactive locale store so calls update when the user toggles language.
 * Falls back to English if the key is missing, then to the key itself.
 */
export function t(key: string, currentLocale?: Locale): string {
  const loc: Locale = currentLocale ?? get(locale);
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[loc] ?? entry.en;
}

/**
 * Get the full dictionary for a locale (useful for prefilling).
 */
export function getDictionary(loc: Locale): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(dictionary)) {
    result[key] = value[loc] ?? value.en;
  }
  return result;
}
