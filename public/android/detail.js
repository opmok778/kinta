const params = new URLSearchParams(window.location.search);
const detailType = params.get("type");
const detailId = params.get("id");
const detailCard = document.getElementById("detailCard");
const sessionNote = document.getElementById("sessionNote");
const matchForm = document.getElementById("matchForm");
const counterpartLabel = document.getElementById("counterpartLabel");
const counterpartSelect = document.getElementById("counterpartSelect");
const requesterName = document.getElementById("requesterName");
const requesterPhone = document.getElementById("requesterPhone");
const requesterEmail = document.getElementById("requesterEmail");
const requesterRole = document.getElementById("requesterRole");
const matchStatus = document.getElementById("matchStatus");
const relatedHeading = document.getElementById("relatedHeading");
const relatedFeed = document.getElementById("relatedFeed");
const historyFeed = document.getElementById("historyFeed");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function renderHistory(items, labelKey) {
  historyFeed.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="android-card android-item-card">
              <div class="android-item-head">
                <strong>${item[labelKey]}</strong>
                <span class="android-item-badge">${item.status}</span>
              </div>
              <p class="android-copy">${item.requester_name} (${item.requester_role})</p>
              <p class="android-copy">${item.notes || "No additional notes provided."}</p>
            </article>
          `
        )
        .join("")
    : `
        <article class="android-card android-empty">
          <h3>No recent activity</h3>
          <p>This record has no recent match requests yet.</p>
        </article>
      `;
}

function renderLandDetail(payload) {
  const listing = payload.listing;
  document.title = `${listing.title} | KINTA`;
  counterpartLabel.textContent = "Select tenant farmer";
  relatedHeading.textContent = "Suggested tenant farmers";
  detailCard.innerHTML = `
    <p class="eyebrow">Land Detail</p>
    <h1>${listing.title}</h1>
    <p class="android-copy">${listing.location}</p>
    <p class="android-copy">${listing.summary}</p>
    <div class="android-facts">
      <div class="android-fact">${listing.acres} acres</div>
      <div class="android-fact">Trust ${listing.trust_score}</div>
      <div class="android-fact">Rs. ${Number(listing.price).toLocaleString()}</div>
      <div class="android-fact">${listing.irrigation}</div>
      <div class="android-fact">${listing.soil}</div>
      <div class="android-fact">${listing.crops}</div>
    </div>
  `;

  counterpartSelect.innerHTML = payload.recommendedTenants.length
    ? payload.recommendedTenants
        .map(
          (tenant) =>
            `<option value="${tenant.id}">${tenant.name} | ${tenant.base_location} | ${tenant.rating}/5</option>`
        )
        .join("")
    : `<option value="">No tenants available</option>`;

  relatedFeed.innerHTML = payload.recommendedTenants.length
    ? payload.recommendedTenants
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
                <div class="android-fact">${tenant.specializations}</div>
                <div class="android-fact">${tenant.experience_years} years</div>
                <div class="android-fact">${tenant.rating}/5</div>
                <div class="android-fact">${tenant.lease_interest}</div>
              </div>
              <a class="android-button android-button-primary" href="/android/detail.html?type=tenant&id=${tenant.id}">
                Open Farmer
              </a>
            </article>
          `
        )
        .join("")
    : `
        <article class="android-card android-empty">
          <h3>No recommendations</h3>
          <p>No tenant recommendations are available for this land right now.</p>
        </article>
      `;

  renderHistory(payload.recentMatches, "tenant_name");
}

function renderTenantDetail(payload) {
  const tenant = payload.tenant;
  document.title = `${tenant.name} | KINTA`;
  counterpartLabel.textContent = "Select land listing";
  relatedHeading.textContent = "Suggested land listings";
  detailCard.innerHTML = `
    <p class="eyebrow">Tenant Detail</p>
    <h1>${tenant.name}</h1>
    <p class="android-copy">${tenant.base_location}</p>
    <p class="android-copy">${tenant.bio}</p>
    <div class="android-facts">
      <div class="android-fact">${tenant.experience_years} years</div>
      <div class="android-fact">${tenant.rating}/5 rating</div>
      <div class="android-fact">${tenant.availability}</div>
      <div class="android-fact">${tenant.specializations}</div>
      <div class="android-fact">${tenant.lease_interest}</div>
      <div class="android-fact">Verified KINTA profile</div>
    </div>
  `;

  counterpartSelect.innerHTML = payload.recommendedLands.length
    ? payload.recommendedLands
        .map(
          (land) =>
            `<option value="${land.id}">${land.title} | ${land.location} | Trust ${land.trust_score}</option>`
        )
        .join("")
    : `<option value="">No land available</option>`;

  relatedFeed.innerHTML = payload.recommendedLands.length
    ? payload.recommendedLands
        .map(
          (land) => `
            <article class="android-card android-item-card">
              <div class="android-item-head">
                <div>
                  <h3>${land.title}</h3>
                  <p class="android-meta">${land.location}</p>
                </div>
                <span class="android-item-badge">Trust ${land.trust_score}</span>
              </div>
              <p class="android-copy">${land.summary}</p>
              <div class="android-facts">
                <div class="android-fact">${land.acres} acres</div>
                <div class="android-fact">Rs. ${Number(land.price).toLocaleString()}</div>
                <div class="android-fact">${land.soil}</div>
                <div class="android-fact">${land.irrigation}</div>
              </div>
              <a class="android-button android-button-primary" href="/android/detail.html?type=land&id=${land.id}">
                Open Land
              </a>
            </article>
          `
        )
        .join("")
    : `
        <article class="android-card android-empty">
          <h3>No recommendations</h3>
          <p>No land recommendations are available for this tenant right now.</p>
        </article>
      `;

  renderHistory(payload.recentMatches, "land_title");
}

async function loadSession() {
  try {
    const session = await fetchJson("/api/auth/session");
    if (!session.authenticated || !session.user) {
      sessionNote.textContent =
        "Sign in from home if you want this form auto-filled.";
      return;
    }

    const user = session.user;
    requesterName.value = user.name;
    requesterPhone.value = user.phone;
    requesterEmail.value = user.email;
    requesterRole.value = user.role;
    sessionNote.textContent = `Signed in as ${user.name} (${user.role}).`;
  } catch (error) {
    sessionNote.textContent = "Session details are unavailable right now.";
  }
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
  if (!detailType || !detailId) {
    throw new Error("Missing detail type or id.");
  }

  const endpoint = detailType === "land" ? `/api/lands/${detailId}` : `/api/tenants/${detailId}`;
  const payload = await fetchJson(endpoint);
  if (detailType === "land") {
    renderLandDetail(payload);
    return;
  }
  if (detailType === "tenant") {
    renderTenantDetail(payload);
    return;
  }
  throw new Error("Unknown detail type.");
}

Promise.all([loadDetail(), loadSession()]).catch((error) => {
  detailCard.innerHTML = `
    <h1>Unable to load detail</h1>
    <p class="android-copy">${error.message}</p>
  `;
});
