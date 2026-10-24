
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCF3i3R7dQdOZUGCFCF4SnGDRcajMAH0g5A",
  authDomain: "voiceguard-61a95.firebaseapp.com",
  projectId: "voiceguard-61a95",
  storageBucket: "voiceguard-61a95.firebasestorage.app",
  messagingSenderId: "79100872827",
  appId: "1:79100872827:web:ced9510ec6770e376afade"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
