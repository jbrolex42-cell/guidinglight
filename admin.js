// admin.js — Supabase write logic for gallery and news
// <script type="module" src="admin.js"></script> in admin.html

import { supabase } from './supabase.js';

const BUCKET = 'gallery';

// ── RENDER HELPERS ────────────────────────────────────────────────────────────

function renderGalleryCard(data) {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const item = document.createElement('div');
  item.className     = 'gal-item';
  item.dataset.cat   = data.category;
  item.dataset.docId = data.id;
  item.setAttribute('onclick', 'openLightbox(this)');
  item.innerHTML =
    `<img src="${data.image_url}" alt="${data.caption}" loading="lazy">` +
    `<span class="gal-cat-badge">${data.category_label}</span>` +
    `<div class="gal-overlay"><span class="gal-caption">${data.caption}</span></div>` +
    `<button class="gal-delete-btn" onclick="deleteGalleryItem(event,this)" title="Delete photo">×</button>`;
  grid.prepend(item);
}

function renderNewsCard(data) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const card = document.createElement('div');
  card.className     = 'news-card';
  card.style.cssText = 'animation:slideUp 0.35s ease; position:relative;';
  card.dataset.docId = data.id;
  card.innerHTML =
    `<div class="news-meta">
      <span class="news-tag ${data.tag_class}">${data.tag_label}</span>
      <span class="news-date">${data.display_date}</span>
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
  // Gallery
  const { data: galData, error: galErr } = await supabase
    .from('gallery')
    .select('*')
    .order('created_at', { ascending: false });

  if (galErr) { console.error('Gallery load failed:', galErr); }
  else if (galData?.length) {
    document.getElementById('galleryGrid').innerHTML = '';
    galData.forEach(row => renderGalleryCard(row));
  }

  // News
  const { data: newsData, error: newsErr } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (newsErr) { console.error('News load failed:', newsErr); }
  else if (newsData?.length) {
    document.getElementById('newsGrid').innerHTML = '';
    newsData.forEach(row => renderNewsCard(row));
  }
}

// ── GALLERY UPLOAD ────────────────────────────────────────────────────────────

window.addPhotos = async function () {
  if (!window.pendingPhotos?.length) {
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
      // 1. Upload file to Supabase Storage
      const ext      = p.file.name.split('.').pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, p.file, { contentType: p.file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;

      // 3. Save metadata to Supabase DB
      const { data: row, error: dbErr } = await supabase
        .from('gallery')
        .insert({
          caption,
          category:       cat,
          category_label: catLabels[cat],
          image_url:      imageUrl,
          file_path:      filePath
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      // 4. Show in admin immediately
      renderGalleryCard(row);
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
    alert('Upload failed: ' + (err.message || JSON.stringify(err)));
    submitBtn.textContent = 'Add to Gallery';
    submitBtn.disabled    = false;
  }
};

// ── GALLERY DELETE ────────────────────────────────────────────────────────────

window.deleteGalleryItem = async function (e, btn) {
  e.stopPropagation();
  const item  = btn.closest('.gal-item');
  const docId = item?.dataset.docId;
  if (!item || !confirm('Remove this photo permanently?')) return;

  try {
    // Get file_path before deleting row
    const { data: row } = await supabase
      .from('gallery').select('file_path').eq('id', docId).single();

    // Delete from DB
    const { error: dbErr } = await supabase
      .from('gallery').delete().eq('id', docId);
    if (dbErr) throw dbErr;

    // Delete from Storage
    if (row?.file_path) {
      await supabase.storage.from(BUCKET).remove([row.file_path]);
    }

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

  const tagClassMap = { event:'tag-event', milestone:'tag-milestone', partnership:'tag-partnership', urgent:'tag-urgent' };
  const tagLabelMap = { event:'Event', milestone:'Milestone', partnership:'Partnership', urgent:'Urgent' };
  const displayDate = dateVal
    ? new Date(dateVal + 'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  submitBtn.textContent = 'Publishing…';
  submitBtn.disabled    = true;

  try {
    const { data: row, error } = await supabase
      .from('news')
      .insert({
        headline, content, category: cat,
        tag_class:    tagClassMap[cat] || 'tag-event',
        tag_label:    tagLabelMap[cat] || 'News',
        display_date: displayDate
      })
      .select()
      .single();

    if (error) throw error;

    renderNewsCard(row);

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
    const { error } = await supabase.from('news').delete().eq('id', docId);
    if (error) throw error;
    card.remove();
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Delete failed: ' + err.message);
  }
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadAdminData);
