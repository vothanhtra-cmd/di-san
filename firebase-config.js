import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJWKU6AfYj5sWJWP3mpxoi_sFMJ6jCkis",
  authDomain: "di-san-21d3a.firebaseapp.com",
  projectId: "di-san-21d3a",
  messagingSenderId: "1032254736159",
  appId: "1:1032254736159:web:efded18ca89d18d4f3122a",
  measurementId: "G-0CEMC1NVR2"
};

export let app;
export let auth;
export let db;
export let provider;

export function initializeFirebase() {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
}
