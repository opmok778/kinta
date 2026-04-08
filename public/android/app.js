const overviewGrid = document.getElementById("overviewGrid");
const healthStatus = document.getElementById("healthStatus");
const landFeed = document.getElementById("landFeed");
const tenantFeed = document.getElementById("tenantFeed");
const sessionCard = document.getElementById("sessionCard");
const landSearch = document.getElementById("landSearch");
const tenantSearch = document.getElementById("tenantSearch");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");
const logoutButton = document.getElementById("logoutButton");

let allLands = [];
let allTenants = [];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function renderOverview(metrics) {
  const metricLabels = {
    landListings: "Active land",
    tenantProfiles: "Tenant profiles",
    activeMarkets: "Markets",
    registeredUsers: "Accounts",
    matchRequests: "Matches",
    avgTrustScore: "Avg trust"
  };

  overviewGrid.innerHTML = Object.entries(metrics)
    .map(
      ([key, value]) => `
        <article class="android-stat">
          <strong>${value}</strong>
          <span>${metricLabels[key] || key}</span>
        </article>
      `
    )
    .join("");
}

function renderLandFeed(listings) {
  landFeed.innerHTML = listings.length
    ? listings
        .map(
          (listing) => `
            <article class="android-card android-item-card">
              <div class="android-item-head">
                <div>
                  <h3>${listing.title}</h3>
                  <p class="android-meta">${listing.location}</p>
                </div>
                <span class="android-item-badge">Trust ${listing.trust_score}</span>
              </div>
              <p class="android-copy">${listing.summary}</p>
              <div class="android-facts">
                <div class="android-fact">${listing.acres} acres</div>
                <div class="android-fact">Rs. ${Number(listing.price).toLocaleString()}</div>
                <div class="android-fact">${listing.soil}</div>
                <div class="android-fact">${listing.best_for}</div>
              </div>
              <div class="android-card-actions">
                <a class="android-button android-button-primary android-button-small" href="/android/detail.html?type=land&id=${listing.id}">
                  Open
                </a>
                <a class="android-button android-button-secondary android-button-small" href="/android/detail.html?type=land&id=${listing.id}#match">
                  Match
                </a>
              </div>
            </article>
          `
        )
        .join("")
    : `
        <article class="android-card android-empty">
          <h3>No matching land listings</h3>
          <p>Try a broader search term or clear the filter.</p>
        </article>
      `;
}

function renderTenantFeed(tenants) {
  tenantFeed.innerHTML = tenants.length
    ? tenants
        .map(
          (tenant) => `
            <article class="android-card android-item-card">
              <div class="android-item-head">
                <div>
                  <h3>${tenant.name}</h3>
                  <p class="android-meta">${tenant.base_location}</p>
                </div>
                <span class="android-item-badge">${tenant.availability}</span>
              </div>
              <p class="android-copy">${tenant.bio}</p>
              <div class="android-facts">
                <div class="android-fact">${tenant.rating}/5 rating</div>
                <div class="android-fact">${tenant.experience_years} years</div>
                <div class="android-fact">${tenant.specializations}</div>
                <div class="android-fact">${tenant.lease_interest}</div>
              </div>
              <div class="android-card-actions">
                <a class="android-button android-button-primary android-button-small" href="/android/detail.html?type=tenant&id=${tenant.id}">
                  Open
                </a>
                <a class="android-button android-button-secondary android-button-small" href="/android/detail.html?type=tenant&id=${tenant.id}#match">
                  Match
                </a>
              </div>
            </article>
          `
        )
        .join("")
    : `
        <article class="android-card android-empty">
          <h3>No matching tenant profiles</h3>
          <p>Try a broader search term or clear the filter.</p>
        </article>
      `;
}

function renderSession(session) {
  if (!session.authenticated || !session.user) {
    sessionCard.innerHTML = `
      <h3>No active session</h3>
      <p class="android-copy">
        Sign in or create an account here so match requests can
        auto-fill your details.
      </p>
      <p class="android-card-subtle">Demo login: landowner@kinta.in / kinta123</p>
    `;
    return;
  }

  const user = session.user;
  sessionCard.innerHTML = `
    <h3>${user.name}</h3>
    <p class="android-copy">${user.role} from ${user.city}</p>
    <div class="android-facts">
      <div class="android-fact">${user.email}</div>
      <div class="android-fact">${user.phone}</div>
    </div>
    <a class="android-button android-button-primary" href="#lands">Start matching</a>
  `;
}

function filterLands() {
  const query = landSearch.value.trim().toLowerCase();
  if (!query) {
    renderLandFeed(allLands);
    return;
  }

  renderLandFeed(
    allLands.filter((listing) =>
      [listing.title, listing.location, listing.soil, listing.crops, listing.best_for, listing.summary]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  );
}

function filterTenants() {
  const query = tenantSearch.value.trim().toLowerCase();
  if (!query) {
    renderTenantFeed(allTenants);
    return;
  }

  renderTenantFeed(
    allTenants.filter((tenant) =>
      [tenant.name, tenant.base_location, tenant.specializations, tenant.lease_interest, tenant.availability, tenant.bio]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  );
}

async function loadSession() {
  try {
    const session = await fetchJson("/api/auth/session");
    renderSession(session);
  } catch (error) {
    renderSession({ authenticated: false });
  }
}

async function loadAppData() {
  const [overviewResult, landsResult, tenantsResult, healthResult] = await Promise.allSettled([
    fetchJson("/api/overview"),
    fetchJson("/api/lands"),
    fetchJson("/api/tenants"),
    fetchJson("/api/health")
  ]);

  if (overviewResult.status === "fulfilled") {
    renderOverview(overviewResult.value.metrics);
  } else {
    overviewGrid.innerHTML = `
      <article class="android-card android-empty">
        <h3>Overview unavailable</h3>
        <p>Live metrics could not be loaded right now.</p>
      </article>
    `;
  }

  if (landsResult.status === "fulfilled") {
    allLands = landsResult.value.listings;
    filterLands();
  } else {
    landFeed.innerHTML = `
      <article class="android-card android-empty">
        <h3>Land feed unavailable</h3>
        <p>Check your connection and try again.</p>
      </article>
    `;
  }

  if (tenantsResult.status === "fulfilled") {
    allTenants = tenantsResult.value.tenants;
    filterTenants();
  } else {
    tenantFeed.innerHTML = `
      <article class="android-card android-empty">
        <h3>Tenant feed unavailable</h3>
        <p>Check your connection and try again.</p>
      </article>
    `;
  }

  healthStatus.textContent = healthResult.status === "fulfilled" ? "Service online" : "Offline";
}

landSearch.addEventListener("input", filterLands);
tenantSearch.addEventListener("input", filterTenants);

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing in...";

  try {
    await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries()))
    });
    loginStatus.textContent = "Signed in successfully.";
    await loadSession();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.textContent = "Creating account...";

  try {
    await fetchJson("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(registerForm).entries()))
    });
    registerStatus.textContent = "Account created and signed in.";
    registerForm.reset();
    await loadSession();
  } catch (error) {
    registerStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await fetchJson("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    loginStatus.textContent = "Logged out.";
    await loadSession();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

Promise.all([loadAppData(), loadSession()]).catch(() => {
  healthStatus.textContent = "Unavailable";
});
