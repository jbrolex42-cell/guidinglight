// index.js — Supabase read logic for public site
// <script type="module" src="index.js"></script> in index.html

import { supabase } from './supabase.js';

// ── LOAD GALLERY ──────────────────────────────────────────────────────────────

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const { data, error } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('Gallery load failed:', error); return; }
  if (!data?.length) return; // keep seeded placeholders

  grid.innerHTML = '';
  data.forEach(row => {
    const item = document.createElement('div');
    item.className = 'gal-item';
    item.dataset.cat = row.category;
    item.setAttribute('onclick', 'openLightbox(this)');
    item.innerHTML =
      `<img src="${row.image_url}" alt="${row.caption}" loading="lazy">` +
      `<span class="gal-cat-badge">${row.category_label}</span>` +
      `<div class="gal-overlay"><span class="gal-caption">${row.caption}</span></div>`;
    grid.appendChild(item);
  });

async function fetchAndDisplayAvatar() {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', 'YOUR_USER_ID_HERE') // Ensure this matches the ID of the person
    .single();

  if (data && data.avatar_url) {
    const avatarImg = document.getElementById('avatarImg-claire');
    if (avatarImg) {
      avatarImg.src = data.avatar_url;
    }
  }
}

// Run this when the page loads
window.addEventListener('DOMContentLoaded', fetchAndDisplayAvatar);
}

// ── LOAD NEWS ─────────────────────────────────────────────────────────────────

async function loadNews() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error('News load failed:', error); return; }
  if (!data?.length) return; // keep seeded cards

  grid.innerHTML = '';
  data.forEach(row => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML =
      `<div class="news-meta">
        <span class="news-tag ${row.tag_class}">${row.tag_label}</span>
        <span class="news-date">${row.display_date}</span>
      </div>
      <h4>${row.headline}</h4>
      <p>${row.content}</p>`;
    grid.appendChild(card);
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadGallery();
  loadNews();
});
