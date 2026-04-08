async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
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
      </div>
      <div class="market-footer">
        <div class="price-block">
          <strong>Rs. ${Number(listing.price).toLocaleString()}</strong>
          <span>per acre / season</span>
        </div>
        <a class="button button-secondary button-small" href="/land.html?id=${listing.id}">View Detail</a>
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
        <span>Rating: ${tenant.rating}/5</span>
      </div>
      <div class="tenant-footer">
        <div class="rating-block">
          <strong>${tenant.rating}/5</strong>
          <span>verified reputation</span>
        </div>
        <a class="button button-secondary button-small" href="/tenant.html?id=${tenant.id}">View Detail</a>
      </div>
    </article>
  `;
}

async function loadLanding() {
  const metricsContainer = document.getElementById("overviewMetrics");
  const featuredLandGrid = document.getElementById("featuredLandGrid");
  const featuredTenantGrid = document.getElementById("featuredTenantGrid");

  const [overview, landData, tenantData] = await Promise.all([
    fetchJson("/api/overview"),
    fetchJson("/api/lands"),
    fetchJson("/api/tenants")
  ]);

  const metricLabels = {
    landListings: "Active land listings",
    tenantProfiles: "Tenant profiles",
    activeMarkets: "Markets covered",
    registeredUsers: "Registered accounts",
    matchRequests: "Match requests",
    avgTrustScore: "Average trust score"
  };

  metricsContainer.innerHTML = Object.entries(overview.metrics)
    .map(
      ([key, value]) => `
        <article class="stats-card">
          <strong>${value}</strong>
          <span>${metricLabels[key]}</span>
        </article>
      `
    )
    .join("");

  featuredLandGrid.innerHTML = landData.listings.slice(0, 3).map(renderLandCard).join("");
  featuredTenantGrid.innerHTML = tenantData.tenants.slice(0, 3).map(renderTenantCard).join("");
}

loadLanding().catch(() => {
  const featuredLandGrid = document.getElementById("featuredLandGrid");
  const featuredTenantGrid = document.getElementById("featuredTenantGrid");
  featuredLandGrid.innerHTML = `<article class="feature-card"><p>Unable to load featured land right now.</p></article>`;
  featuredTenantGrid.innerHTML = `<article class="feature-card"><p>Unable to load featured tenant farmers right now.</p></article>`;
});
