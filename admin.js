// admin.js — Cloudinary image upload + Firestore metadata
// <script type="module" src="admin.js"></script> in admin.html

import { db } from './firebase.js';
import {
  collection, addDoc, deleteDoc, doc,
  getDocs, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const CLOUDINARY_CLOUD  = 'dibihyq55';
const CLOUDINARY_PRESET = 'guiding_light_uploads';
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

// ── RENDER HELPERS ────────────────────────────────────────────────────────────

function renderGalleryCard(data) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const item = document.createElement('div');
  item.className        = 'gal-item';
  item.dataset.cat      = data.category;
  item.dataset.docId    = data.id;
  item.dataset.publicId = data.publicId || '';
  item.setAttribute('onclick', 'openLightbox(this)');
  item.innerHTML =
    `<img src="${data.imageUrl}" alt="${data.caption}">` +
    `<span class="gal-cat-badge">${data.categoryLabel}</span>` +
    `<div class="gal-overlay"><span class="gal-caption">${data.caption}</span></div>` +
    `<button class="gal-delete-btn" onclick="deleteGalleryItem(event,this)" title="Delete photo">×</button>`;
  grid.prepend(item);
}

function renderNewsCard(data) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const card = document.createElement('div');
  card.className        = 'news-card';
  card.style.cssText    = 'animation:slideUp 0.35s ease; position:relative;';
  card.dataset.docId    = data.id;
  card.innerHTML =
    `<div class="news-meta">
      <span class="news-tag ${data.tagClass}">${data.tagLabel}</span>
      <span class="news-date">${data.displayDate}</span>
    </div>
    <h4>${data.headline}</h4>
    <p>${data.content}</p>
    <button onclick="deleteNewsCard(this)" title="Delete"
      style="position:absolute;top:10px;right:10px;background:rgba(192,57,43,0.8);
             color:#fff;border:none;border-radius:50%;width:22px;height:22px;
             cursor:pointer;font-size:14px;display:flex;align-items:center;
             justify-content:center;">×</button>`;
  grid.prepend(card);
}

// ── LOAD EXISTING DATA ────────────────────────────────────────────────────────

async function loadAdminData() {
  try {
    const galSnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
    if (!galSnap.empty) {
      document.getElementById('galleryGrid').innerHTML = '';
      galSnap.forEach(d => renderGalleryCard({ id: d.id, ...d.data() }));
    }
  } catch(e) { console.error('Gallery load failed:', e); }

  try {
    const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));
    if (!newsSnap.empty) {
      document.getElementById('newsGrid').innerHTML = '';
      newsSnap.forEach(d => renderNewsCard({ id: d.id, ...d.data() }));
    }
  } catch(e) { console.error('News load failed:', e); }
}

// ── GALLERY UPLOAD ────────────────────────────────────────────────────────────

