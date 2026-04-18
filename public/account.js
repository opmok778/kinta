const roleSwitch = document.getElementById("roleSwitch");
const roleButtons = Array.from(document.querySelectorAll(".role-tab"));
const roleEyebrow = document.getElementById("roleEyebrow");
const roleHeadline = document.getElementById("roleHeadline");
const roleBadge = document.getElementById("roleBadge");
const roleDescription = document.getElementById("roleDescription");
const roleHighlights = document.getElementById("roleHighlights");
const primaryAccessLink = document.getElementById("primaryAccessLink");
const demoCredentials = document.getElementById("demoCredentials");
const fillDemoButton = document.getElementById("fillDemoButton");
const sessionStack = document.getElementById("sessionStack");
const accessLoginForm = document.getElementById("accessLoginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginHeading = document.getElementById("loginHeading");
const loginHelper = document.getElementById("loginHelper");
const loginSubmitButton = document.getElementById("loginSubmitButton");
const loginStatus = document.getElementById("loginStatus");
const activeLogoutButton = document.getElementById("activeLogoutButton");
const registerPanel = document.getElementById("registerPanel");
const adminInfoPanel = document.getElementById("adminInfoPanel");
const userRegisterForm = document.getElementById("userRegisterForm");
const registerHeading = document.getElementById("registerHeading");
const registerHelper = document.getElementById("registerHelper");
const registerRoleField = document.getElementById("registerRoleField");
const registerStatus = document.getElementById("registerStatus");

const ROLE_CONFIG = {
  landowner: {
    eyebrow: "Landowner Login",
    title: "Keep landowner access focused and fast.",
    badge: "Member Access",
    description:
      "Sign in to prefill match requests, keep owner details ready, and move from browsing to outreach without jumping across separate login pages.",
    highlights: [
      "Prefill your details on land and tenant match forms",
      "Review tenant profiles and keep outreach structured",
      "Return to the marketplace with your member session ready"
    ],
    primaryAction: { href: "/marketplace.html", label: "Open Marketplace" },
    loginHeading: "Landowner Login",
    loginHelper: "Use your landowner account to review tenant fit and send structured requests.",
    loginButton: "Sign In As Landowner",
    logoutLabel: "Logout Landowner",
    loginEndpoint: "/api/auth/login",
    sessionType: "user",
    pendingMessage: "Signing in as landowner...",
    successMessage: "Landowner signed in successfully.",
    demo: {
      email: "landowner@kinta.in",
      password: "kinta123",
      note: "Seeded demo account for landowners."
    },
    registerHeading: "Create a landowner account.",
    registerHelper: "New landowners can register here and start sending requests right away.",
    registerPreset: "Landowner"
  },
  tenant: {
    eyebrow: "Tenant Farmer Login",
    title: "Tenant farmer access without the friction.",
    badge: "Member Access",
    description:
      "Sign in to explore verified acreage, keep your profile details ready for match requests, and move through the marketplace with a smoother flow.",
    highlights: [
      "Keep your farmer profile attached to match requests",
      "Review lease-ready land with your session already loaded",
      "Stay in the member marketplace instead of a split admin flow"
    ],
    primaryAction: { href: "/marketplace.html#tenant-market", label: "Browse Lease Opportunities" },
    loginHeading: "Tenant Farmer Login",
    loginHelper: "Use your tenant farmer account to explore land opportunities and respond faster.",
    loginButton: "Sign In As Tenant Farmer",
    logoutLabel: "Logout Tenant Farmer",
    loginEndpoint: "/api/auth/login",
    sessionType: "user",
    pendingMessage: "Signing in as tenant farmer...",
    successMessage: "Tenant farmer signed in successfully.",
    demo: {
      email: "tenant@kinta.in",
      password: "kinta123",
      note: "Seeded demo account for tenant farmers."
    },
    registerHeading: "Create a tenant farmer account.",
    registerHelper: "Register here to start exploring verified land and sending match requests.",
    registerPreset: "Tenant Farmer"
  },
  admin: {
    eyebrow: "Admin Login",
    title: "Admin access now sits in the same front door.",
    badge: "Admin Access",
    description:
      "Sign in with staff credentials, keep operational access separate from member accounts, and jump straight into the marketplace dashboard.",
    highlights: [
      "Use a separate admin session for platform operations",
      "Manage land listings, tenant profiles, and user activity",
      "Review and approve match requests from one workspace"
    ],
    primaryAction: { href: "/admin.html", label: "Open Admin Dashboard" },
    loginHeading: "Admin Login",
    loginHelper: "Use issued admin credentials to access the back-office workspace.",
    loginButton: "Sign In As Admin",
    logoutLabel: "Logout Admin",
    loginEndpoint: "/api/admin/login",
    sessionType: "admin",
    pendingMessage: "Signing in as admin...",
    successMessage: "Admin signed in successfully.",
    demo: {
      email: "admin@kinta.in",
      password: "kinta123",
      note: "Seeded admin credentials for the operations dashboard."
    }
  }
};

const state = {
  activeRoleKey: "landowner",
  userSession: { authenticated: false, user: null },
  adminSession: { authenticated: false, admin: null }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function getActiveConfig() {
  return ROLE_CONFIG[state.activeRoleKey];
}

function normalizeUserRole(role) {
  if (role === "Landowner") {
    return "landowner";
  }
  if (role === "Tenant Farmer") {
    return "tenant";
  }
  return null;
}

function renderRoleTabs() {
  roleButtons.forEach((button) => {
    const isActive = button.dataset.role === state.activeRoleKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function renderDemoCredentials(config) {
  demoCredentials.innerHTML = `
    <article class="role-credential">
      <strong>${escapeHtml(config.demo.email)}</strong>
      <span>Password: ${escapeHtml(config.demo.password)}</span>
      <small>${escapeHtml(config.demo.note)}</small>
    </article>
  `;
  fillDemoButton.textContent = config.sessionType === "admin" ? "Use Admin Demo" : "Use Demo Credentials";
}

function syncDemoCredentials(previousConfig, nextConfig) {
  const shouldReplaceEmail =
    !loginEmail.value.trim() || (previousConfig && loginEmail.value === previousConfig.demo.email);
  const shouldReplacePassword =
    !loginPassword.value.trim() || (previousConfig && loginPassword.value === previousConfig.demo.password);

  if (shouldReplaceEmail) {
    loginEmail.value = nextConfig.demo.email;
  }
  if (shouldReplacePassword) {
    loginPassword.value = nextConfig.demo.password;
  }
}

function syncRegisterRole(previousConfig, nextConfig) {
  if (!nextConfig.registerPreset) {
    return;
  }
  const shouldReplaceRole =
    !registerRoleField.value || (previousConfig && registerRoleField.value === previousConfig.registerPreset);
  if (shouldReplaceRole) {
    registerRoleField.value = nextConfig.registerPreset;
  }
}

function renderRegisterPanels(config, previousConfig) {
  if (config.sessionType === "admin") {
    registerPanel.classList.add("hidden");
    adminInfoPanel.classList.remove("hidden");
    return;
  }

  registerPanel.classList.remove("hidden");
  adminInfoPanel.classList.add("hidden");
  registerHeading.textContent = config.registerHeading;
  registerHelper.textContent = config.registerHelper;
  syncRegisterRole(previousConfig, config);
}

function currentSessionForRole(config = getActiveConfig()) {
  return config.sessionType === "admin" ? state.adminSession : state.userSession;
}

function updateLogoutButtonState() {
  const config = getActiveConfig();
  const session = currentSessionForRole(config);
  activeLogoutButton.textContent = config.logoutLabel;
  activeLogoutButton.disabled = !(session && session.authenticated);
}

function renderRoleContent(previousConfig) {
  const config = getActiveConfig();

  roleEyebrow.textContent = config.eyebrow;
  roleHeadline.textContent = config.title;
  roleBadge.textContent = config.badge;
  roleDescription.textContent = config.description;
  roleHighlights.innerHTML = config.highlights.map((item) => `<article class="fact-card">${escapeHtml(item)}</article>`).join("");
  primaryAccessLink.href = config.primaryAction.href;
  primaryAccessLink.textContent = config.primaryAction.label;
  loginHeading.textContent = config.loginHeading;
  loginHelper.textContent = config.loginHelper;
  loginSubmitButton.textContent = config.loginButton;

  renderDemoCredentials(config);
  renderRegisterPanels(config, previousConfig);
  updateLogoutButtonState();
}

function renderUserSessionCard() {
  if (!state.userSession.authenticated || !state.userSession.user) {
    return `
      <article class="session-state-card ${state.activeRoleKey !== "admin" ? "session-state-card-active" : ""}">
        <p class="eyebrow">Member Session</p>
        <h3>No active member session</h3>
        <p>Sign in as a landowner or tenant farmer to keep match requests prefilled across the marketplace.</p>
      </article>
    `;
  }

  const user = state.userSession.user;
  return `
    <article class="session-state-card ${state.activeRoleKey !== "admin" ? "session-state-card-active" : ""}">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Member Session</p>
          <h3>${escapeHtml(user.name)}</h3>
        </div>
        <span class="status-chip">Signed In</span>
      </div>
      <p>${escapeHtml(user.role)} from ${escapeHtml(user.city)}</p>
      <p>${escapeHtml(user.email)} | ${escapeHtml(user.phone)}</p>
      <div class="mini-item-actions">
        <button class="button button-secondary button-small" data-logout-scope="user" type="button">Logout Member</button>
        <a class="button button-secondary button-small" href="/marketplace.html">Open Marketplace</a>
      </div>
    </article>
  `;
}

function renderAdminSessionCard() {
  if (!state.adminSession.authenticated || !state.adminSession.admin) {
    return `
      <article class="session-state-card ${state.activeRoleKey === "admin" ? "session-state-card-active" : ""}">
        <p class="eyebrow">Admin Session</p>
        <h3>No active admin session</h3>
        <p>Admin tools stay locked until staff credentials are used.</p>
      </article>
    `;
  }

  const admin = state.adminSession.admin;
  return `
    <article class="session-state-card ${state.activeRoleKey === "admin" ? "session-state-card-active" : ""}">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Admin Session</p>
          <h3>${escapeHtml(admin.email)}</h3>
        </div>
        <span class="status-chip">Signed In</span>
      </div>
      <p>Operations dashboard access is available for listings, users, tenants, and matches.</p>
      <div class="mini-item-actions">
        <button class="button button-secondary button-small" data-logout-scope="admin" type="button">Logout Admin</button>
        <a class="button button-secondary button-small" href="/admin.html">Open Dashboard</a>
      </div>
    </article>
  `;
}

function renderSessions() {
  sessionStack.innerHTML = `${renderUserSessionCard()}${renderAdminSessionCard()}`;
  updateLogoutButtonState();
}

function setActiveRole(roleKey, { syncDemo = true, keepStatus = false } = {}) {
  if (!ROLE_CONFIG[roleKey]) {
    return;
  }

  const previousConfig = ROLE_CONFIG[state.activeRoleKey];
  state.activeRoleKey = roleKey;
  renderRoleTabs();
  renderRoleContent(previousConfig);

  if (syncDemo) {
    syncDemoCredentials(previousConfig, getActiveConfig());
  }

  if (!keepStatus) {
    loginStatus.textContent = "";
    registerStatus.textContent = "";
  }

  renderSessions();
}

function inferRoleFromSessions() {
  if (state.activeRoleKey === "admin" && state.adminSession.authenticated) {
    return "admin";
  }

  if ((state.activeRoleKey === "landowner" || state.activeRoleKey === "tenant") && state.userSession.authenticated && state.userSession.user) {
    return normalizeUserRole(state.userSession.user.role) || state.activeRoleKey;
  }

  if (state.adminSession.authenticated && !state.userSession.authenticated) {
    return "admin";
  }

  if (state.userSession.authenticated && state.userSession.user) {
    return normalizeUserRole(state.userSession.user.role) || state.activeRoleKey;
  }

  return state.activeRoleKey;
}

async function loadSessions({ inferRole = true } = {}) {
  const [userResult, adminResult] = await Promise.allSettled([
    fetchJson("/api/auth/session"),
    fetchJson("/api/admin/session")
  ]);

  state.userSession =
    userResult.status === "fulfilled" ? userResult.value : { authenticated: false, user: null };
  state.adminSession =
    adminResult.status === "fulfilled" ? adminResult.value : { authenticated: false, admin: null };

  const nextRole = inferRole ? inferRoleFromSessions() : state.activeRoleKey;
  if (nextRole !== state.activeRoleKey) {
    setActiveRole(nextRole, { syncDemo: false, keepStatus: true });
    return;
  }

  renderSessions();
}

async function logoutScope(scope) {
  const endpoint = scope === "admin" ? "/api/admin/logout" : "/api/auth/logout";
  const label = scope === "admin" ? "Admin" : "Member";
  const session = scope === "admin" ? state.adminSession : state.userSession;

  if (!session.authenticated) {
    loginStatus.textContent = `No active ${label.toLowerCase()} session to log out.`;
    return;
  }

  await fetchJson(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  loginStatus.textContent = `${label} logged out.`;
  await loadSessions({ inferRole: true });
}

roleSwitch.addEventListener("click", (event) => {
  const button = event.target.closest(".role-tab[data-role]");
  if (!button) {
    return;
  }
  setActiveRole(button.dataset.role);
});

fillDemoButton.addEventListener("click", () => {
  const config = getActiveConfig();
  const roleLabel = config.sessionType === "admin" ? "admin" : (config.registerPreset || "member").toLowerCase();
  loginEmail.value = config.demo.email;
  loginPassword.value = config.demo.password;
  loginStatus.textContent = `Demo credentials loaded for ${roleLabel}.`;
});

accessLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const config = getActiveConfig();
  loginStatus.textContent = config.pendingMessage;

  try {
    const response = await fetchJson(config.loginEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(accessLoginForm).entries()))
    });

    if (config.sessionType === "user") {
      const detectedRole = normalizeUserRole(response.user?.role);
      if (detectedRole && detectedRole !== state.activeRoleKey) {
        setActiveRole(detectedRole, { syncDemo: false, keepStatus: true });
      }
      loginStatus.textContent = detectedRole ? ROLE_CONFIG[detectedRole].successMessage : config.successMessage;
    } else {
      loginStatus.textContent = config.successMessage;
    }
    await loadSessions({ inferRole: true });
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

activeLogoutButton.addEventListener("click", async () => {
  try {
    await logoutScope(getActiveConfig().sessionType);
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

sessionStack.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-logout-scope]");
  if (!button) {
    return;
  }

  try {
    await logoutScope(button.dataset.logoutScope);
  } catch (error) {
    loginStatus.textContent = error.message;
  }
});

userRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.textContent = "Creating account...";

  try {
    const response = await fetchJson("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(userRegisterForm).entries()))
    });

    userRegisterForm.reset();
    const detectedRole = normalizeUserRole(response.user?.role);
    if (detectedRole) {
      setActiveRole(detectedRole, { syncDemo: false, keepStatus: true });
    }
    if (getActiveConfig().registerPreset) {
      registerRoleField.value = getActiveConfig().registerPreset;
    }

    registerStatus.textContent = "Account created and signed in.";
    await loadSessions({ inferRole: true });
  } catch (error) {
    registerStatus.textContent = error.message;
  }
});

setActiveRole(state.activeRoleKey, { syncDemo: true, keepStatus: true });
loadSessions({ inferRole: true }).catch(() => {
  loginStatus.textContent = "Unable to load access sessions.";
  renderSessions();
});
