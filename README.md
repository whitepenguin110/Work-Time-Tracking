# কাজের হিসাব (Kajer Hishab)

টিমের গ্রাফিক ডিজাইনার ও ভিডিও এডিটরদের কাজ ও ইনসেনটিভ হিসাব রাখার জন্য আধুনিক বাংলা ওয়েব অ্যাপ্লিকেশন।

---

## 🛠 প্রযুক্তি ও আর্কিটেকচার

- **ফ্রন্টএন্ড**: React 19 + TypeScript + Vite + Tailwind CSS (বাংলা ফন্ট: Hind Siliguri)
- **হোস্টিং**: Netlify (SPA Fallback, সিকিউরিটি হেডার্স)
- **ব্যাকএন্ড ও অথেনটিকেশন**: Firebase Authentication (Google Sign-In) + Cloud Firestore
- **ডেটাবেস সিকিউরিটি**: অ্যাট্রিবিউট-বেজড অ্যাক্সেস কন্ট্রোল (Firestore Security Rules)
- **ইনডেক্সিং**: অপ্টিমাইজড কম্পোজিট ইনডেক্স (`firestore.indexes.json`)

---

## 🚀 সম্পূর্ণ ডিপ্লয়মেন্ট গাইডলাইন (Step-by-Step)

### ক) ফায়ারবেস প্রজেক্ট তৈরি ও কনফিগারেশন
1. [Firebase Console](https://console.firebase.google.com)-এ যান এবং **Add project** দিয়ে নতুন প্রজেক্ট তৈরি করুন (অথবা বিদ্যমান প্রজেক্ট ব্যবহার করুন)।
2. **Google Sign-In চালু করুন**:
   - বাঁপাশের মেনু থেকে **Build > Authentication**-এ যান।
   - **Get Started** ক্লিক করে **Google** প্রোভাইডার সিলেক্ট করুন এবং **Enable** করুন।
   - প্রজেক্ট সাপোর্ট ইমেইল দিয়ে সেভ করুন।
3. **Firestore Database তৈরি করুন**:
   - বাঁপাশের মেনু থেকে **Build > Firestore Database**-এ যান।
   - **Create database**-এ ক্লিক করুন।
   - লোকেশন সিলেক্ট করে **Production mode**-এ ডাটাবেস চালু করুন।
4. **Web App তৈরি করে API Key সংগ্রহ করুন**:
   - প্রজেক্ট ওভারভিউতে গিয়ে **Web (</>)** আইকনে ক্লিক করে একটি অ্যাপ রেজিস্টার করুন।
   - স্ক্রিনে প্রদর্শিত `firebaseConfig`-এর মানগুলো সংরক্ষণ করুন (`apiKey`, `authDomain`, `projectId`, ইত্যাদি)।

---

### খ) সিকিউরিটি রুলস ও ইনডেক্স ডিপ্লয় করা
আপনার কম্পিউটারের টার্মিনাল থেকে প্রজেক্ট ফোল্ডারে গিয়ে Firebase CLI দিয়ে সহজে ডিপ্লয় করতে পারেন:
```bash
# ফায়ারবেসে লগইন করুন
npx firebase login

# রুলস এবং ইনডেক্স ডিপ্লয় করুন
npm run deploy:rules
```
*(বিকল্পভাবে, আপনি সরাসরি Firebase Console-এর `Firestore Database > Rules`-এ গিয়ে `firestore.rules` ফাইলের কোডটি পেস্ট করে `Publish` করতে পারেন।)*

---

### গ) অ্যাডমিন ও ক্যাটাগরি সিড (Seed) করা
শুরুর ৪০টি ক্যাটাগরি এবং প্রাথমিক ২ জন অ্যাডমিনকে ফায়ারবেসে সেটআপ করতে `scripts/seed.mjs` স্ক্রিপ্ট ব্যবহার করুন:

1. **সার্ভিস অ্যাকাউন্ট কি (Service Account Key) ডাউনলোড করুন**:
   - Firebase Console -> **Project settings (⚙️)** -> **Service accounts** ট্যাবে যান।
   - **Generate new private key** বাটনে চাপ দিয়ে JSON ফাইলটি ডাউনলোড করুন।
   - ফাইলটির নাম দিন `serviceAccountKey.json` এবং প্রজেক্টের রুট ফোল্ডারে রাখুন (এটি `.gitignore`-এ যুক্ত থাকায় কখনো গিটহাবে আপলোড হবে না)।
2. **সিড কমান্ড চালান**:
   ```bash
   # ৩ জন অনুমোদিত অ্যাডমিনের জিমেইল
   ADMIN_EMAILS="itvdrive84@gmail.com,itisamgfx@gmail.com,whitepenguin110@gmail.com" npm run seed
   ```
   *স্ক্রিপ্টটি স্বয়ংক্রিয়ভাবে ২৫টি গ্রাফিক ও ১৫টি ভিডিও ক্যাটাগরি এবং এই ৩ জন অ্যাডমিনকে ফায়ারবেসে সেট করে দেবে।*

---

### ঘ) GitHub-এ কোড পুশ করা
```bash
git init
git add .
git commit -m "feat: complete kajer-hishab app for netlify"
git branch -M main
git remote add origin https://github.com/<আপনার-ইউজারনেম>/<রিপোজিটরি-নাম>.git
git push -u origin main
```

---

### ঙ) Netlify-তে প্রজেক্ট ইমপোর্ট ও ডিপ্লয়
1. [Netlify](https://app.netlify.com)-এ লগইন করুন।
2. **Add new site > Import an existing project > GitHub** সিলেক্ট করুন।
3. আপনার গিটহাব রিপোজিটরিটি বেছে নিন।
4. **বিল্ড সেটিংস** (`netlify.toml` ফাইল থাকায় স্বয়ংক্রিয়ভাবে বসে যাবে):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. **Environment Variables যুক্ত করুন**:
   **Site configuration > Environment variables > Add variables**-এ গিয়ে নিচের ৬টি ভ্যারিয়েবল সেট করুন:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   *(প্রয়োজনে `VITE_FIREBASE_DATABASE_ID` দিতে পারেন, সাধারণ ক্ষেত্রে খালি থাকবে)*
6. **Deploy site** বাটনে ক্লিক করুন!

---

### চ) ফায়ারবেসে Netlify ডোমেইন অনুমোদিত (Authorized) করা ⚠️
নেটলিফাইতে ডিপ্লয় শেষে আপনি একটি ডোমেইন পাবেন (যেমন: `https://your-app-name.netlify.app`):
1. Firebase Console-এ যান।
2. **Authentication > Settings > Authorized domains**-এ যান।
3. **Add domain** বাটনে ক্লিক করে আপনার Netlify ডোমেইনটি (যেমন: `your-app-name.netlify.app`) এবং কোনো কাস্টম ডোমেইন থাকলে তা যুক্ত করুন।

---

### ছ) টেস্টিং ও যাচাইকরণ
1. **অ্যাডমিন লগইন পরীক্ষা**:
   - `ADMIN_EMAILS`-এ দেওয়া ইমেইল দিয়ে গুগল সাইন-ইন করুন।
   - প্রোফাইল সাবমিট করার পর উপরে অ্যাডমিন ট্যাবগুলো দেখতে পাবেন (টিম ড্যাশবোর্ড, ক্যাটাগরি রেট, মাসিক রিপোর্ট ইত্যাদি)।
2. **সাধারণ ইউজার লগইন পরীক্ষা**:
   - অন্য একটি গুগল অ্যাকাউন্ট দিয়ে লগইন করুন।
   - নাম ও বিভাগ সিলেক্ট করে নিবন্ধন করুন।
   - নতুন কাজ যুক্ত করুন এবং কাজ সম্পন্ন করে ইনসেনটিভ যোগ হওয়া দেখুন।
3. **গোপনীয়তা নিশ্চিতকরণ**:
   - এক ইউজারের অ্যাকাউন্ট থেকে কখনোই অন্য ইউজারের কাজ দেখা যাবে না।

---

## 🔧 ট্রাবলশুটিং (Troubleshooting)

| সমস্যা | কারণ | সমাধান |
| :--- | :--- | :--- |
| **রিলোড দিলে Blank Page / 404** | SPA ক্লায়েন্ট-সাইড রাউটিং এরর | `netlify.toml`-এ `[[redirects]]` যুক্ত আছে (`/*` -> `/index.html`, স্ট্যাটাস 200)। এটি রিলোড সমস্যা স্থায়ীভাবে সমাধান করে। |
| **Google Sign-In Popup Blocked** | পপআপ ব্লকার বা COOP হেডার কনফ্লিক্ট | ব্রাউজারে পপআপ অ্যালাউ করুন। `netlify.toml`-এ আমরা Cross-Origin-Opener-Policy এমনভাবে রেখেছি যাতে পপআপ উইন্ডো স্বাভাবিকভাবে কাজ করতে পারে। |
| **Permission Denied Error** | ফায়ারবেস সিকিউরিটি রুলস ব্লকিং | নিশ্চিত করুন ইউজার লগইন অবস্থায় আছে এবং ইউজারের প্রোফাইল তৈরির সময় `role: "user"` ও `active: true` দেওয়া হয়েছে। অ্যাডমিন ক্ষমতার জন্য `/admins/{email}` ডকুমেন্টে ইমেইল থাকতে হবে। |
| **The query requires an index Error** | ফায়ারবেস ফিল্টারে ইনডেক্স প্রয়োজন | এরর মেসেজের সাথে আসা লিংকে ক্লিক করে ফায়ারবেসে ১-ক্লিকে ইনডেক্স তৈরি করুন অথবা টার্মিনালে `npm run deploy:rules` চালান। |
| **Unauthorized Domain Error** | ফায়ারবেসে নেটলিফাই ডোমেইন যুক্ত নেই | Firebase Console -> Authentication -> Settings -> Authorized domains-এ আপনার `.netlify.app` ডোমেইনটি যোগ করুন। |

---

## 📌 আপনি যা নিজে করবেন (যা কোড দিয়ে স্বয়ংক্রিয় করা যায় না)
১. ফায়ারবেস কনসোলে গিয়ে Google Sign-In প্রোভাইডার Enable করা।  
২. ফায়ারবেস কনসোলে Service Account Key জেনারেট করে লোকাল কম্পিউটারে রাখা।  
৩. Netlify ড্যাশবোর্ডে গিয়ে `VITE_FIREBASE_*` সিক্রেট কী-গুলো Environment Variables হিসেবে পেস্ট করা।  
৪. Firebase Authorized Domains-এ আপনার Netlify-এর ডোমেইন নামটি পেস্ট করা।  
