import React, { useState } from 'react';
import { BookOpen, Copy, Check, ShieldCheck, KeyRound, ExternalLink, Terminal } from 'lucide-react';

export const FirebaseRulesGuide: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    function isEmailVerified() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }

    function isBootstrappedAdmin() {
      return isEmailVerified() && (
        request.auth.token.email == 'whitepenguin110@gmail.com'
      );
    }

    function isAdmin() {
      return isSignedIn() && (
        isBootstrappedAdmin() ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.active == true)
      );
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidUser(data) {
      return data.name is string && data.name.size() > 0 && data.name.size() <= 100 &&
             data.email is string && data.email.size() > 0 && data.email.size() <= 150 &&
             data.department in ['graphic', 'video'] &&
             data.role in ['admin', 'user'] &&
             data.active is bool;
    }

    function isValidCategory(data) {
      return data.name is string && data.name.size() > 0 && data.name.size() <= 150 &&
             data.department in ['graphic', 'video'] &&
             data.incentive is number && data.incentive >= 0 &&
             data.active is bool;
    }

    function isValidTask(data) {
      return data.ownerUid is string && data.ownerUid == request.auth.uid &&
             data.name is string && data.name.size() > 0 && data.name.size() <= 200 &&
             data.categoryId is string && data.categoryId.size() <= 128 &&
             data.department in ['graphic', 'video'] &&
             data.workDate is string && data.workDate.size() <= 10 &&
             data.dueDate is string && data.dueDate.size() <= 10 &&
             data.status in ['pending', 'in_progress', 'completed'] &&
             data.incentiveAmount is number && data.incentiveAmount >= 0;
    }

    // 1. Users collection
    match /users/{userId} {
      allow get: if isSignedIn() && (isOwner(userId) || isAdmin());
      allow list: if isSignedIn() && isAdmin();

      // On register:
      allow create: if isOwner(userId) && isValidUser(request.resource.data) && (
        (isBootstrappedAdmin() && request.resource.data.role in ['admin', 'user']) ||
        (!isBootstrappedAdmin() && request.resource.data.role == 'user')
      );

      // On update: Admin can update role, department, active status.
      // User can only update their name, keeping email, role, department, and active unchanged.
      allow update: if isSignedIn() && isValidUser(request.resource.data) && (
        isAdmin() ||
        (isOwner(userId) &&
         request.resource.data.email == resource.data.email &&
         request.resource.data.role == resource.data.role &&
         request.resource.data.department == resource.data.department &&
         request.resource.data.active == resource.data.active)
      );

      allow delete: if isAdmin();
    }

    // 2. Categories collection
    match /categories/{categoryId} {
      // Anyone signed in can read/list categories to pick them in task forms
      allow get, list: if isSignedIn();
      // Only admin can create, update, or soft-delete categories
      allow create: if isAdmin() && isValidCategory(request.resource.data);
      allow update: if isAdmin() && isValidCategory(request.resource.data);
      allow delete: if isAdmin();
    }

    // 3. Tasks collection
    match /tasks/{taskId} {
      // User can only see their own tasks; admin can see all tasks
      allow get: if isSignedIn() && (resource.data.ownerUid == request.auth.uid || isAdmin());
      allow list: if isSignedIn() && (resource.data.ownerUid == request.auth.uid || isAdmin());

      allow create: if isEmailVerified() &&
        request.resource.data.ownerUid == request.auth.uid &&
        isValidTask(request.resource.data);

      allow update: if isEmailVerified() && (
        (resource.data.ownerUid == request.auth.uid &&
         request.resource.data.ownerUid == resource.data.ownerUid &&
         isValidTask(request.resource.data)) ||
        isAdmin()
      );

      allow delete: if isSignedIn() && (
        resource.data.ownerUid == request.auth.uid || isAdmin()
      );
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
            সাধারণ ইউজাররা কেবলমাত্র নিজের কাজের তালিকা দেখতে, যোগ ও সম্পাদন করতে পারবেন। অন্যের কাজ দেখার সুযোগ সম্পূর্ণ বন্ধ।
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
            ক্যাটাগরি নিয়ন্ত্রণ
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            সব সাইন-ইন করা সদস্য ক্যাটাগরি তালিকা দেখতে পারবেন, তবে নতুন ক্যাটাগরি তৈরি বা রেট পরিবর্তনের অধিকার কেবল অ্যাডমিনের।
          </p>
        </div>
      </div>

      {/* Step by Step Deployment Guide in Bengali */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          কীভাবে ফায়ারবেস কনসোলে এই রুলস বসাবেন (ধাপে ধাপে):
        </h3>

        <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300 list-decimal list-inside leading-relaxed">
          <li className="pl-1">
            প্রথমে আপনার ব্রাউজারে{' '}
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 font-semibold underline inline-flex items-center gap-1"
            >
              Firebase Console <ExternalLink className="w-3 h-3" />
            </a>{' '}
            -এ গিয়ে আপনার সংশ্লিষ্ট প্রোজেক্টটি ওপেন করুন।
          </li>
          <li className="pl-1">
            বামপাশের মেনু থেকে <strong>Build &gt; Firestore Database</strong>-এ ক্লিক করুন।
          </li>
          <li className="pl-1">
            উপরে থাকা ট্যাবগুলোর মধ্যে <strong>Rules</strong> ট্যাবে ক্লিক করুন।
          </li>
          <li className="pl-1">
            সেখানে থাকা পুরনো কোড মুছে ফেলে নিচের বক্সের সম্পূর্ণ কোডটি পেস্ট করুন।
          </li>
          <li className="pl-1">
            উপরের ডানপাশে থাকা <strong>Publish</strong> বোতামে ক্লিক করুন। সাথে সাথেই আপনার ডেটাবেসের সকল রুলস কার্যকর হয়ে যাবে!
          </li>
        </ol>
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
            {copied ? 'কপি হয়েছে' : 'কপি করুন'}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed max-h-[450px]">
          {rulesText}
        </pre>
      </div>
    </div>
  );
};
