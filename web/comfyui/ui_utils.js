import { app } from "../../scripts/app.js";

let currentModal = null;
let themeSyncInterval = null;
let modalState = {
  isMinimized: false,
  isFullscreen: false,
  normalWidth: null,
  normalHeight: null,
  normalLeft: null,
  normalTop: null,
  minimizedLeft: null,
  normalZIndex: null,
};

const createModal = () => {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
    modalState.isMinimized = false;
    modalState.isFullscreen = false;
    stopThemeSync();
    return;
  }

  const modal = document.createElement("div");
  modal.className = "lora-manager-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    height: 80%;
    border-radius: var(--p-dialog-border-radius);
    box-shadow: var(--p-dialog-shadow);
    background: var(--p-dialog-background);
    border: 1px solid var(--p-dialog-border-color);
    color: var(--p-dialog-color);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 300px;
    min-height: 200px;
    user-select: none;
  `;

  const header = document.createElement("div");
  header.className = "lora-manager-modal-header";
  header.style.cssText = `
    height: var(--comfy-topbar-height);
    display: flex;
    align-items: center;
    user-select: none;
    margin: 4px;
    cursor: move;
  `;
  header.innerHTML = `
    <div class="comfyui-menu" style="width: 100%; display: flex; justify-content: space-between; align-items: center; user-select: none; padding: 0 8px;">
      <div style="display: flex; align-items: center; gap: 4px; overflow: hidden;">
        <img src="/loras_static/images/favicon-32x32.png" alt="LoRA Manager" class="app-logo" style="width: 20px; height: 20px;">
        <span class="truncate">LoRA Manager</span>
      </div>
      <div class="comfyui-button-group">
        <button title="Minimize" class="comfyui-button lora-manager-minimize-btn"><i class="pi pi-minus"></i></button>
        <button title="Fullscreen" class="comfyui-button lora-manager-fullscreen-btn"><i class="pi pi-expand"></i></button>
        <button title="Close" class="comfyui-button lora-manager-close-btn"><i class="pi pi-times"></i></button>
      </div>
    </div>
  `;
  modal.appendChild(header);

  const content = document.createElement("div");
  content.style.cssText = `
    flex: 1;
    overflow: hidden;
    position: relative;
    margin: 0 4px 4px 4px;
    border-radius: 6px;
  `;

  const iframe = document.createElement("iframe");
  iframe.src = `${window.location.origin}/loras`;
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  iframe.onload = () => {
    setTimeout(() => {
      startThemeSync();
    }, 500);
  };

  content.appendChild(iframe);
  modal.appendChild(content);

  document.body.appendChild(modal);
  currentModal = modal;

  setupThemeBidirectionalSync();

  function getGraphPanelBounds() {
    const graphPanel = document.querySelector(
      ".p-splitterpanel.graph-canvas-panel.relative"
    );
    if (!graphPanel) {
      return {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    const rect = graphPanel.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function centerInGraphPanel() {
    const bounds = getGraphPanelBounds();
    const padding = 40;

    const widthPercent = 70;
    const heightPercent = 90;

    const defaultWidth = Math.max(300, (bounds.width * widthPercent) / 100);
    const defaultHeight = Math.max(200, (bounds.height * heightPercent) / 100);

    const maxWidth = bounds.width - padding * 2;
    const maxHeight = bounds.height - padding * 2;

    const finalWidth = Math.min(defaultWidth, maxWidth);
    const finalHeight = Math.min(defaultHeight, maxHeight);

    const centerLeft = bounds.left + (bounds.width - finalWidth) / 2;
    const centerTop = bounds.top + (bounds.height - finalHeight) / 2;

    return {
      width: finalWidth,
      height: finalHeight,
      left: centerLeft,
      top: centerTop,
    };
  }

  function fitToBounds() {
    if (modalState.isFullscreen || modalState.isMinimized) return false;

    const bounds = getGraphPanelBounds();
    const rect = modal.getBoundingClientRect();
    const padding = 4;

    let newLeft = rect.left;
    let newTop = rect.top;
    let newWidth = rect.width;
    let newHeight = rect.height;

    let needsAdjustment = false;

    if (newWidth > bounds.width - padding * 2) {
      newWidth = Math.max(minW, bounds.width - padding * 2);
      needsAdjustment = true;
    }

    if (newHeight > bounds.height - padding * 2) {
      newHeight = Math.max(minH, bounds.height - padding * 2);
      needsAdjustment = true;
    }

    if (newLeft < bounds.left + padding) {
      newLeft = bounds.left + padding;
      needsAdjustment = true;
    } else if (newLeft + newWidth > bounds.right - padding) {
      newLeft = bounds.right - newWidth - padding;
      needsAdjustment = true;
    }

    if (newTop < bounds.top + padding) {
      newTop = bounds.top + padding;
      needsAdjustment = true;
    } else if (newTop + newHeight > bounds.bottom - padding) {
      newTop = bounds.bottom - newHeight - padding;
      needsAdjustment = true;
    }

    if (needsAdjustment) {
      modal.style.width = `${newWidth}px`;
      modal.style.height = `${newHeight}px`;
      modal.style.left = `${newLeft}px`;
      modal.style.top = `${newTop}px`;
      modal.style.transform = "none";

      modalState.normalWidth = newWidth;
      modalState.normalHeight = newHeight;
      modalState.normalLeft = newLeft;
      modalState.normalTop = newTop;

      return true;
    }
    return false;
  }

  function saveNormalState() {
    if (modalState.isFullscreen || modalState.isMinimized) return;

    const rect = modal.getBoundingClientRect();
    modalState.normalWidth = rect.width;
    modalState.normalHeight = rect.height;
    modalState.normalLeft = rect.left;
    modalState.normalTop = rect.top;
  }

  function saveMinimizedPosition() {
    if (!modalState.isMinimized) return;

    const rect = modal.getBoundingClientRect();
    modalState.minimizedLeft = rect.left;
  }

  function applyNormalState() {
    if (!modalState.normalWidth) {
      const centered = centerInGraphPanel();
      modalState.normalWidth = centered.width;
      modalState.normalHeight = centered.height;
      modalState.normalLeft = centered.left;
      modalState.normalTop = centered.top;
      modal.style.opacity = "1";
      modal.style.transition = "opacity 0.3s ease";
    }

    modal.style.width = `${modalState.normalWidth}px`;
    modal.style.height = `${modalState.normalHeight}px`;
    modal.style.left = `${modalState.normalLeft}px`;
    modal.style.top = `${modalState.normalTop}px`;
    modal.style.transform = "none";
    modal.style.zIndex = modalState.normalZIndex || "1000";
    content.style.display = "block";
    header.style.cursor = "move";
    modalState.isMinimized = false;
    modalState.isFullscreen = false;

    fitToBounds();
  }

  function applyMinimizedState() {
    modal.style.height = `calc(var(--comfy-topbar-height, 40px) + 8px)`;
    modal.style.minHeight = `var(--comfy-topbar-height, 40px)`;
    modal.style.width = "300px";
    modal.style.transform = "none";
    modal.style.zIndex = modalState.normalZIndex || "1000";
    modal.style.opacity = "0.5";
    modal.style.transition = "opacity 0.3s ease";
    content.style.display = "none";
    header.style.cursor = "move";
    modalState.isMinimized = true;
    updateMinimizedPosition();
  }

  function applyFullscreenState() {
    if (!modalState.normalZIndex) {
      modalState.normalZIndex = modal.style.zIndex;
    }

    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.transform = "none";
    modal.style.zIndex = "9999";
    content.style.display = "block";
    header.style.cursor = "default";
    modalState.isMinimized = false;
    modalState.isFullscreen = true;
    modal.style.opacity = "1";
    modal.style.transition = "opacity 0.3s ease";
  }

  function updateMinimizedPosition() {
    if (!modalState.isMinimized || !modal) return;

    const bounds = getGraphPanelBounds();
    const modalHeight = modal.offsetHeight;
    const modalWidth = modal.offsetWidth;

    let targetLeft =
      modalState.minimizedLeft !== null
        ? modalState.minimizedLeft
        : bounds.left + 4;

    if (targetLeft < bounds.left + 4) {
      targetLeft = bounds.left + 4;
    } else if (targetLeft + modalWidth > bounds.right - 4) {
      targetLeft = bounds.right - modalWidth - 4;
    }

    const targetTop = bounds.bottom - modalHeight - 4;

    modal.style.left = `${targetLeft}px`;
    modal.style.top = `${targetTop}px`;
  }

  let graphPanelObserver = null;
  let bodyObserver = null;
  let resizeHandler = null;

  function observeGraphPanel() {
    if (graphPanelObserver) graphPanelObserver.disconnect();
    if (bodyObserver) bodyObserver.disconnect();
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);

    const graphPanel = document.querySelector(
      ".p-splitterpanel.graph-canvas-panel.relative"
    );

    graphPanelObserver = new ResizeObserver((entries) => {
      if (modalState.isMinimized) {
        updateMinimizedPosition();
      } else if (!modalState.isFullscreen) {
        fitToBounds();
      }
    });

    if (graphPanel) {
      graphPanelObserver.observe(graphPanel);
    }

    bodyObserver = new ResizeObserver((entries) => {
      if (modalState.isMinimized) {
        updateMinimizedPosition();
      } else if (!modalState.isFullscreen) {
        fitToBounds();
      }
    });

    bodyObserver.observe(document.body);

    resizeHandler = () => {
      if (modalState.isMinimized) {
        updateMinimizedPosition();
      } else if (!modalState.isFullscreen) {
        fitToBounds();
      }
    };

    window.addEventListener("resize", resizeHandler);

    const intervalId = setInterval(() => {
      if (modalState.isMinimized) {
        updateMinimizedPosition();
      } else if (!modalState.isFullscreen) {
        fitToBounds();
      }
    }, 100);

    modal._intervalId = intervalId;
  }

  function toggleFullscreen() {
    if (!modalState.isFullscreen) {
      if (!modalState.isMinimized) {
        saveNormalState();
      }
      applyFullscreenState();
    } else {
      applyNormalState();
    }
  }

  function toggleMinimize() {
    if (!modalState.isMinimized) {
      if (!modalState.isFullscreen) {
        saveNormalState();
      }
      applyMinimizedState();
    } else {
      saveMinimizedPosition();

      if (modalState.isFullscreen) {
        applyFullscreenState();
      } else {
        applyNormalState();
      }
    }
  }

  header
    .querySelector(".lora-manager-minimize-btn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMinimize();
    });

  header
    .querySelector(".lora-manager-fullscreen-btn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFullscreen();
    });

  header
    .querySelector(".lora-manager-close-btn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      cleanup();
      modal.remove();
      currentModal = null;
      modalState.isMinimized = false;
      modalState.isFullscreen = false;
    });

  function createOverlay() {
    const ov = document.createElement("div");
    ov.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 1000;
      cursor: default;
    `;

    document.body.appendChild(ov);
    return ov;
  }

  let minW = 300;
  let minH = 200;
  let resizePixel = 8;
  let isDrag = false;
  let isResize = false;
  let startX, startY, startW, startH, startLeft, startTop;
  let resizeMode = "";
  let overlay = null;

  applyNormalState();

  observeGraphPanel();

  function cleanup() {
    if (graphPanelObserver) {
      graphPanelObserver.disconnect();
      graphPanelObserver = null;
    }
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    if (modal._intervalId) {
      clearInterval(modal._intervalId);
    }

    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mouseleave", onMouseUp);
    stopThemeSync();
    removeOverlay();
  }

  function removeOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function setCursor(cursorStyle) {
    modal.style.cursor = cursorStyle || "default";
    if (overlay) {
      overlay.style.cursor = cursorStyle || "default";
    }
  }

  function getModalRect() {
    return modal.getBoundingClientRect();
  }

  function onMouseDown(e) {
    if (isDrag || isResize) return;
    if (!modal.contains(e.target)) return;

    e.stopPropagation();

    if (modalState.isMinimized) {
      modal.style.opacity = "1";
    }

    const rect = getModalRect();
    startX = e.clientX;
    startY = e.clientY;
    startW = rect.width;
    startH = rect.height;
    startLeft = rect.left;
    startTop = rect.top;

    resizeMode = "";

    if (e.target === header || header.contains(e.target)) {
      if (
        !e.target.closest(".lora-manager-minimize-btn") &&
        !e.target.closest(".lora-manager-fullscreen-btn") &&
        !e.target.closest(".lora-manager-close-btn")
      ) {
        if (modalState.isFullscreen) {
          return;
        }

        setCursor("move");
        isDrag = true;
      }
    } else if (!modalState.isMinimized && !modalState.isFullscreen) {
      const inTop = e.clientY <= rect.top + resizePixel;
      const inBottom = e.clientY >= rect.bottom - resizePixel;
      const inLeft = e.clientX <= rect.left + resizePixel;
      const inRight = e.clientX >= rect.right - resizePixel;

      if (inTop) resizeMode += "n";
      if (inBottom) resizeMode += "s";
      if (inLeft) resizeMode += "w";
      if (inRight) resizeMode += "e";

      if (resizeMode) {
        let cs = "";
        if (resizeMode === "n" || resizeMode === "s") cs = "ns-resize";
        else if (resizeMode === "e" || resizeMode === "w") cs = "ew-resize";
        else if (resizeMode === "ne" || resizeMode === "sw") cs = "nesw-resize";
        else if (resizeMode === "nw" || resizeMode === "se") cs = "nwse-resize";
        setCursor(cs);
        isResize = true;
      }
    }

    if (isDrag || isResize) {
      overlay = createOverlay();
      e.preventDefault();
    }
  }

  function onMouseMove(e) {
    const bounds = getGraphPanelBounds();
    const rect = getModalRect();

    if (!isDrag && !isResize) {
      if (!modalState.isMinimized && !modalState.isFullscreen) {
        let rm = "";
        const inTop = e.clientY <= rect.top + resizePixel;
        const inBottom = e.clientY >= rect.bottom - resizePixel;
        const inLeft = e.clientX <= rect.left + resizePixel;
        const inRight = e.clientX >= rect.right - resizePixel;

        if (inTop) rm = "n";
        if (inBottom) rm = "s";
        if (inLeft) rm += "w";
        if (inRight) rm += "e";

        if (rm !== resizeMode) {
          let cs = "";
          if (rm === "n" || rm === "s") cs = "ns-resize";
          else if (rm === "e" || rm === "w") cs = "ew-resize";
          else if (rm === "ne" || rm === "sw") cs = "nesw-resize";
          else if (rm === "nw" || rm === "se") cs = "nwse-resize";
          setCursor(rm ? cs : "default");
          resizeMode = rm;
        }
      }
      return;
    }

    if (isDrag) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (modalState.isMinimized) {
        let left = startLeft + dx;
        const modalWidth = modal.offsetWidth;

        if (left < bounds.left + 4) left = bounds.left + 4;
        if (left + modalWidth > bounds.right - 4)
          left = bounds.right - modalWidth - 4;

        modal.style.left = `${left}px`;
        modal.style.transform = "none";

        modalState.minimizedLeft = left;
      } else {
        let left = startLeft + dx;
        let top = startTop + dy;

        if (left < bounds.left + 4) left = bounds.left + 4;
        if (top < bounds.top + 4) top = bounds.top + 4;
        if (left + startW > bounds.right - 4) left = bounds.right - startW - 4;
        if (top + startH > bounds.bottom - 4) top = bounds.bottom - startH - 4;

        modal.style.left = `${left}px`;
        modal.style.top = `${top}px`;
        modal.style.transform = "none";

        modalState.normalLeft = left;
        modalState.normalTop = top;
      }
    } else if (isResize) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let w = startW;
      let h = startH;
      let left = startLeft;
      let top = startTop;

      if (resizeMode.includes("e")) w = startW + dx;
      if (resizeMode.includes("w")) {
        w = startW - dx;
        left = startLeft + dx;
      }
      if (resizeMode.includes("s")) h = startH + dy;
      if (resizeMode.includes("n")) {
        h = startH - dy;
        top = startTop + dy;
      }

      w = Math.max(minW, w);
      h = Math.max(minH, h);

      if (left < bounds.left + 4) {
        w += left - (bounds.left + 4);
        left = bounds.left + 4;
      }
      if (top < bounds.top + 4) {
        h += top - (bounds.top + 4);
        top = bounds.top + 4;
      }
      if (left + w > bounds.right - 4) {
        w = bounds.right - 4 - left;
      }
      if (top + h > bounds.bottom - 4) {
        h = bounds.bottom - 4 - top;
      }

      modal.style.width = `${w}px`;
      modal.style.height = `${h}px`;
      modal.style.left = `${left}px`;
      modal.style.top = `${top}px`;
      modal.style.transform = "none";

      modalState.normalWidth = w;
      modalState.normalHeight = h;
      modalState.normalLeft = left;
      modalState.normalTop = top;
    }
  }

  function onMouseUp() {
    if (isDrag || isResize) {
      if (modalState.isMinimized) {
        modal.style.opacity = "0.5";
      }
      isDrag = false;
      isResize = false;
      resizeMode = "";
      setCursor("default");
      removeOverlay();

      if (!modalState.isMinimized && !modalState.isFullscreen) {
        fitToBounds();
      }
    }
  }

  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mouseleave", onMouseUp);

  modal.addEventListener("mouseenter", () => {
    if (modalState.isMinimized && !isDrag) {
      modal.style.opacity = "1";
    }
  });

  modal.addEventListener("mouseleave", () => {
    if (modalState.isMinimized && !isDrag) {
      modal.style.opacity = "0.5";
    }
  });

  return modal;
};

