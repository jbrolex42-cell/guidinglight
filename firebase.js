// firebase.js — shared Firebase config (CDN version, no build step needed)

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDjuA42MwNgXeLJGU6NS20aOBsS35EXhvY",
  authDomain:        "guiding-light-cbo.firebaseapp.com",
  databaseURL:       "https://guiding-light-cbo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "guiding-light-cbo",
  storageBucket:     "guiding-light-cbo.firebasestorage.app",
  messagingSenderId: "271509407019",
  appId:             "1:271509407019:web:7b927983a6818b37b3316e",
  measurementId:     "G-W0MJM00F62"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);
