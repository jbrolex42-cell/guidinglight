// index.js — Firebase read logic for the public site
// Imported by index.html only

import { db } from './firebase.js';
import {
  collection, getDocs, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── LOAD GALLERY FROM FIRESTORE ───────────────────────────────────────────────
async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  try {
    const snap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));

    if (snap.empty) return; // keep seeded placeholder items

    // Clear seeded placeholders once we have real data
    grid.innerHTML = '';

    snap.forEach(d => {
      const data = d.data();
      const item = document.createElement('div');
      item.className = 'gal-item';
      item.dataset.cat = data.category;
      item.setAttribute('onclick', 'openLightbox(this)');
      item.innerHTML =
        `<img src="${data.imageUrl}" alt="${data.caption}" loading="lazy">` +
        `<span class="gal-cat-badge">${data.categoryLabel}</span>` +
        `<div class="gal-overlay"><span class="gal-caption">${data.caption}</span></div>`;
      grid.appendChild(item);
    });

  } catch (err) {
    console.error('Failed to load gallery:', err);
  }
}

// ── LOAD NEWS FROM FIRESTORE ──────────────────────────────────────────────────
async function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  try {
    const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));

    if (snap.empty) return; // keep seeded cards

    // Clear seeded cards once we have real data
    grid.innerHTML = '';

    snap.forEach(d => {
      const data = d.data();
      const card = document.createElement('div');
      card.className = 'news-card';
      card.innerHTML =
        `<div class="news-meta">
          <span class="news-tag ${data.tagClass}">${data.tagLabel}</span>
          <span class="news-date">${data.displayDate}</span>
        </div>
        <h4>${data.headline}</h4>
        <p>${data.content}</p>`;
      grid.appendChild(card);
    });

  } catch (err) {
    console.error('Failed to load news:', err);
  }
}

// ── RUN ON PAGE LOAD ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  loadNews();
});