function getCurrentThemeFromParent() {
  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  const dataTheme = htmlElement.getAttribute("data-theme");
  if (dataTheme) {
    return dataTheme;
  }

  if (
    bodyElement.classList.contains("dark-theme") ||
    bodyElement.classList.contains("dark")
  ) {
    return "dark";
  }

  if (bodyElement.dataset.theme === "dark") {
    return "dark";
  }

  return "light";
}

function sendThemeToIframe() {
  const iframe = document.querySelector(".lora-manager-modal iframe");
  if (!iframe || !iframe.contentWindow) return;

  setTimeout(() => {
    try {
      const currentTheme = getCurrentThemeFromParent();
      iframe.contentWindow.postMessage(
        {
          type: "THEME_CHANGE",
          theme: currentTheme,
        },
        "*"
      );
    } catch (error) {
      console.log("Cannot send theme to iframe:", error);
    }
  }, 500);
}

function startThemeSync() {
  sendThemeToIframe();

  themeSyncInterval = setInterval(sendThemeToIframe, 1000);

  const observer = new MutationObserver((mutations) => {
    let themeChanged = false;
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "data-theme" ||
          mutation.attributeName === "class")
      ) {
        themeChanged = true;
      }
    });
    if (themeChanged) {
      sendThemeToIframe();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });

  if (window.themeObserver) {
    window.themeObserver.disconnect();
  }
  window.themeObserver = observer;
}

