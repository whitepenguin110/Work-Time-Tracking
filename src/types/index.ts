export type Department = 'graphic' | 'video';
export type UserRole = 'admin' | 'user';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface UserProfile {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  department: Department;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  department: Department;
  incentive: number;
  active: boolean;
  createdAt?: string;
}

export interface Task {
  id: string;
  ownerUid: string;
  name: string;
  categoryId: string;
  categoryName: string;
  department: Department;
  workDate: string; // YYYY-MM-DD
  dueDate: string;  // YYYY-MM-DD
  status: TaskStatus;
  submitDate?: string; // YYYY-MM-DD (set when completed)
  incentiveAmount: number; // Locked amount in BDT when completed
  note?: string;
  createdAt?: string;
}

export interface DepartmentInfo {
  id: Department;
  label: string;
  shortLabel: string;
  iconName: string;
}

export const DEPARTMENTS: Record<Department, DepartmentInfo> = {
  graphic: {
    id: 'graphic',
    label: 'গ্রাফিক ডিজাইন',
    shortLabel: 'ডিজাইন',
    iconName: 'Palette'
  },
  video: {
    id: 'video',
    label: 'ভিডিও এডিটিং ও প্রোডাকশন',
    shortLabel: 'ভিডিও',
    iconName: 'Video'
  }
};
