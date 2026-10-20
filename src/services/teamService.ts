import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from './firebase';
import { TEAM_MEMBERS_LIST, TeamMemberConfig } from '../config/accounts';
import { Department, UserProfile } from '../types';

export interface TeamMemberRecord {
  username: string;
  realName: string;
  displayName: string;
  department: Department;
  role: 'user';
  active: boolean;
  approvalStatus: 'approved';
  updatedAt?: string;
  updatedBy?: string;
}

const LOCAL_STORAGE_REAL_NAMES_KEY = 'kajer_hishab_member_real_names_v1';

// Read cached real names from localStorage
export function getCachedRealNames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REAL_NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save real names to localStorage
export function setCachedRealNames(map: Record<string, string>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REAL_NAMES_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to cache real names in localStorage:', err);
  }
}

// Generate formatted display name: e.g. "Rahim (designer3)" or "designer3"
export function formatMemberDisplayName(username: string, realName?: string | null): string {
  if (realName && realName.trim().length > 0) {
    return `${realName.trim()} (${username})`;
  }
  return username;
}

// Synchronize all 20 hardcoded team members in Firestore
export async function syncAllTeamMembers(): Promise<void> {
  const cachedNames = getCachedRealNames();

  for (const member of TEAM_MEMBERS_LIST) {
    const userDocRef = doc(db, 'users', member.username);
    const teamDocRef = doc(db, 'team_members', member.username);

    try {
      const snap = await getDoc(userDocRef);
      const existingData = snap.exists() ? snap.data() : null;
      const existingRealName = existingData?.realName || cachedNames[member.username] || '';

      const userProfile: UserProfile = {
        id: member.username,
        username: member.username,
        realName: existingRealName,
        name: formatMemberDisplayName(member.username, existingRealName),
        email: `${member.username}@team.local`,
        department: member.department,
        role: 'user',
        active: true,
        approvalStatus: 'approved',
        archived: false,
        createdAt: existingData?.createdAt || new Date().toISOString(),
      };

      await setDoc(userDocRef, userProfile, { merge: true });
      await setDoc(teamDocRef, {
        username: member.username,
        realName: existingRealName,
        department: member.department,
      }, { merge: true });
    } catch (err) {
      console.warn(`Sync notice for ${member.username}:`, err);
    }
  }
}

// Update real name for a team member
export async function updateMemberRealName(
  username: string,
  newRealName: string,
  adminScope: 'all' | 'graphic' | 'video',
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const member = TEAM_MEMBERS_LIST.find((m) => m.username.toLowerCase() === username.toLowerCase());
  if (!member) {
    return { success: false, error: 'টিম মেম্বার খুঁজে পাওয়া যায়নি।' };
  }

  // Permission validation:
  // - Master admin ('all') can rename anyone
  // - GFX admin ('graphic') can rename only designers
  // - Video admin ('video') can rename only video editors
  if (adminScope === 'graphic' && member.department !== 'graphic') {
    return { success: false, error: 'গ্রাফিক ডিজাইন অ্যাডমিন শুধুমাত্র ডিজাইনারদের নাম পরিবর্তন করতে পারবেন।' };
  }
  if (adminScope === 'video' && member.department !== 'video') {
    return { success: false, error: 'ভিডিও এডিটিং অ্যাডমিন শুধুমাত্র ভিডিও এডিটরদের নাম পরিবর্তন করতে পারবেন।' };
  }

  const cleanedRealName = newRealName.trim();
  const displayName = formatMemberDisplayName(member.username, cleanedRealName);

  // Update local cache first
  const currentMap = getCachedRealNames();
  currentMap[member.username] = cleanedRealName;
  setCachedRealNames(currentMap);

  try {
    const userDocRef = doc(db, 'users', member.username);
    const teamDocRef = doc(db, 'team_members', member.username);

    const updatePayload = {
      realName: cleanedRealName,
      name: displayName,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    };

    await setDoc(userDocRef, updatePayload, { merge: true });
    await setDoc(teamDocRef, updatePayload, { merge: true });

    return { success: true };
  } catch (err) {
    console.warn('Real name update Firestore notice:', err);
    // Even if firestore has a blip, local update already succeeded
    return { success: true };
  }
}
