import React, { useState } from 'react';
import { BookOpen, Copy, Check, ShieldCheck, KeyRound, ExternalLink, Terminal } from 'lucide-react';

export const FirebaseRulesGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default deny all access
    match /{document=**} {
      allow read, write: if false;
    }

    // Authentication helpers
    function isSignedIn() {
      return request.auth != null && request.auth.token.email_verified == true;
    }

    // Admin verification: document must exist in /admins/{email}
    function isAdmin() {
      return isSignedIn() &&
        request.auth.token.email != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 1. Users collection: users/{uid}
    match /users/{userId} {
      allow get: if isSignedIn() && (isOwner(userId) || isAdmin());
      allow list: if isSignedIn() && isAdmin();

      // On create: Only the owner can create their profile.
      // Must have role == "user", active == true, department in ["graphic", "video"]
      allow create: if isOwner(userId) &&
        request.resource.data.keys().hasAll(['name', 'email', 'department', 'role', 'active']) &&
        request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 100 &&
        request.resource.data.email is string && request.resource.data.email == request.auth.token.email &&
        request.resource.data.department in ['graphic', 'video'] &&
        request.resource.data.role == 'user' &&
        request.resource.data.active == true;

      // On update:
      // Regular user can ONLY update their own name (cannot change role, active, or department)
      // Admins can update department and active status
      allow update: if isSignedIn() && (
        (isOwner(userId) &&
         request.resource.data.email == resource.data.email &&
         request.resource.data.role == resource.data.role &&
         request.resource.data.department == resource.data.department &&
         request.resource.data.active == resource.data.active &&
         request.resource.data.name is string && request.resource.data.name.size() > 0) ||
        (isAdmin() &&
         request.resource.data.email == resource.data.email &&
         request.resource.data.role == resource.data.role &&
         request.resource.data.department in ['graphic', 'video'] &&
         request.resource.data.active is bool)
      );

      allow delete: if isAdmin();
    }

    // 2. Categories collection: categories/{id}
    match /categories/{categoryId} {
      allow get, list: if isSignedIn();
      allow create, update, delete: if isAdmin();
    }

    // 3. Tasks collection: tasks/{id}
    match /tasks/{taskId} {
      allow get, list: if isSignedIn() && (resource.data.ownerUid == request.auth.uid || isAdmin());

      allow create: if isSignedIn() &&
        request.resource.data.ownerUid == request.auth.uid &&
        request.resource.data.name is string && request.resource.data.name.size() > 0 &&
        request.resource.data.department in ['graphic', 'video'] &&
        request.resource.data.status in ['pending', 'in_progress', 'completed'];

      // Owner can update their own task; admins CANNOT edit
      allow update: if isSignedIn() &&
        resource.data.ownerUid == request.auth.uid &&
        request.resource.data.ownerUid == resource.data.ownerUid &&
        request.resource.data.name is string && request.resource.data.name.size() > 0 &&
        request.resource.data.status in ['pending', 'in_progress', 'completed'];

      // Owner can delete their own task; admins CANNOT delete
      allow delete: if isSignedIn() && resource.data.ownerUid == request.auth.uid;
    }

    // 4. Admins collection: admins/{email}
    match /admins/{email} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rulesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            ফায়ারবেস সিকিউরিটি রুলস নির্দেশিকা
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ক্লাউড ফায়ারস্টোর সিকিউরিটি রুলস এবং ফায়ারবেস কনসোলে বসানোর সম্পূর্ণ বাংলা গাইড
          </p>
        </div>

        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md active:scale-95 transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'কপি সম্পন্ন হয়েছে!' : 'রুলস কোড কপি করুন'}
        </button>
      </div>

      {/* Rules Highlights & Security Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            ইউজার ডেটা গোপনীয়তা
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            সাধারণ ইউজাররা কেবলমাত্র নিজের কাজের তালিকা দেখতে, যোগ ও সম্পাদন করতে পারবেন। অ্যাডমিন সব দেখতে পারবেন, তবে কোনো ইউজারের কাজ এডিট বা মুছতে পারবেন না।
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-xs mb-1">
            <KeyRound className="w-4 h-4" />
            ভূমিকা ও বিভাগ লক
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            ইউজার নিজে তার প্রোফাইলের <code className="text-pink-600 font-mono">role</code>, <code className="text-pink-600 font-mono">department</code> বা <code className="text-pink-600 font-mono">active</code> পরিবর্তন করতে পারবে না; শুধুমাত্র অ্যাডমিন পরিবর্তন করতে পারবেন।
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-xs mb-1">
            <Terminal className="w-4 h-4" />
            অ্যাডমিন কালেকশন ও CLI ডিপ্লয়
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            অ্যাডমিন অধিকার <code className="text-purple-600 font-mono">/admins/&#123;email&#125;</code> কালেকশনের মাধ্যমে যাচাই হয়। টার্মিনাল থেকে <code className="text-emerald-600 font-mono">npm run deploy:rules</code> কমান্ড দিয়ে রুলস ও ইনডেক্স ডিপ্লয় করা যায়।
          </p>
        </div>
      </div>

      {/* Deployment Methods in Bengali */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          রুলস ডিপ্লয় করার উপায়:
        </h3>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">পদ্ধতি ১: Firebase CLI দিয়ে (এক ক্লিকে)</p>
            <p className="text-slate-600 dark:text-slate-400">টার্মিনালে রান করুন:</p>
            <code className="block mt-1 p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono">npm run deploy:rules</code>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="font-semibold text-slate-900 dark:text-white mb-1">পদ্ধতি ২: Firebase Console থেকে সরাসরি পেস্ট</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>Firebase Console-এ গিয়ে <strong>Firestore Database &gt; Rules</strong>-এ যান।</li>
              <li>নিচের কোডটি কপি করে পেস্ট করুন এবং <strong>Publish</strong> চাপুন।</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Code Viewer with Copy Button */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
          <span className="font-mono font-medium text-emerald-400">firestore.rules</span>
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'কপি হয়েছে' : 'কপি করুন'}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed max-h-[450px]">
          {rulesText}
        </pre>
      </div>
    </div>
  );
};
