const landGrid = document.getElementById("landGrid");
const tenantGrid = document.getElementById("tenantGrid");
const landFilterForm = document.getElementById("landFilterForm");
const tenantFilterForm = document.getElementById("tenantFilterForm");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function buildQueryString(formData) {
  const query = new URLSearchParams();
  Object.entries(formData).forEach(([key, value]) => {
    if (String(value).trim() !== "") {
      query.set(key, value);
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function renderLandCard(listing) {
  return `
    <article class="market-card">
      <div class="market-card-head">
        <div>
          <h3>${listing.title}</h3>
          <p class="meta-line">${listing.location}</p>
        </div>
        <span class="card-tag">Trust ${listing.trust_score}</span>
      </div>
      <p>${listing.summary}</p>
      <div class="market-points">
        <span>${listing.acres} acres</span>
        <span>Soil: ${listing.soil}</span>
        <span>Irrigation: ${listing.irrigation}</span>
        <span>Best for: ${listing.best_for}</span>
        <span>Crops: ${listing.crops}</span>
      </div>
      <div class="market-footer">
        <div class="price-block">
          <strong>Rs. ${Number(listing.price).toLocaleString()}</strong>
          <span>per acre / season</span>
        </div>
        <div class="mini-item-actions">
          <a class="button button-secondary button-small" href="/land.html?id=${listing.id}">View Detail</a>
          <a class="button button-secondary button-small" href="/land.html?id=${listing.id}#match">Request Match</a>
        </div>
      </div>
    </article>
  `;
}

function renderTenantCard(tenant) {
  return `
    <article class="tenant-card">
      <div class="tenant-card-head">
        <div>
          <h3>${tenant.name}</h3>
          <p class="meta-line">${tenant.base_location}</p>
        </div>
        <span class="tenant-status">${tenant.availability}</span>
      </div>
      <p>${tenant.bio}</p>
      <div class="tenant-points">
        <span>Specializations: ${tenant.specializations}</span>
        <span>Experience: ${tenant.experience_years} years</span>
        <span>Lease interest: ${tenant.lease_interest}</span>
      </div>
      <div class="tenant-footer">
        <div class="rating-block">
          <strong>${tenant.rating}/5</strong>
          <span>verified reputation</span>
        </div>
        <div class="mini-item-actions">
          <a class="button button-secondary button-small" href="/tenant.html?id=${tenant.id}">View Detail</a>
          <a class="button button-secondary button-small" href="/tenant.html?id=${tenant.id}#match">Connect</a>
        </div>
      </div>
    </article>
  `;
}

async function loadLands(formData = {}) {
  const data = await fetchJson(`/api/lands${buildQueryString(formData)}`);
  landGrid.innerHTML = data.listings.length
    ? data.listings.map(renderLandCard).join("")
    : `<article class="feature-card"><p>No land listings matched that filter.</p></article>`;
}

async function loadTenants(formData = {}) {
  const data = await fetchJson(`/api/tenants${buildQueryString(formData)}`);
  tenantGrid.innerHTML = data.tenants.length
    ? data.tenants.map(renderTenantCard).join("")
    : `<article class="feature-card"><p>No tenant profiles matched that filter.</p></article>`;
}

landFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadLands(Object.fromEntries(new FormData(landFilterForm).entries()));
});

tenantFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadTenants(Object.fromEntries(new FormData(tenantFilterForm).entries()));
});

Promise.all([loadLands(), loadTenants()]).catch(() => {
  landGrid.innerHTML = `<article class="feature-card"><p>Unable to load land listings right now.</p></article>`;
  tenantGrid.innerHTML = `<article class="feature-card"><p>Unable to load tenant profiles right now.</p></article>`;
});
