import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve Service Account Key
const keyPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(__dirname, '../serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error(`\n❌ সার্ভিস অ্যাকাউন্ট ফাইল পাওয়া যায়নি: ${keyPath}`);
  console.error('অনুগ্রহ করে Firebase Console -> Project Settings -> Service accounts থেকে একটি নতুন প্রাইভেট কি (JSON) ডাউনলোড করুন এবং প্রজেক্টের রুটে serviceAccountKey.json নামে রাখুন, অথবা FIREBASE_SERVICE_ACCOUNT_PATH এনভায়রনমেন্ট ভ্যারিয়েবলে এর পাথ দিন।\n');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 2. Initial Categories Data (২৫টি গ্রাফিক ডিজাইন + ১৫টি ভিডিও এডিটিং)
const INITIAL_CATEGORIES = [
  // ১) গ্রাফিক ডিজাইন
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

  // ২) ভিডিও এডিটিং ও প্রোডাকশন
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

async function seed() {
  console.log('🚀 সিড স্ক্রিপ্ট চালু হচ্ছে...');

  // 1. Process Admin Emails (3 designated admins)
  const rawAdminEmails = process.env.ADMIN_EMAILS || 'itvdrive84@gmail.com,itisamgfx@gmail.com,whitepenguin110@gmail.com';
  const adminEmails = rawAdminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.error('❌ কোনো অ্যাডমিন ইমেইল পাওয়া যায়নি। ADMIN_EMAILS সেট করুন।');
    process.exit(1);
  }

  const selectedAdmins = adminEmails;

  console.log(`\n👑 অ্যাডমিনদের নথি তৈরি হচ্ছে (${selectedAdmins.length} জন)...`);
  for (const email of selectedAdmins) {
    const adminRef = db.collection('admins').doc(email);
    await adminRef.set(
      {
        email: email,
        active: true,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`  ✓ অ্যাডমিন নিশ্চিত করা হয়েছে: ${email}`);
  }

  // 2. Seed Categories (Skip if already exists)
  console.log('\n📂 ক্যাটাগরি তালিকা সিড করা হচ্ছে...');
  const catSnapshot = await db.collection('categories').get();
  const existingCategories = new Set();
  catSnapshot.forEach((doc) => {
    const data = doc.data();
    existingCategories.add(`${data.department}_${(data.name || '').trim()}`);
  });

  let createdCount = 0;
  let skippedCount = 0;

  for (const cat of INITIAL_CATEGORIES) {
    const key = `${cat.department}_${cat.name.trim()}`;
    if (existingCategories.has(key)) {
      skippedCount++;
    } else {
      await db.collection('categories').add({
        name: cat.name,
        department: cat.department,
        incentive: cat.incentive,
        active: true,
        createdAt: new Date().toISOString(),
      });
      createdCount++;
    }
  }

  console.log(`\n🎉 সিড সম্পন্ন হয়েছে!`);
  console.log(`   - অ্যাডমিন সংখ্যা: ${selectedAdmins.length}`);
  console.log(`   - নতুন ক্যাটাগরি যুক্ত: ${createdCount} টি`);
  console.log(`   - পূর্বে বিদ্যমান থাকায় স্কিপ করা হয়েছে: ${skippedCount} টি`);
  console.log(`   - মোট ক্যাটাগরি: ${INITIAL_CATEGORIES.length} টি\n`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ সিড করতে গিয়ে সমস্যা হয়েছে:', err);
    process.exit(1);
  });
