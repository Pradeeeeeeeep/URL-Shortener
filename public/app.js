// Configuration
const API_BASE_URL = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  ? 'http://127.0.0.1:8000'
  : window.location.origin;

// Local storage key
const STORAGE_KEY = 'pingalo_shortened_links';

// State
let links = loadSavedLinks();

// DOM Elements
const shortenForm = document.getElementById('shortenForm');
const originalUrlInput = document.getElementById('originalUrlInput');
const expirySelect = document.getElementById('expirySelect');
const shortenBtn = document.getElementById('shortenBtn');
const featuredContainer = document.getElementById('featuredCardContainer');
const linksList = document.getElementById('linksList');
const emptyState = document.getElementById('emptyState');
const refreshStatsBtn = document.getElementById('refreshStatsBtn');

// KPI elements
const kpiTotalLinks = document.getElementById('kpiTotalLinks');
const kpiTotalClicks = document.getElementById('kpiTotalClicks');
const kpiAddedMonth = document.getElementById('kpiAddedMonth');
const kpiActiveLinks = document.getElementById('kpiActiveLinks');

// Modal elements
const statsDialog = document.getElementById('statsDialog');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalStatsContent = document.getElementById('modalStatsContent');
const toastContainer = document.getElementById('toastContainer');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  renderLinks();
  updateKPIs();
  syncAllStats();
});

// Event Listeners
shortenForm.addEventListener('submit', handleShortenSubmit);
refreshStatsBtn.addEventListener('click', () => {
  syncAllStats(true);
});

closeModalBtn.addEventListener('click', () => {
  statsDialog.close();
});

statsDialog.addEventListener('click', (e) => {
  if (e.target === statsDialog) {
    statsDialog.close();
  }
});

// Load links from localStorage
function loadSavedLinks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading localStorage:', e);
  }
  return [];
}

// Save links to localStorage
function saveLinks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }
}

// Handle URL Shortening
async function handleShortenSubmit(e) {
  e.preventDefault();
  let url = originalUrlInput.value.trim();
  if (!url) return;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Calculate expiration date
  const expiryVal = expirySelect.value;
  let expiresAt = null;
  if (expiryVal !== 'never') {
    const days = parseInt(expiryVal, 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    expiresAt = d.toISOString();
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}/urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_url: url,
        expires_at: expiresAt,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to shorten URL');
    }

    const data = await response.json();
    const shortUrl = `${API_BASE_URL}/${data.short_code}`;

    const newLink = {
      id: data.id,
      short_code: data.short_code,
      short_url: shortUrl,
      original_url: data.original_url,
      created_at: data.created_at || new Date().toISOString(),
      expires_at: data.expires_at,
      click_count: data.click_count || 0,
      title: extractDomainName(data.original_url),
    };

    // Add to links list (prevent duplicate codes)
    links = [newLink, ...links.filter(item => item.short_code !== newLink.short_code)];
    saveLinks();

    // Reset input
    originalUrlInput.value = '';

    // Show featured card right below input
    renderFeaturedCard(newLink);

    // Refresh list and KPIs
    renderLinks();
    updateKPIs();
    showToast('Short link created successfully!', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Unable to connect to backend server', 'error');
  } finally {
    setLoading(false);
  }
}

// Render Featured Card
function renderFeaturedCard(link) {
  featuredContainer.classList.remove('hidden');
  featuredContainer.innerHTML = createLinkCardHtml(link, true);
  attachCardEvents(featuredContainer);
}

