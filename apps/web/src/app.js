const platformValue = document.querySelector("#platform-value");
const shellValue = document.querySelector("#shell-value");
const toast = document.querySelector("#toast");
const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".command-set")];

// Centralized public install command for the web UI
const PUBLIC_INSTALL_CMD = "curl -fsSL https://ghost-engineer.pages.dev/install.sh | bash";

function setInstallCommand() {
  for (const el of document.querySelectorAll("[data-copy]")) {
    const v = el.getAttribute("data-copy") ?? "";
    if (v.includes("ghost-engineer.dev")) {
      el.setAttribute("data-copy", PUBLIC_INSTALL_CMD);
    }
  }

  const replaceInId = ["hero-command", "global-command", "source-command"];
  for (const id of replaceInId) {
    const node = document.getElementById(id);
    if (node && node.textContent.includes("ghost-engineer.dev")) {
      node.textContent = node.textContent.replace(/https?:\/\/ghost-engineer\.dev\/install\.sh \| bash/g, PUBLIC_INSTALL_CMD);
    }
  }

  for (const pre of document.querySelectorAll("pre code")) {
    if (pre.textContent.includes("ghost-engineer.dev")) {
      pre.textContent = pre.textContent.replace(/https?:\/\/ghost-engineer\.dev\/install\.sh \| bash/g, PUBLIC_INSTALL_CMD);
    }
  }
}

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

// Ensure install command is centralized in the UI before wiring listeners
setInstallCommand();

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy") ?? "";
    await copyValue(value, button);
  });
}

for (const button of document.querySelectorAll("[data-copy-target]")) {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target") ?? "";
    const target = document.getElementById(targetId);
    await copyValue(target?.textContent?.trim() ?? "", button);
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

async function copyValue(value, button) {
  if (!value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast("Command copied");
    showCopiedState(button);
  } catch {
    showToast(value);
  }
}

function showCopiedState(button) {
  const originalLabel = button.textContent;
  button.textContent = "Copied";
  button.setAttribute("data-copied", "true");
  window.setTimeout(() => {
    button.textContent = originalLabel;
    button.removeAttribute("data-copied");
  }, 1600);
}
