// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjuA42MwNgXeLJGU6NS20aOBsS35EXhvY",
  authDomain: "guiding-light-cbo.firebaseapp.com",
  databaseURL: "https://guiding-light-cbo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "guiding-light-cbo",
  storageBucket: "guiding-light-cbo.firebasestorage.app",
  messagingSenderId: "271509407019",
  appId: "1:271509407019:web:7b927983a6818b37b3316e",
  measurementId: "G-W0MJM00F62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);