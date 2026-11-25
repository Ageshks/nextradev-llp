import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAZyE_uMvVt8DiAa8RJQ3rLw1DiFs1tHk4",
  authDomain: "nextradev-652ae.firebaseapp.com",
  projectId: "nextradev-652ae",
  storageBucket: "nextradev-652ae.firebasestorage.app",
  messagingSenderId: "772623738188",
  appId: "1:772623738188:web:a0a4a350e018f4244b5be9"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export { app }