window.addPhotos = async function () {
  if (!window.pendingPhotos || !pendingPhotos.length) {
    alert('Please select at least one photo.'); return;
  }
  const caption    = document.getElementById('photoCaption').value.trim() || 'Gallery Photo';
  const cat        = document.getElementById('photoCategory').value;
  const catLabels  = { events:'Events', mentorship:'Mentorship', legal:'Legal Aid', community:'Community' };
  const submitBtn  = document.querySelector('#addPhotoPanel .add-submit');

  submitBtn.textContent = 'Uploading…';
  submitBtn.disabled    = true;

  try {
    for (const p of pendingPhotos) {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file',         p.file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder',        'guiding-light/gallery');

      const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Cloudinary error: ${res.status} ${res.statusText}`);
      const json = await res.json();

      const imageUrl  = json.secure_url;
      const publicId  = json.public_id;

      // 2. Save metadata to Firestore
      const docRef = await addDoc(collection(db, 'gallery'), {
        caption,
        category:      cat,
        categoryLabel: catLabels[cat],
        imageUrl,
        publicId,
        createdAt:     serverTimestamp()
      });

      // 3. Show in admin view immediately
      renderGalleryCard({
        id: docRef.id, caption, category: cat,
        categoryLabel: catLabels[cat], imageUrl, publicId
      });
    }

    window.pendingPhotos = [];
    document.getElementById('photoPreviews').innerHTML = '';
    document.getElementById('photoCaption').value      = '';
    document.getElementById('photoFileInput').value    = '';
    document.getElementById('addPhotoPanel').classList.remove('open');
    submitBtn.textContent = '✅ Photos Added!';
    setTimeout(() => { submitBtn.textContent = 'Add to Gallery'; submitBtn.disabled = false; }, 2000);

  } catch (err) {
    console.error('Upload failed:', err);
    alert('Upload failed: ' + err.message);
    submitBtn.textContent = 'Add to Gallery';
    submitBtn.disabled    = false;
  }
};

// ── GALLERY DELETE ────────────────────────────────────────────────────────────

window.deleteGalleryItem = async function (e, btn) {
  e.stopPropagation();
  const item     = btn.closest('.gal-item');
  const docId    = item?.dataset.docId;
  if (!item || !confirm('Remove this photo permanently?')) return;
  try {
    if (docId) await deleteDoc(doc(db, 'gallery', docId));
    // Note: Cloudinary deletion from browser requires a signed request (backend).
    // The image URL will become a dead link — to fully delete from Cloudinary,
    // do it manually in the Cloudinary Media Library.
    item.remove();
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Delete failed: ' + err.message);
  }
};

// ── NEWS POST ─────────────────────────────────────────────────────────────────

window.addNews = async function () {
  const headlineEl = document.getElementById('newsHeadline');
  const catEl      = document.getElementById('newsCategory');
  const dateEl     = document.getElementById('newsDate');
  const contentEl  = document.getElementById('newsContent');
  const panelEl    = document.getElementById('addNewsPanel');
  const submitBtn  = panelEl.querySelector('button[onclick="addNews()"]');

  const headline = headlineEl.value.trim();
  const content  = contentEl.value.trim();
  const cat      = catEl.value;
  const dateVal  = dateEl?.value || '';

  if (!headline) { headlineEl.style.borderColor = 'var(--red)'; headlineEl.focus(); return; }
  headlineEl.style.borderColor = '';
  if (!content)  { contentEl.style.borderColor  = 'var(--red)'; contentEl.focus();  return; }
  contentEl.style.borderColor  = '';

  const tagClass    = { event:'tag-event', milestone:'tag-milestone', partnership:'tag-partnership', urgent:'tag-urgent' };
  const tagLabel    = { event:'Event', milestone:'Milestone', partnership:'Partnership', urgent:'Urgent' };
  const displayDate = dateVal
    ? new Date(dateVal + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  submitBtn.textContent = 'Publishing…';
  submitBtn.disabled    = true;

  try {
    const docRef = await addDoc(collection(db, 'news'), {
      headline, content, category: cat,
      tagClass:     tagClass[cat] || 'tag-event',
      tagLabel:     tagLabel[cat] || 'News',
      displayDate,
      createdAt:    serverTimestamp()
    });

    renderNewsCard({
      id: docRef.id, headline, content,
      tagClass: tagClass[cat], tagLabel: tagLabel[cat], displayDate
    });

    headlineEl.value = ''; contentEl.value = '';
    if (dateEl) dateEl.value = '';
    const sEl = document.getElementById('newsSummaryShort'); if (sEl) sEl.value = '';
    panelEl.classList.remove('open');
    submitBtn.textContent = '✅ Published!';
    setTimeout(() => { submitBtn.textContent = 'Publish News'; submitBtn.disabled = false; }, 2000);

  } catch (err) {
    console.error('Publish failed:', err);
    alert('Publish failed: ' + err.message);
    submitBtn.textContent = 'Publish News';
    submitBtn.disabled    = false;
  }
};

// ── NEWS DELETE ───────────────────────────────────────────────────────────────

window.deleteNewsCard = async function (btn) {
  const card  = btn.closest('.news-card');
  const docId = card?.dataset.docId;
  if (!card || !confirm('Delete this news item permanently?')) return;
  try {
    if (docId) await deleteDoc(doc(db, 'news', docId));
    card.remove();
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Delete failed: ' + err.message);
  }
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadAdminData);
