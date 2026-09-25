// ============================================
// Utility Helper Functions - UAE Dubai
// ============================================

import { AlertStatus } from '../types';
import { toSafeDateString } from '../firebase/syncUtils';

/**
 * Calculate days left until a date
 */
export const calculateDaysLeft = (dateString: string): number => {
  if (!dateString) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get alert status based on days left
 */
export const getAlertStatus = (daysLeft: number): AlertStatus => {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'danger';
  if (daysLeft <= 30) return 'warning';
  return 'safe';
};

/**
 * Get alert color class based on status
 */
export const getAlertColor = (status: AlertStatus): string => {
  switch (status) {
    case 'safe':
      return 'text-green-500 bg-green-500/10 border-green-500/30';
    case 'warning':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    case 'danger':
      return 'text-red-500 bg-red-500/10 border-red-500/30 animate-pulse';
    case 'expired':
      return 'text-red-600 bg-red-600/10 border-red-600/30 animate-blink';
    default:
      return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
  }
};

/**
 * Get status badge color
 */
export const getStatusBadgeClass = (status: AlertStatus): string => {
  switch (status) {
    case 'safe':
      return 'bg-green-500';
    case 'warning':
      return 'bg-amber-500';
    case 'danger':
      return 'bg-red-500 animate-pulse';
    case 'expired':
      return 'bg-red-700 animate-blink';
    default:
      return 'bg-gray-500';
  }
};

/**
 * Format date to locale string
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  // FIX #8: Safari "yyyy-MM-dd HH:mm:ss" ko parse nahi karta (Invalid Date)
  return new Date(toSafeDateString(dateString)).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format date for input fields
 */
export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  return dateString.split('T')[0];
};

/**
 * Format datetime
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  return new Date(toSafeDateString(dateString)).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Validate passport number format
 */
export const validatePassportNumber = (passport: string): boolean => {
  const regex = /^[A-Z0-9]{6,15}$/i;
  return regex.test(passport);
};

/**
 * Validate UAE phone number format (+971)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const regex = /^(\+971|971|0)?[\s-]?5[0-9][\s-]?[0-9]{3}[\s-]?[0-9]{4}$/;
  return regex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate Emirates ID format (784-XXXX-XXXXXXX-X)
 */
