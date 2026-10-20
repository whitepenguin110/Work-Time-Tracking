import { Department } from '../types';

export interface AdminAccountConfig {
  email: string;
  password: string; // Case-sensitive
  name: string;
  departmentScope: 'all' | 'graphic' | 'video';
  role: 'admin';
}

export interface TeamMemberConfig {
  username: string; // e.g. 'designer1', 'videoeditor1'
  department: Department; // 'graphic' | 'video'
  defaultPassword: string; // '12345678'
}

// 3 Admins configured with exact email, case-sensitive password, and department scope
export const ADMIN_ACCOUNTS: AdminAccountConfig[] = [
  {
    email: 'whitepenguin110@gmail.com',
    password: 'Admin110',
    name: 'মাস্টার অ্যাডমিন (Master Admin)',
    departmentScope: 'all',
    role: 'admin',
  },
  {
    email: 'itisamgfx@gmail.com',
    password: 'Admin220',
    name: 'গ্রাফিক ডিজাইন অ্যাডমিন (GFX Admin)',
    departmentScope: 'graphic',
    role: 'admin',
  },
  {
    email: 'itvdrive84@gmail.com',
    password: 'Admin330',
    name: 'ভিডিও এডিটিং অ্যাডমিন (Video Admin)',
    departmentScope: 'video',
    role: 'admin',
  },
];

// 20 Hardcoded Team Members (10 Graphic Designers + 10 Video Editors)
export const TEAM_MEMBERS_LIST: TeamMemberConfig[] = [
  // 10 Designers
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `designer${i + 1}`,
    department: 'graphic' as Department,
    defaultPassword: '12345678',
  })),
  // 10 Video Editors
  ...Array.from({ length: 10 }, (_, i) => ({
    username: `videoeditor${i + 1}`,
    department: 'video' as Department,
    defaultPassword: '12345678',
  })),
];

// Helper to look up an admin by exact email and case-sensitive password
export function authenticateAdmin(identifier: string, password: string): AdminAccountConfig | null {
  const normalizedId = identifier.trim().toLowerCase();
  const admin = ADMIN_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalizedId && a.password === password
  );
  return admin || null;
}

// Helper to look up a team member by exact username and case-sensitive password
export function authenticateTeamMember(identifier: string, password: string): TeamMemberConfig | null {
  const normalizedUsername = identifier.trim().toLowerCase();
  const member = TEAM_MEMBERS_LIST.find(
    (m) => m.username.toLowerCase() === normalizedUsername && m.defaultPassword === password
  );
  return member || null;
}
