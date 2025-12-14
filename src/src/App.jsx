// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCK-XOt0nCsbbYzWlQwTCv8Ip5HVg4ZlX8",
  authDomain: "mon-journal-trading-mike.firebaseapp.com",
  projectId: "mon-journal-trading-mike",
  storageBucket: "mon-journal-trading-mike.firebasestorage.app",
  messagingSenderId: "497280243618",
  appId: "1:497280243618:web:9445bec3145f4642c144fb",
  measurementId: "G-BMJ7F3NKQH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
