const platformValue = document.querySelector("#platform-value");
const shellValue = document.querySelector("#shell-value");
const toast = document.querySelector("#toast");
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".command-set")];

const platform = detectPlatform();
platformValue.textContent = platform.label;
shellValue.textContent = platform.shell;

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const selected = tab.dataset.tab;
    for (const item of tabs) {
      item.classList.toggle("active", item === tab);
    }
    for (const panel of panels) {
      panel.classList.toggle("active", panel.dataset.panel === selected);
    }
  });
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy") ?? "";
    await copyValue(value);
  });
}

for (const button of document.querySelectorAll("[data-copy-target]")) {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target") ?? "";
    const target = document.getElementById(targetId);
    await copyValue(target?.textContent?.trim() ?? "");
  });
}

function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platformName = navigator.platform.toLowerCase();

  if (platformName.includes("mac")) {
    return { label: "macOS", shell: "zsh or bash" };
  }

  if (platformName.includes("linux")) {
    return { label: "Linux", shell: "bash, zsh, or fish" };
  }

  if (platformName.includes("win") || userAgent.includes("windows")) {
    return { label: "Windows", shell: "WSL2 recommended" };
  }

  return { label: "Unix-like environment", shell: "bash or zsh" };
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 1800);
}

async function copyValue(value) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast("Command copied");
  } catch {
    showToast(value);
  }
}
