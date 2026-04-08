const detailType = document.body.dataset.detailType;
const detailContent = document.getElementById("detailContent");
const relatedGrid = document.getElementById("relatedGrid");
const historyList = document.getElementById("historyList");
const counterpartSelect = document.getElementById("counterpartSelect");
const requesterName = document.getElementById("requesterName");
const requesterPhone = document.getElementById("requesterPhone");
const requesterEmail = document.getElementById("requesterEmail");
const requesterRole = document.getElementById("requesterRole");
const matchForm = document.getElementById("matchForm");
const matchStatus = document.getElementById("matchStatus");
const detailSessionNote = document.getElementById("detailSessionNote");
const params = new URLSearchParams(window.location.search);
const detailId = params.get("id");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function renderHistory(items, labelKey) {
  if (!items.length) {
    historyList.innerHTML = "";
    return;
  }

  historyList.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Recent Match Activity</p>
        <h2>Requests connected to this ${detailType}.</h2>
      </div>
    </div>
    <div class="mini-list">
      ${items
        .map(
          (item) => `
            <article class="mini-item">
              <div class="mini-item-head">
                <strong>${item[labelKey]}</strong>
                <span class="status-chip">${item.status}</span>
              </div>
              <p>${item.requester_name} (${item.requester_role})</p>
              <p>${item.notes || "No extra notes provided."}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLandDetail(payload) {
  const listing = payload.listing;
  detailContent.innerHTML = `
    <p class="eyebrow">Land Detail</p>
    <h1>${listing.title}</h1>
    <p>${listing.location}</p>
    <p>${listing.summary}</p>
    <div class="detail-facts">
      <div class="fact-card">${listing.acres} acres</div>
      <div class="fact-card">Trust ${listing.trust_score}</div>
      <div class="fact-card">Soil: ${listing.soil}</div>
      <div class="fact-card">Irrigation: ${listing.irrigation}</div>
      <div class="fact-card">Best for: ${listing.best_for}</div>
      <div class="fact-card">Crops: ${listing.crops}</div>
    </div>
  `;

  if (payload.recommendedTenants.length === 0) {
    counterpartSelect.innerHTML = `<option value="">No tenants available</option>`;
    relatedGrid.innerHTML = `<article class="feature-card"><p>No recommended tenants are available right now.</p></article>`;
  } else {
    counterpartSelect.innerHTML = payload.recommendedTenants
      .map((tenant) => `<option value="${tenant.id}">${tenant.name} | ${tenant.base_location} | ${tenant.rating}/5</option>`)
      .join("");

    relatedGrid.innerHTML = payload.recommendedTenants
      .map(
        (tenant) => `
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
            <a class="button button-secondary button-small" href="/tenant.html?id=${tenant.id}">Open Tenant Detail</a>
          </article>
        `
      )
      .join("");
  }

  renderHistory(payload.recentMatches, "tenant_name");
}

function renderTenantDetail(payload) {
  const tenant = payload.tenant;
  detailContent.innerHTML = `
    <p class="eyebrow">Tenant Detail</p>
    <h1>${tenant.name}</h1>
    <p>${tenant.base_location}</p>
    <p>${tenant.bio}</p>
    <div class="detail-facts">
      <div class="fact-card">${tenant.experience_years} years experience</div>
      <div class="fact-card">Rating ${tenant.rating}/5</div>
      <div class="fact-card">Availability: ${tenant.availability}</div>
      <div class="fact-card">Specializations: ${tenant.specializations}</div>
      <div class="fact-card">Lease interest: ${tenant.lease_interest}</div>
      <div class="fact-card">Verified KINTA profile</div>
    </div>
  `;

  if (payload.recommendedLands.length === 0) {
    counterpartSelect.innerHTML = `<option value="">No land available</option>`;
    relatedGrid.innerHTML = `<article class="feature-card"><p>No recommended land listings are available right now.</p></article>`;
  } else {
    counterpartSelect.innerHTML = payload.recommendedLands
      .map((land) => `<option value="${land.id}">${land.title} | ${land.location} | Trust ${land.trust_score}</option>`)
      .join("");

    relatedGrid.innerHTML = payload.recommendedLands
      .map(
        (land) => `
          <article class="market-card">
            <div class="market-card-head">
              <div>
                <h3>${land.title}</h3>
                <p class="meta-line">${land.location}</p>
              </div>
              <span class="card-tag">Trust ${land.trust_score}</span>
            </div>
            <p>${land.summary}</p>
            <div class="market-points">
              <span>${land.acres} acres</span>
              <span>Soil: ${land.soil}</span>
              <span>Irrigation: ${land.irrigation}</span>
            </div>
            <a class="button button-secondary button-small" href="/land.html?id=${land.id}">Open Land Detail</a>
          </article>
        `
      )
      .join("");
  }

  renderHistory(payload.recentMatches, "land_title");
}

async function loadSession() {
  const session = await fetchJson("/api/auth/session");
  if (!session.authenticated || !session.user) {
    detailSessionNote.textContent = "Sign in from the accounts page if you want this match form prefilled automatically.";
    return;
  }

  const user = session.user;
  requesterName.value = user.name;
  requesterPhone.value = user.phone;
  requesterEmail.value = user.email;
  requesterRole.value = user.role;
  detailSessionNote.textContent = `Signed in as ${user.name} (${user.role}).`;
}

matchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  matchStatus.textContent = "Submitting match request...";

  const formData = Object.fromEntries(new FormData(matchForm).entries());
  const payload =
    detailType === "land"
      ? {
          land_id: Number(detailId),
          tenant_id: Number(formData.counterpart_id),
          requester_name: formData.requester_name,
          requester_phone: formData.requester_phone,
          requester_email: formData.requester_email,
          requester_role: formData.requester_role,
          notes: formData.notes
        }
      : {
          land_id: Number(formData.counterpart_id),
          tenant_id: Number(detailId),
          requester_name: formData.requester_name,
          requester_phone: formData.requester_phone,
          requester_email: formData.requester_email,
          requester_role: formData.requester_role,
          notes: formData.notes
        };

  try {
    await fetchJson("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    matchStatus.textContent = "Match request submitted.";
    matchForm.reset();
    await loadSession();
  } catch (error) {
    matchStatus.textContent = error.message;
  }
});

async function loadDetail() {
  if (!detailId) {
    detailContent.innerHTML = `<p>Missing detail id.</p>`;
    return;
  }

  const endpoint = detailType === "land" ? `/api/lands/${detailId}` : `/api/tenants/${detailId}`;
  const payload = await fetchJson(endpoint);
  if (detailType === "land") {
    renderLandDetail(payload);
  } else {
    renderTenantDetail(payload);
  }
}

Promise.all([loadDetail(), loadSession()]).catch((error) => {
  detailContent.innerHTML = `<p>${error.message}</p>`;
});