// Render Links List
function renderLinks() {
  if (links.length === 0) {
    linksList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  linksList.innerHTML = links.map(link => createLinkCardHtml(link, false)).join('');
  attachCardEvents(linksList);
}

// Generate Card HTML
function createLinkCardHtml(link, isFeatured = false) {
  const shortDisplay = `${link.short_code}`;
  const isExpired = link.expires_at && new Date(link.expires_at) <= new Date();

  return `
    <div class="link-card" data-code="${link.short_code}" data-url="${link.short_url || `${API_BASE_URL}/${link.short_code}`}">
      <div class="link-destination">
        <span class="dest-title" title="${escapeHtml(link.title || link.original_url)}">
          ${escapeHtml(link.title || extractDomainName(link.original_url))}
        </span>
        <a href="${escapeHtml(link.original_url)}" target="_blank" rel="noopener noreferrer" class="dest-url" title="${escapeHtml(link.original_url)}">
          # ${escapeHtml(truncate(link.original_url, 45))}
        </a>
      </div>

      <div class="link-short-wrapper">
        <a href="${link.short_url || `${API_BASE_URL}/${link.short_code}`}" target="_blank" rel="noopener noreferrer" class="short-link-anchor">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>${escapeHtml(shortDisplay)}</span>
        </a>
      </div>

      <div class="card-actions">
        <button type="button" class="action-pill-btn btn-copy" title="Copy to clipboard">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>

        <button type="button" class="action-pill-btn btn-stats" title="View click statistics">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Statistics</span>
        </button>

        <button type="button" class="action-pill-btn btn-share" title="Share link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
          <span>Share</span>
        </button>

        <button type="button" class="action-pill-btn btn-delete" title="Remove link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// Attach Action Button Events
function attachCardEvents(parentContainer) {
  // Copy
  parentContainer.querySelectorAll('.btn-copy').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('.link-card');
      const shortUrl = card.getAttribute('data-url');
      copyToClipboard(shortUrl, btn);
    };
  });

  // Statistics
  parentContainer.querySelectorAll('.btn-stats').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('.link-card');
      const shortCode = card.getAttribute('data-code');
      showStatsModal(shortCode);
    };
  });

  // Share
  parentContainer.querySelectorAll('.btn-share').forEach(btn => {
    btn.onclick = async () => {
      const card = btn.closest('.link-card');
      const shortUrl = card.getAttribute('data-url');
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Shortened Link',
            url: shortUrl,
          });
        } catch (e) {
          // user cancelled or share failed
        }
      } else {
        copyToClipboard(shortUrl, btn);
        showToast('Link copied to clipboard for sharing!', 'success');
      }
    };
  });

  // Delete
  parentContainer.querySelectorAll('.btn-delete').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('.link-card');
      const shortCode = card.getAttribute('data-code');
      links = links.filter(l => l.short_code !== shortCode);
      saveLinks();
      renderLinks();
      updateKPIs();
      if (featuredContainer.querySelector(`[data-code="${shortCode}"]`)) {
        featuredContainer.classList.add('hidden');
        featuredContainer.innerHTML = '';
      }
      showToast('Link removed from dashboard', 'success');
    };
  });
}

// Copy to Clipboard Helper
async function copyToClipboard(text, triggerBtn) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied link to clipboard!', 'success');
    if (triggerBtn) {
      const span = triggerBtn.querySelector('span');
      if (span) {
        const orig = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(() => { span.textContent = orig; }, 1800);
      }
    }
  } catch (err) {
    // Fallback for older browsers
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast('Copied link to clipboard!', 'success');
  }
}

// Show Stats Modal
async function showStatsModal(shortCode) {
  statsDialog.showModal();
  modalStatsContent.innerHTML = '<div style="text-align:center; padding: 24px; color: #64748B;">Fetching live analytics...</div>';

  try {
    const res = await fetch(`${API_BASE_URL}/urls/${shortCode}`);
    if (!res.ok) {
      throw new Error('Link not found or failed to load stats');
    }
    const data = await res.json();

    // Update locally stored click count
    const idx = links.findIndex(l => l.short_code === shortCode);
    if (idx !== -1) {
      links[idx].click_count = data.click_count;
      saveLinks();
      updateKPIs();
    }

    const createdStr = data.created_at ? new Date(data.created_at).toLocaleString() : 'N/A';
    const expiresStr = data.expires_at ? new Date(data.expires_at).toLocaleString() : 'Never';
    const statusHtml = data.is_expired
      ? '<span style="color: #EF4444; font-weight:700;">Expired</span>'
      : '<span style="color: #10B981; font-weight:700;">Active</span>';

    modalStatsContent.innerHTML = `
      <div class="stats-detail-grid">
        <div class="stat-box">
          <div class="stat-box-val">${data.click_count || 0}</div>
          <div class="stat-box-lbl">Total Clicks</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-val">${statusHtml}</div>
          <div class="stat-box-lbl">Link Status</div>
        </div>
      </div>

      <div class="stat-info-row">
        <span class="lbl">Short Code:</span>
        <span class="val">${escapeHtml(data.short_code)}</span>
      </div>
      <div class="stat-info-row">
        <span class="lbl">Direct Link:</span>
        <a href="${API_BASE_URL}/${data.short_code}" target="_blank" class="val" style="color: #E24A2B;">${API_BASE_URL}/${data.short_code}</a>
      </div>
      <div class="stat-info-row">
        <span class="lbl">Destination:</span>
        <span class="val" style="max-width: 250px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${escapeHtml(data.original_url)}</span>
      </div>
      <div class="stat-info-row">
        <span class="lbl">Created:</span>
        <span class="val">${createdStr}</span>
      </div>
      <div class="stat-info-row">
        <span class="lbl">Expires:</span>
        <span class="val">${expiresStr}</span>
      </div>
    `;
  } catch (err) {
    modalStatsContent.innerHTML = `<div style="color: #EF4444; text-align:center; padding: 20px;">${escapeHtml(err.message)}</div>`;
  }
}

// Sync all stats in background
async function syncAllStats(notify = false) {
  if (links.length === 0) {
    if (notify) showToast('No links to sync', 'success');
    return;
  }

  let updated = false;
  for (const link of links) {
    try {
      const res = await fetch(`${API_BASE_URL}/urls/${link.short_code}`);
      if (res.ok) {
        const data = await res.json();
        if (link.click_count !== data.click_count) {
          link.click_count = data.click_count;
          updated = true;
        }
      }
    } catch (e) {
      // ignore individual sync errors
    }
  }

  if (updated) {
    saveLinks();
    updateKPIs();
  }

  if (notify) {
    showToast('Analytics synced with backend!', 'success');
  }
}

// Update KPI Stats Cards
function updateKPIs() {
  const total = links.length;
  const totalClicks = links.reduce((sum, item) => sum + (item.click_count || 0), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = links.filter(item => {
    if (!item.created_at) return true;
    const d = new Date(item.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const active = links.filter(item => {
    if (!item.expires_at) return true;
    return new Date(item.expires_at) > now;
  }).length;

  kpiTotalLinks.textContent = total;
  kpiTotalClicks.textContent = totalClicks;
  kpiAddedMonth.textContent = thisMonth;
  kpiActiveLinks.textContent = active;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2600);
}

function setLoading(isLoading) {
  if (isLoading) {
    shortenBtn.classList.add('loading');
    shortenBtn.disabled = true;
    shortenBtn.querySelector('.btn-text').textContent = 'Shortening...';
  } else {
    shortenBtn.classList.remove('loading');
    shortenBtn.disabled = false;
    shortenBtn.querySelector('.btn-text').textContent = 'Shorten';
  }
}

// Helper Utilities
function extractDomainName(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    const path = parsed.pathname !== '/' ? parsed.pathname.slice(0, 16) : '';
    return `${capitalize(host.split('.')[0])} ${path ? '| ' + path : ''}`;
  } catch (e) {
    return url;
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(str, maxLen = 40) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
