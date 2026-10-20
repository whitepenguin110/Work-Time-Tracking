export type Department = 'graphic' | 'video';
export type UserRole = 'admin' | 'user';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type ApprovalStatus = 'not_submitted' | 'pending_approval' | 'approved' | 'rejected';
export type MemberApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string; // User ID / Username / UID
  username?: string;
  realName?: string;
  name: string;
  email: string;
  department: Department;
  role: UserRole;
  adminDepartmentScope?: 'all' | 'graphic' | 'video';
  active: boolean;
  approvalStatus?: MemberApprovalStatus; // 'pending' | 'approved' | 'rejected'
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  archived?: boolean; // soft-delete status
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  restoredAt?: string;
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

export type TaskUrgency = 'urgent' | 'medium' | 'normal';

export interface Task {
  id: string;
  ownerUid: string; // Assigned member UID (for backward compatibility & query safety)
  assignedToUid: string;
  assignedToName: string;
  assignedToEmail: string;
  createdByUid?: string;
  createdByName?: string;
  createdByEmail?: string;
  name: string;
  clientName?: string; // কাজটি কোন ব্যক্তি দিচ্ছে তার নাম
  urgency?: TaskUrgency; // 'urgent' (খুব জরুরি - লাল) | 'medium' (মাঝারি - হলুদ) | 'normal' (সাধারণ - সবুজ)
  categoryId: string;
  categoryName: string;
  department: Department;
  workDate: string; // YYYY-MM-DD
  dueDate: string;  // YYYY-MM-DD
  status: TaskStatus; // 'pending' | 'in_progress' | 'completed'
  submitDate?: string; // YYYY-MM-DD (set when marked completed)
  incentiveAmount: number; // Locked amount in BDT
  note?: string;
  approvalStatus: ApprovalStatus;
  approvedByEmail?: string; // কোন অ্যাডমিন অনুমোদন করেছে
  approvedByName?: string;
  approvedAt?: string; // অনুমোদনের সময়কাল
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
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