export const validateEmirateId = (emirateId: string): boolean => {
  const regex = /^784[-\s]?\d{4}[-\s]?\d{7}[-\s]?\d{1}$/;
  return regex.test(emirateId);
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Convert image file to base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Simple transliteration to Arabic-like text (basic approximation)
 * For real Arabic, use Google Translate API
 */
export const transliterateToArabic = (englishName: string): string => {
  const map: Record<string, string> = {
    'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف',
    'g': 'ج', 'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل',
    'm': 'م', 'n': 'ن', 'o': 'و', 'p': 'ب', 'q': 'ق', 'r': 'ر',
    's': 'س', 't': 'ت', 'u': 'و', 'v': 'ف', 'w': 'و', 'x': 'كس',
    'y': 'ي', 'z': 'ز', ' ': ' '
  };
  
  return englishName
    .toLowerCase()
    .split('')
    .map(char => map[char] || char)
    .join('');
};

/**
 * Generate a random color from a set of predefined colors
 */
export const generateRandomColor = (seed: string): string => {
  const colors = [
    '#F97316', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F59E0B', '#6366F1',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format currency AED
 */
/**
 * ⭐ FIX (CRITICAL — white screen): pehle `amount.toLocaleString()` seedha call
 * hota tha. Corrupt records mein amount `undefined` hota hai aur
 * `undefined.toLocaleString()` TypeError phenkta tha → React render crash →
 * poora Accounts section WHITE SCREEN. Ab har halat safe hai.
 */
/**
 * ⭐ Corrupt records mein numbers `undefined` hote hain aur
 * `undefined.toLocaleString()` TypeError phenkta hai (white screen).
 * Is liye har jagah yeh helper istemal karein.
 */
export const safeNumber = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;

/** Safe number formatting (kabhi throw nahi karta) */
export const formatNumber = (n: unknown): string => safeNumber(n).toLocaleString('en-AE');

export const formatCurrency = (amount: number | null | undefined): string => {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : null;
  if (n === null) return 'AED —';
  return `AED ${n.toLocaleString('en-AE')}`;
};

/**
 * Debounce function
 */
export function debounce<F extends (...args: Parameters<F>) => void>(
  func: F,
  wait: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Export data to CSV
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        const stringValue = String(value ?? '');
        return `"${stringValue.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate PDF report (basic HTML to print)
 */
export const exportToPDF = (content: string, title: string): void => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f97316; color: white; }
          tr:nth-child(even) { background-color: #f8f9fa; }
          h1 { color: #f97316; }
          .header { margin-bottom: 20px; }
          .safe { color: green; }
          .warning { color: #f59e0b; }
          .danger { color: red; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Queen International School</h1>
        </div>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

/**
 * UAE Nationalities
 */
export const NATIONALITIES = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian',
  'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian',
  'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian',
  'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe', 'Burmese', 'Burundian',
  'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian',
  'Chilean', 'Chinese', 'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian',
  'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian', 'Dominican', 'Dutch',
  'Ecuadorian', 'Egyptian', 'Emirati', 'Equatorial Guinean', 'Eritrean', 'Estonian',
  'Ethiopian', 'Fijian', 'Filipino', 'Finnish', 'French',
  'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian',
  'Guatemalan', 'Guinean', 'Guyanese',
  'Haitian', 'Honduran', 'Hungarian',
  'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian',
  'Jamaican', 'Japanese', 'Jordanian',
  'Kazakh', 'Kenyan', 'Kiribati', 'Korean', 'Kuwaiti', 'Kyrgyz',
  'Laotian', 'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Lithuanian', 'Luxembourgish',
  'Macedonian', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese',
  'Mauritanian', 'Mauritian', 'Mexican', 'Moldovan', 'Mongolian', 'Montenegrin', 'Moroccan',
  'Mozambican', 'Myanmar',
  'Namibian', 'Nepalese', 'New Zealander', 'Nicaraguan', 'Nigerian', 'Norwegian',
  'Omani',
  'Pakistani', 'Palestinian', 'Panamanian', 'Paraguayan', 'Peruvian', 'Polish', 'Portuguese',
  'Qatari',
  'Romanian', 'Russian', 'Rwandan',
  'Saudi', 'Senegalese', 'Serbian', 'Sierra Leonean', 'Singaporean', 'Slovak', 'Slovenian',
  'Somali', 'South African', 'South Sudanese', 'Spanish', 'Sri Lankan', 'Sudanese',
  'Surinamese', 'Swedish', 'Swiss', 'Syrian',
  'Taiwanese', 'Tajik', 'Tanzanian', 'Thai', 'Togolese', 'Trinidadian', 'Tunisian',
  'Turkish', 'Turkmen',
  'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek',
  'Venezuelan', 'Vietnamese',
  'Yemeni',
  'Zambian', 'Zimbabwean',
  'Other'
];

/**
 * Job Titles for School
 */
export const JOB_TITLES = [
  'Teacher', 'Staff', 'Driver', 'Labour',
  'Principal', 'Vice Principal', 'Head of Department',
  'Administrator', 'Accountant', 'HR Manager',
  'IT Support', 'Librarian', 'Nurse', 'Security Guard',
  'Cleaner', 'Maintenance', 'Cook', 'Bus Monitor', 'Other'
];

/**
 * UAE Sponsors
 */
export const SPONSORS = [
  'Queen International School',
  'Ministry of Education',
  'Free Zone',
  'Mainland Company',
  'Individual Sponsor',
  'Other'
];
