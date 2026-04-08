const installButtons = Array.from(document.querySelectorAll("[data-install-app]"));
const installStatusNodes = Array.from(document.querySelectorAll("[data-install-status]"));

let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent);
}

function setInstallMessage(message) {
  installStatusNodes.forEach((node) => {
    node.textContent = message;
  });
}

function setInstallVisible(visible) {
  installButtons.forEach((button) => {
    button.classList.toggle("hidden", !visible);
  });
}

async function registerAndroidApp() {
  if (!("serviceWorker" in navigator)) {
    setInstallMessage("This browser does not support installation features.");
    return;
  }

  try {
    await navigator.serviceWorker.register("/android/sw.js");
  } catch (error) {
    setInstallMessage("Unable to prepare KINTA right now.");
    return;
  }

  if (isStandalone()) {
    setInstallVisible(false);
    setInstallMessage("KINTA is installed. Open it from your home screen.");
    return;
  }

  if (isAndroidDevice()) {
    setInstallMessage("Install KINTA from your browser menu when it is ready.");
  } else {
    setInstallMessage("You can keep using KINTA here in the browser.");
  }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  setInstallVisible(true);
  setInstallMessage("KINTA is ready to install on this device.");
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  setInstallVisible(false);
  setInstallMessage("KINTA is installed. Launch it from your home screen.");
});

installButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!deferredPrompt) {
      setInstallMessage("Use your browser menu to add KINTA to your home screen.");
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setInstallVisible(false);
  });
});

registerAndroidApp();
