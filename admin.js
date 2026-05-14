// admin.js — Firebase write logic for gallery and news
// Imported by admin.html only

import { db, storage } from './firebase.js';
import {
  collection, addDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── GALLERY UPLOAD ────────────────────────────────────────────────────────────
// Call this instead of the old addPhotos() function
window.addPhotos = async function () {
  if (!pendingPhotos.length) { alert('Please select at least one photo.'); return; }

  const caption  = document.getElementById('photoCaption').value.trim() || 'Gallery Photo';
  const cat      = document.getElementById('photoCategory').value;
  const catLabels = { events:'Events', mentorship:'Mentorship', legal:'Legal Aid', community:'Community' };
  const submitBtn = document.querySelector('#addPhotoPanel .add-submit');

  submitBtn.textContent = 'Uploading…';
  submitBtn.disabled = true;

  try {
    for (const p of pendingPhotos) {
      // 1. Upload file to Firebase Storage
      const fileName  = `gallery/${Date.now()}_${p.file.name}`;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, p.file);

      const downloadURL = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, async () => {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        });
      });

      // 2. Save metadata to Firestore
      const docRef = await addDoc(collection(db, 'gallery'), {
        caption,
        category: cat,
        categoryLabel: catLabels[cat],
        imageUrl: downloadURL,
        storagePath: fileName,
        createdAt: serverTimestamp()
      });

      // 3. Render the card immediately in admin view (with delete button)
      renderGalleryCard({ id: docRef.id, caption, category: cat,
        categoryLabel: catLabels[cat], imageUrl: downloadURL, storagePath: fileName });
    }

    // Reset form
    pendingPhotos = [];
    document.getElementById('photoPreviews').innerHTML = '';
    document.getElementById('photoCaption').value = '';
    document.getElementById('photoFileInput').value = '';
    document.getElementById('addPhotoPanel').classList.remove('open');
    submitBtn.textContent = '✅ Photos Added!';
    setTimeout(() => { submitBtn.textContent = 'Add to Gallery'; submitBtn.disabled = false; }, 2000);

  } catch (err) {
    console.error('Upload failed:', err);
    alert('Upload failed: ' + err.message);
    submitBtn.textContent = 'Add to Gallery';
    submitBtn.disabled = false;
  }
};

// Render a gallery card (used on load + after upload)
function renderGalleryCard(data) {
  const grid = document.getElementById('galleryGrid');
  const item = document.createElement('div');
  item.className = 'gal-item';
  item.dataset.cat = data.category;
  item.dataset.docId = data.id;
  item.dataset.storagePath = data.storagePath || '';
  item.setAttribute('onclick', 'openLightbox(this)');
  item.innerHTML =
    `<img src="${data.imageUrl}" alt="${data.caption}">` +
    `<span class="gal-cat-badge">${data.categoryLabel}</span>` +
    `<div class="gal-overlay"><span class="gal-caption">${data.caption}</span></div>` +
    `<button class="gal-delete-btn" onclick="deleteGalleryItem(event,this)" title="Delete photo">×</button>`;
  grid.prepend(item);
}

// ── GALLERY DELETE ────────────────────────────────────────────────────────────
window.deleteGalleryItem = async function (e, btn) {
  e.stopPropagation();
  const item = btn.closest('.gal-item');
  if (!item) return;
  if (!confirm('Remove this photo permanently?')) return;

  const docId      = item.dataset.docId;
  const storagePath = item.dataset.storagePath;

  try {
    // Delete from Firestore
    if (docId) await deleteDoc(doc(db, 'gallery', docId));
    // Delete from Storage
    if (storagePath) await deleteObject(ref(storage, storagePath));
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
  const dateVal  = dateEl ? dateEl.value : '';

  if (!headline) { headlineEl.style.borderColor = 'var(--red)'; headlineEl.focus(); return; }
  headlineEl.style.borderColor = '';
  if (!content)  { contentEl.style.borderColor  = 'var(--red)'; contentEl.focus();  return; }
  contentEl.style.borderColor = '';

  const tagClass = { event:'tag-event', milestone:'tag-milestone', partnership:'tag-partnership', urgent:'tag-urgent' };
  const tagLabel = { event:'Event', milestone:'Milestone', partnership:'Partnership', urgent:'Urgent' };
  const displayDate = dateVal
    ? new Date(dateVal + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  submitBtn.textContent = 'Publishing…';
  submitBtn.disabled = true;

  try {
    const docRef = await addDoc(collection(db, 'news'), {
      headline,
      content,
      category: cat,
      tagClass: tagClass[cat] || 'tag-event',
      tagLabel: tagLabel[cat] || 'News',
      displayDate,
      createdAt: serverTimestamp()
    });

    // Render immediately in admin view
    renderNewsCard({ id: docRef.id, headline, content,
      tagClass: tagClass[cat], tagLabel: tagLabel[cat], displayDate });

    // Reset form
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
    submitBtn.disabled = false;
  }
};

// Render a news card (used on load + after post)
function renderNewsCard(data) {
  const grid = document.getElementById('newsGrid');
  const card = document.createElement('div');
  card.className = 'news-card';
  card.style.cssText = 'animation:slideUp 0.35s ease; position:relative;';
  card.dataset.docId = data.id;
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

// ── LOAD EXISTING DATA ON ADMIN PAGE ─────────────────────────────────────────
import {
  getDocs, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function loadAdminData() {
  // Load gallery
  const galSnap = await getDocs(query(collection(db, 'gallery'), orderBy('createdAt', 'desc')));
  galSnap.forEach(d => renderGalleryCard({ id: d.id, ...d.data() }));

  // Load news
  const newsSnap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc')));
  newsSnap.forEach(d => renderNewsCard({ id: d.id, ...d.data() }));
}

// Run after DOM is ready
document.addEventListener('DOMContentLoaded', loadAdminData);
