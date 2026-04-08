const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const logoutButton = document.getElementById("logoutButton");
const dashboardPanel = document.getElementById("dashboardPanel");
const adminWorkspace = document.getElementById("adminWorkspace");
const dashboardSummary = document.getElementById("dashboardSummary");
const inquiryList = document.getElementById("inquiryList");
const matchList = document.getElementById("matchList");
const userList = document.getElementById("userList");
const manageLandList = document.getElementById("manageLandList");
const manageTenantList = document.getElementById("manageTenantList");
const landAdminForm = document.getElementById("landAdminForm");
const tenantAdminForm = document.getElementById("tenantAdminForm");
const landAdminStatus = document.getElementById("landAdminStatus");
const tenantAdminStatus = document.getElementById("tenantAdminStatus");
const landFormTitle = document.getElementById("landFormTitle");
const tenantFormTitle = document.getElementById("tenantFormTitle");
const landAdminSubmit = document.getElementById("landAdminSubmit");
const tenantAdminSubmit = document.getElementById("tenantAdminSubmit");
const landAdminCancel = document.getElementById("landAdminCancel");
const tenantAdminCancel = document.getElementById("tenantAdminCancel");

let editableLands = new Map();
let editableTenants = new Map();
let landEditId = null;
let tenantEditId = null;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function resetLandForm() {
  landEditId = null;
  landAdminForm.reset();
  landFormTitle.textContent = "Add Land Listing";
  landAdminSubmit.textContent = "Add Listing";
  landAdminCancel.classList.add("hidden");
}

function resetTenantForm() {
  tenantEditId = null;
  tenantAdminForm.reset();
  tenantFormTitle.textContent = "Add Tenant Profile";
  tenantAdminSubmit.textContent = "Add Tenant";
  tenantAdminCancel.classList.add("hidden");
}

function renderMiniItems(items, formatter) {
  return items.map(formatter).join("") || `<article class="mini-item"><p>No records available.</p></article>`;
}

function renderDashboard(payload) {
  const summaryCards = [
    ["Land listings", payload.summary.landCount],
    ["Tenant profiles", payload.summary.tenantCount],
    ["Inquiries", payload.summary.inquiryCount],
    ["Match requests", payload.summary.matchCount],
    ["User accounts", payload.summary.userCount],
    ["Avg trust score", payload.summary.avgTrustScore]
  ];

  dashboardSummary.innerHTML = summaryCards
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <strong>${value}</strong>
          <span>${label}</span>
        </article>
      `
    )
    .join("");

  inquiryList.innerHTML = renderMiniItems(payload.recentInquiries, (item) => `
    <article class="mini-item">
      <div class="mini-item-head">
        <strong>${item.name}</strong>
        <span>${item.interest}</span>
      </div>
      <p>${item.city} | ${item.phone}</p>
      <p>${item.notes || "No notes provided."}</p>
    </article>
  `);

  matchList.innerHTML = renderMiniItems(payload.recentMatches, (item) => `
    <article class="mini-item">
      <div class="mini-item-head">
        <strong>${item.land_title}</strong>
        <span class="status-chip">${item.status}</span>
      </div>
      <p>Tenant: ${item.tenant_name}</p>
      <p>${item.requester_name} (${item.requester_role})</p>
      <p>${item.notes || "No notes provided."}</p>
      <div class="mini-item-actions">
        <button class="button button-secondary button-small" data-action="status-match" data-id="${item.id}" data-status="Reviewing" type="button">Mark Reviewing</button>
        <button class="button button-secondary button-small" data-action="status-match" data-id="${item.id}" data-status="Approved" type="button">Approve</button>
      </div>
    </article>
  `);

  userList.innerHTML = renderMiniItems(payload.latestUsers, (item) => `
    <article class="mini-item">
      <div class="mini-item-head">
        <strong>${item.name}</strong>
        <span>${item.role}</span>
      </div>
      <p>${item.email}</p>
      <p>${item.city}</p>
    </article>
  `);

  editableLands = new Map(payload.manageableLands.map((item) => [item.id, item]));
  editableTenants = new Map(payload.manageableTenants.map((item) => [item.id, item]));

  manageLandList.innerHTML = renderMiniItems(payload.manageableLands, (item) => `
    <article class="mini-item">
      <div class="mini-item-head">
        <strong>${item.title}</strong>
        <span>Rs. ${Number(item.price).toLocaleString()}</span>
      </div>
      <p>${item.location} | ${item.acres} acres | Trust ${item.trust_score}</p>
      <div class="mini-item-actions">
        <button class="button button-secondary button-small" data-action="edit-land" data-id="${item.id}" type="button">Edit</button>
        <button class="button button-danger button-small" data-action="delete-land" data-id="${item.id}" type="button">Delete</button>
      </div>
    </article>
  `);

  manageTenantList.innerHTML = renderMiniItems(payload.manageableTenants, (item) => `
    <article class="mini-item">
      <div class="mini-item-head">
        <strong>${item.name}</strong>
        <span>${item.availability}</span>
      </div>
      <p>${item.base_location} | ${item.experience_years} years | ${item.rating}/5</p>
      <div class="mini-item-actions">
        <button class="button button-secondary button-small" data-action="edit-tenant" data-id="${item.id}" type="button">Edit</button>
        <button class="button button-danger button-small" data-action="delete-tenant" data-id="${item.id}" type="button">Delete</button>
      </div>
    </article>
  `);
}

async function refreshDashboard() {
  const data = await fetchJson("/api/admin/dashboard");
  renderDashboard(data);
  dashboardPanel.classList.remove("hidden");
  adminWorkspace.classList.remove("hidden");
  loginStatus.textContent = "Authenticated.";
}

async function loadAdminSession() {
  const session = await fetchJson("/api/admin/session");
  if (session.authenticated) {
    await refreshDashboard();
  }
}

function populateLandForm(item) {
  landEditId = item.id;
  landFormTitle.textContent = `Edit Land Listing #${item.id}`;
  landAdminSubmit.textContent = "Save Changes";
  landAdminCancel.classList.remove("hidden");
  Object.entries(item).forEach(([key, value]) => {
    const field = landAdminForm.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });
}

