import { describe, expect, test, mock } from "bun:test";

mock.module("firebase/app", () => ({
  initializeApp: () => ({}),
}));

mock.module("firebase/auth", () => ({
  getAuth: () => ({}),
  setPersistence: async () => {},
  GoogleAuthProvider: class { setCustomParameters() {} },
  browserLocalPersistence: {},
}));

mock.module("firebase/firestore", () => ({
  getFirestore: () => ({}),
}));

import { getBengaliErrorMessage } from "./firebase";

describe("getBengaliErrorMessage", () => {
  test("should handle missing index link", () => {
    const error = new Error("requires an index: https://console.firebase.google.com/project/my-project/database/firestore/indexes?create_composite=...");
    const result = getBengaliErrorMessage(error);
    expect(result.indexUrl).toBe("https://console.firebase.google.com/project/my-project/database/firestore/indexes?create_composite=...");
  });

  test("should handle permission-denied string", () => {
    const result = getBengaliErrorMessage("FirebaseError: [code=permission-denied]: ... ");
    expect(result.message).toBe("আপনার এই তথ্যটি দেখা, যোগ বা পরিবর্তন করার অনুমতি নেই (Permission Denied)।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle Missing or insufficient permissions string", () => {
    const result = getBengaliErrorMessage("Missing or insufficient permissions");
    expect(result.message).toBe("আপনার এই তথ্যটি দেখা, যোগ বা পরিবর্তন করার অনুমতি নেই (Permission Denied)।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle permission-denied Error instance", () => {
    const error = new Error("FirebaseError: [code=permission-denied]: ... ");
    const result = getBengaliErrorMessage(error);
    expect(result.message).toBe("আপনার এই তথ্যটি দেখা, যোগ বা পরিবর্তন করার অনুমতি নেই (Permission Denied)।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle failed-precondition string", () => {
    const result = getBengaliErrorMessage("FirebaseError: [code=failed-precondition]: ... ");
    expect(result.message).toBe("এই তথ্যগুলো ফিল্টার করতে ফায়ারবেসে একটি ইনডেক্স প্রয়োজন (Missing Index)। নিচের লিংকে গিয়ে ইনডেক্স তৈরি করুন অথবা firestore.indexes.json ডিপ্লয় করুন।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle requires an index string", () => {
    const result = getBengaliErrorMessage("requires an index");
    expect(result.message).toBe("এই তথ্যগুলো ফিল্টার করতে ফায়ারবেসে একটি ইনডেক্স প্রয়োজন (Missing Index)। নিচের লিংকে গিয়ে ইনডেক্স তৈরি করুন অথবা firestore.indexes.json ডিপ্লয় করুন।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle unavailable string", () => {
    const result = getBengaliErrorMessage("FirebaseError: [code=unavailable]: ... ");
    expect(result.message).toBe("ইন্টারনেট সংযোগ পাওয়া যায়নি অথবা ফায়ারবেস সার্ভারের সাথে যোগাযোগ বিচ্ছিন্ন রয়েছে।");
    expect(result.indexUrl).toBeNull();
  });

  test("should handle offline string", () => {
    const result = getBengaliErrorMessage("offline");
    expect(result.message).toBe("ইন্টারনেট সংযোগ পাওয়া যায়নি অথবা ফায়ারবেস সার্ভারের সাথে যোগাযোগ বিচ্ছিন্ন রয়েছে।");
    expect(result.indexUrl).toBeNull();
  });

  test("should fallback to default error message", () => {
    const result = getBengaliErrorMessage("some unknown error");
    expect(result.message).toBe("একটি অপ্রত্যাশিত সমস্যা হয়েছে: some unknown error");
    expect(result.indexUrl).toBeNull();
  });
});
