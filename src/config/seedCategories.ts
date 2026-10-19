import { Department } from '../types';

export interface SeedCategoryItem {
  name: string;
  department: Department;
  incentive: number;
}

export const INITIAL_CATEGORIES: SeedCategoryItem[] = [
  // ১) গ্রাফিক ডিজাইন (২৫টি ক্যাটাগরি)
  { name: 'পত্রিকার ফর্মা সেটআপ', department: 'graphic', incentive: 0 },
  { name: 'পত্রিকার কভার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'পত্রিকার মকআপ তৈরি', department: 'graphic', incentive: 0 },
  { name: 'বইয়ের কভার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'বইয়ের ফর্মা সেটআপ', department: 'graphic', incentive: 0 },
  { name: 'জুমার খুতবা পোস্ট ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'ইসলামিক সম্মেলন পোস্ট ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'অন্যান্য পোস্ট ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'থাম্বনেইল ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'ওয়েব ইমেজ ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'অনলাইন ব্যানার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'প্রিন্ট ব্যানার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'ফেস্টুন ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'ক্রস ব্যানার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'স্টেজ ডিজাইন', department: 'graphic', incentive: 0 },
  { name: '১ পাতার লিফলেট ডিজাইন', department: 'graphic', incentive: 0 },
  { name: '৩ ফোল্ড লিফলেট ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'মেমো/লেটারহেড ফর্মা সেটআপ', department: 'graphic', incentive: 0 },
  { name: 'লোগো ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'আইডি কার্ড ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'মেমো ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'প্রতিষ্ঠানের ব্রোশিওর ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'খাতার কভার/ডায়েরি কভার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'খাতা/ডায়েরির ইনার ডিজাইন', department: 'graphic', incentive: 0 },
  { name: 'বইয়ের কভারের ফর্মা আপডেট', department: 'graphic', incentive: 0 },

  // ২) ভিডিও এডিটিং ও প্রোডাকশন (১৫টি ক্যাটাগরি)
  { name: 'জুমার খুতবা শুট — রাজশাহীতে', department: 'video', incentive: 0 },
  { name: 'জুমার খুতবা শুট — সফরে', department: 'video', incentive: 0 },
  { name: 'অফিস টাইম বাইরে শুট', department: 'video', incentive: 0 },
  { name: 'সফর — ১ দিন', department: 'video', incentive: 0 },
  { name: 'বড় ভিডিও — সিনেমাটোগ্রাফিক শুট', department: 'video', incentive: 0 },
  { name: 'জুমার খুতবা এডিট', department: 'video', incentive: 0 },
  { name: 'রিলস কাট — ১টা', department: 'video', incentive: 0 },
  { name: 'বড় ভিডিও — নরমাল এডিট', department: 'video', incentive: 0 },
  { name: 'বড় ভিডিও — সিনেমাটোগ্রাফিক এডিট', department: 'video', incentive: 0 },
  { name: 'থাম্বনেইল ডিজাইন', department: 'video', incentive: 0 },
  { name: 'সিরিজ সেট ডিজাইন + শুট প্ল্যানিং + সিরিজ ডিজাইন', department: 'video', incentive: 0 },
  { name: 'ভয়েস ওভার — ছোট', department: 'video', incentive: 0 },
  { name: 'ভয়েস ওভার — বড়', department: 'video', incentive: 0 },
  { name: 'প্রমোশন ভিডিও', department: 'video', incentive: 0 },
  { name: 'লাইভ প্রোগ্রাম', department: 'video', incentive: 0 },
];