function populateTenantForm(item) {
  tenantEditId = item.id;
  tenantFormTitle.textContent = `Edit Tenant Profile #${item.id}`;
  tenantAdminSubmit.textContent = "Save Changes";
  tenantAdminCancel.classList.remove("hidden");
  Object.entries(item).forEach(([key, value]) => {
    const field = tenantAdminForm.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing in...";
  try {
    await fetchJson("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries()))
    });
    await refreshDashboard();
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  await fetchJson("/api/admin/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  dashboardPanel.classList.add("hidden");
  adminWorkspace.classList.add("hidden");
  loginStatus.textContent = "Logged out.";
  resetLandForm();
  resetTenantForm();
});

landAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  landAdminStatus.textContent = landEditId ? "Saving changes..." : "Adding listing...";
  try {
    await fetchJson(landEditId ? `/api/admin/lands/${landEditId}` : "/api/admin/lands", {
      method: landEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(landAdminForm).entries()))
    });
    landAdminStatus.textContent = landEditId ? "Listing updated." : "Listing added.";
    resetLandForm();
    await refreshDashboard();
  } catch (error) {
    landAdminStatus.textContent = error.message;
  }
});

tenantAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  tenantAdminStatus.textContent = tenantEditId ? "Saving changes..." : "Adding tenant profile...";
  try {
    await fetchJson(tenantEditId ? `/api/admin/tenants/${tenantEditId}` : "/api/admin/tenants", {
      method: tenantEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(tenantAdminForm).entries()))
    });
    tenantAdminStatus.textContent = tenantEditId ? "Tenant updated." : "Tenant added.";
    resetTenantForm();
    await refreshDashboard();
  } catch (error) {
    tenantAdminStatus.textContent = error.message;
  }
});

landAdminCancel.addEventListener("click", resetLandForm);
tenantAdminCancel.addEventListener("click", resetTenantForm);

manageLandList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit-land") {
    populateLandForm(editableLands.get(id));
    return;
  }
  if (button.dataset.action === "delete-land") {
    if (!window.confirm("Delete this land listing?")) {
      return;
    }
    await fetchJson(`/api/admin/lands/${id}`, { method: "DELETE" });
    await refreshDashboard();
  }
});

manageTenantList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit-tenant") {
    populateTenantForm(editableTenants.get(id));
    return;
  }
  if (button.dataset.action === "delete-tenant") {
    if (!window.confirm("Delete this tenant profile?")) {
      return;
    }
    await fetchJson(`/api/admin/tenants/${id}`, { method: "DELETE" });
    await refreshDashboard();
  }
});

matchList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='status-match']");
  if (!button) {
    return;
  }
  await fetchJson(`/api/admin/matches/${button.dataset.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: button.dataset.status })
  });
  await refreshDashboard();
});

loadAdminSession().catch(() => {
  loginStatus.textContent = "Unable to load admin session.";
});
