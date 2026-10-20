import { Department } from '../types';

/**
 * নির্ধারিত ৩ জন স্থায়ী অ্যাডমিনের দায়িত্ব ও স্কোপ।
 * ১. whitepenguin110@gmail.com -> প্রধান অ্যাডমিন (উভয় বিভাগ: গ্রাফিক্স ও ভিডিও)
 * ২. itvdrive84@gmail.com -> ভিডিও ডিপার্টমেন্ট অ্যাডমিন (শুধুমাত্র ভিডিও)
 * ৩. itisamgfx@gmail.com -> গ্রাফিক্স ডিপার্টমেন্ট অ্যাডমিন (শুধুমাত্র গ্রাফিক্স)
 */

export type AdminDepartmentScope = 'all' | Department;

export interface AdminRoleConfig {
  email: string;
  title: string;
  badgeLabel: string;
  departmentScope: AdminDepartmentScope;
  canManageAllDepartments: boolean;
}

export const ADMIN_CONFIGS: Record<string, AdminRoleConfig> = {
  'whitepenguin110@gmail.com': {
    email: 'whitepenguin110@gmail.com',
    title: 'প্রধান অ্যাডমিন (সুপার অ্যাডমিন)',
    badgeLabel: 'প্রধান অ্যাডমিন (উভয় বিভাগ)',
    departmentScope: 'all',
    canManageAllDepartments: true,
  },
  'itvdrive84@gmail.com': {
    email: 'itvdrive84@gmail.com',
    title: 'ভিডিও ডিপার্টমেন্ট অ্যাডমিন',
    badgeLabel: 'ভিডিও অ্যাডমিন',
    departmentScope: 'video',
    canManageAllDepartments: false,
  },
  'itisamgfx@gmail.com': {
    email: 'itisamgfx@gmail.com',
    title: 'গ্রাফিক্স ডিপার্টমেন্ট অ্যাডমিন',
    badgeLabel: 'গ্রাফিক্স অ্যাডমিন',
    departmentScope: 'graphic',
    canManageAllDepartments: false,
  },
};

export const FIXED_ADMIN_EMAILS = Object.keys(ADMIN_CONFIGS) as readonly string[];
export const INITIAL_ADMIN_EMAILS = [...FIXED_ADMIN_EMAILS];

export function isFixedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized in ADMIN_CONFIGS;
}

export function getAdminConfig(email: string | null | undefined): AdminRoleConfig | null {
  if (!email) return null;
  const normalized = email.toLowerCase().trim();
  return ADMIN_CONFIGS[normalized] || null;
}

export function getAdminDepartmentScope(email: string | null | undefined): AdminDepartmentScope | null {
  const config = getAdminConfig(email);
  return config ? config.departmentScope : null;
}