function stopThemeSync() {
  if (themeSyncInterval) {
    clearInterval(themeSyncInterval);
    themeSyncInterval = null;
  }
  if (window.themeObserver) {
    window.themeObserver.disconnect();
    window.themeObserver = null;
  }
}

function setupThemeBidirectionalSync() {
  window.addEventListener("message", function (event) {
    if (event.data.type === "CHILD_THEME_CHANGE") {
      console.log("Theme changed from iframe:", event.data.theme);
    }
  });
}

app.registerExtension({
  name: "lora-manager.button",
  async setup() {
    const menu = app.menu?.settingsGroup;
    if (!menu) return;

    const loraButton = document.createElement("button");
    loraButton.className = "comfyui-button";
    loraButton.textContent = "LoRA Manager";
    loraButton.title ="Open LoRA Manager. (Shift+Click to open in new window, Ctrl+Click to open in new tab)"
    loraButton.onclick = (e) => {
      if (e.ctrlKey) {
        window.open(`${window.location.origin}/loras`, "_blank");
      } else if (e.shiftKey) {
        window.open(
          `${window.location.origin}/loras`,
          "_blank",
          "width=800,height=600"
        );
      } else {
        if (currentModal) {
          currentModal.remove();
          currentModal = null;
          modalState.isMinimized = false;
          modalState.isFullscreen = false;
        } else {
          createModal();
        }
      }
    };

    menu.append(loraButton);
  },
});

const fetchVersionInfo = async () => {
  try {
    const response = await fetch("/api/lm/version-info");
    const data = await response.json();

    if (data.success) {
      return data.version;
    }
    return "";
  } catch (error) {
    console.error("Error fetching version info:", error);
    return "";
  }
};

const registerAboutBadge = async () => {
  let version = await fetchVersionInfo();
  const label = version ? `LoRA-Manager v${version}` : "LoRA-Manager";

  app.registerExtension({
    name: "LoraManager.AboutBadge",
    aboutPageBadges: [
      {
        label: label,
        url: "https://github.com/willmiao/ComfyUI-Lora-Manager",
        icon: "pi pi-tags",
      },
      {
        label: "LoRA-Manager-Modal v0.9.8",
        url: "https://github.com/ntExistGit/ComfyUI-Lora-Manager-modal",
        icon: "pi pi-github",
      },
    ],
  });
};

const initialize = () => {
  registerAboutBadge();
};

initialize();
