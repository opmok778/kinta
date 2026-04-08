const userRegisterForm = document.getElementById("userRegisterForm");
const registerStatus = document.getElementById("registerStatus");
const userLoginForm = document.getElementById("userLoginForm");
const userLoginStatus = document.getElementById("userLoginStatus");
const userLogoutButton = document.getElementById("userLogoutButton");
const userSessionCard = document.getElementById("userSessionCard");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function renderUserSession(session) {
  if (!session.authenticated || !session.user) {
    userSessionCard.innerHTML = `
      <h3>No active session</h3>
      <p>Sign in or create an account to prefill match requests on land and tenant detail pages.</p>
    `;
    return;
  }

  const user = session.user;
  userSessionCard.innerHTML = `
    <h3>${user.name}</h3>
    <p><strong>Role:</strong> ${user.role}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>City:</strong> ${user.city}</p>
    <p><strong>Phone:</strong> ${user.phone}</p>
  `;
}

async function loadUserSession() {
  const session = await fetchJson("/api/auth/session");
  renderUserSession(session);
}

userRegisterForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerStatus.textContent = "Creating account...";
  try {
    await fetchJson("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(userRegisterForm).entries()))
    });
    registerStatus.textContent = "Account created and signed in.";
    userRegisterForm.reset();
    await loadUserSession();
  } catch (error) {
    registerStatus.textContent = error.message;
  }
});

userLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  userLoginStatus.textContent = "Signing in...";
  try {
    await fetchJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(userLoginForm).entries()))
    });
    userLoginStatus.textContent = "Signed in successfully.";
    await loadUserSession();
  } catch (error) {
    userLoginStatus.textContent = error.message;
  }
});

userLogoutButton.addEventListener("click", async () => {
  await fetchJson("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  userLoginStatus.textContent = "Logged out.";
  await loadUserSession();
});

loadUserSession().catch(() => {
  userSessionCard.innerHTML = `<p>Unable to load account session right now.</p>`;
});
