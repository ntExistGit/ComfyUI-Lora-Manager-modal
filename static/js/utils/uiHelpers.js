import { translate } from "./i18nHelpers.js";
import { state, getCurrentPageState } from "../state/index.js";
import { getStorageItem, setStorageItem } from "./storageHelpers.js";
import { NODE_TYPE_ICONS, DEFAULT_NODE_COLOR } from "./constants.js";
import { eventManager } from "./EventManager.js";

export async function copyToClipboard(text, successMessage = null) {
  const defaultSuccessMessage =
    successMessage ||
    translate("uiHelpers.clipboard.copied", {}, "Copied to clipboard");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "absolute";
      textarea.style.left = "-99999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (defaultSuccessMessage) {
      showToast("uiHelpers.clipboard.copied", {}, "success");
    }
    return true;
  } catch (err) {
    console.error("Copy failed:", err);
    showToast("uiHelpers.clipboard.copyFailed", {}, "error");
    return false;
  }
}

export function showToast(key, params = {}, type = "info") {
  const message = translate(key, params);
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.append(toastContainer);
  }

  toastContainer.append(toast);

  const existingToasts = Array.from(toastContainer.querySelectorAll(".toast"));
  const toastIndex = existingToasts.indexOf(toast);
  const topOffset = 20;
  const spacing = 10;

  toast.style.top = `${
    topOffset + toastIndex * (toast.offsetHeight || 60 + spacing)
  }px`;

  requestAnimationFrame(() => {
    toast.classList.add("show");

    let timeout = 2000;
    if (type === "warning" || type === "error") {
      timeout = 5000;
    }

    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => {
        toast.remove();

        if (toastContainer) {
          const remainingToasts = Array.from(
            toastContainer.querySelectorAll(".toast")
          );
          remainingToasts.forEach((t, index) => {
            t.style.top = `${
              topOffset + index * (t.offsetHeight || 60 + spacing)
            }px`;
          });

          if (remainingToasts.length === 0) {
            toastContainer.remove();
          }
        }
      });
    }, timeout);
  });
}

export function restoreFolderFilter() {
  const activeFolder = getStorageItem("activeFolder");
  const folderTag =
    activeFolder &&
    document.querySelector(`.tag[data-folder="${activeFolder}"]`);
  if (folderTag) {
    folderTag.classList.add("active");
    filterByFolder(activeFolder);
  }
}

let isThemeForced = false;

export function initTheme() {
  const forcedTheme = getStorageItem("forced_theme");
  const savedTheme = getStorageItem("theme") || "auto";

  if (forcedTheme) {
    applyTheme(forcedTheme, true);
  } else {
    applyTheme(savedTheme, false);
  }

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (!isThemeForced) {
        const currentTheme = getStorageItem("theme") || "auto";
        if (currentTheme === "auto") {
          applyTheme("auto", false);
        }
      }
    });
}

export function toggleTheme() {
  if (isThemeForced) {
    return getStorageItem("theme") || "auto";
  }

  const currentTheme = getStorageItem("theme") || "auto";
  let newTheme;

  if (currentTheme === "light") {
    newTheme = "dark";
  } else if (currentTheme === "dark") {
    newTheme = "light";
  } else {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    newTheme = prefersDark ? "light" : "dark";
  }

  setStorageItem("theme", newTheme);
  applyTheme(newTheme, false);

  return newTheme;
}

export function setForcedTheme(theme) {
  isThemeForced = true;
  setStorageItem("forced_theme", theme);
  setStorageItem("theme", theme);
  applyTheme(theme, true);
}

export function clearForcedTheme() {
  isThemeForced = false;
  setStorageItem("forced_theme", null);
}

function applyTheme(theme, isForced = false) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const htmlElement = document.documentElement;
  const bodyElement = document.body;

  htmlElement.removeAttribute("data-theme");
  bodyElement.removeAttribute("data-theme");

  bodyElement.classList.remove("dark-theme", "light-theme", "dark", "light");

  let actualTheme = theme;

  if (isForced) {
    if (theme === "dark") {
      actualTheme = "dark";
    } else {
      actualTheme = "light";
    }
  } else if (theme === "auto") {
    actualTheme = prefersDark ? "dark" : "light";
  }

  if (actualTheme === "dark") {
    htmlElement.setAttribute("data-theme", "dark");
    bodyElement.setAttribute("data-theme", "dark");
    bodyElement.classList.add("dark-theme", "dark");
  } else {
    htmlElement.setAttribute("data-theme", "light");
    bodyElement.setAttribute("data-theme", "light");
    bodyElement.classList.add("light-theme", "light");
  }

  updateThemeToggleIcons(theme);
}

function updateThemeToggleIcons(theme) {
  const themeToggle = document.querySelector(".theme-toggle");
  if (!themeToggle) return;

  themeToggle.classList.remove("theme-light", "theme-dark", "theme-auto");

  themeToggle.classList.add(`theme-${theme}`);

  const newTitle =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  themeToggle.title = newTitle;
}

function filterByFolder(folderPath) {
  document.querySelectorAll(".model-card").forEach((card) => {
    card.style.display = card.dataset.folder === folderPath ? "" : "none";
  });
}

export function openCivitai(filePath) {
  const loraCard = document.querySelector(
    `.model-card[data-filepath="${filePath}"]`
  );
  if (!loraCard) return;

  const metaData = JSON.parse(loraCard.dataset.meta);
  const civitaiId = metaData.modelId;
  const versionId = metaData.id;

  if (civitaiId) {
    let url = `https://civitai.com/models/${civitaiId}`;
    if (versionId) {
      url += `?modelVersionId=${versionId}`;
    }
    window.open(url, "_blank");
  } else {
    const modelName = loraCard.dataset.name;
    window.open(
      `https://civitai.com/models?query=${encodeURIComponent(modelName)}`,
      "_blank"
    );
  }
}

export function updatePanelPositions() {
  const searchOptionsPanel = document.getElementById("searchOptionsPanel");
  const filterPanel = document.getElementById("filterPanel");

  if (!searchOptionsPanel && !filterPanel) return;

  const header = document.querySelector(".app-header");
  if (!header) return;

  const headerRect = header.getBoundingClientRect();
  const topPosition = headerRect.bottom + 5;

  if (searchOptionsPanel) {
    searchOptionsPanel.style.top = `${topPosition}px`;
  }

  if (filterPanel) {
    filterPanel.style.top = `${topPosition}px`;
  }

  const searchContainer = document.querySelector(".header-search");
  if (searchContainer) {
    const searchRect = searchContainer.getBoundingClientRect();

    if (searchOptionsPanel) {
      searchOptionsPanel.style.right = `${
        window.innerWidth - searchRect.right
      }px`;
    }

    if (filterPanel) {
      const filterButton = document.getElementById("filterButton");
      if (filterButton) {
        const filterRect = filterButton.getBoundingClientRect();
        filterPanel.style.right = `${window.innerWidth - filterRect.right}px`;
      }
    }
  }
}

export function initBackToTop() {
  const button = document.getElementById("backToTopBtn");
  if (!button) return;

  const scrollContainer = document.querySelector(".page-content");

  const toggleBackToTop = () => {
    const scrollThreshold = window.innerHeight * 0.3;
    if (scrollContainer.scrollTop > scrollThreshold) {
      button.classList.add("visible");
    } else {
      button.classList.remove("visible");
    }
  };

  button.addEventListener("click", () => {
    scrollContainer.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  scrollContainer.addEventListener("scroll", toggleBackToTop);

  toggleBackToTop();
}

export function getNSFWLevelName(level) {
  if (level === 0) return "Unknown";
  if (level >= 32) return "Blocked";
  if (level >= 16) return "XXX";
  if (level >= 8) return "X";
  if (level >= 4) return "R";
  if (level >= 2) return "PG13";
  if (level >= 1) return "PG";
  return "Unknown";
}

function parseUsageTipNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function getLoraStrengthsFromUsageTips(usageTips = {}) {
  const parsedStrength = parseUsageTipNumber(usageTips.strength);
  const clipStrengthSource = usageTips.clip_strength ?? usageTips.clipStrength;
  const parsedClipStrength = parseUsageTipNumber(clipStrengthSource);

  return {
    strength: parsedStrength !== null ? parsedStrength : 1,
    hasStrength: parsedStrength !== null,
    clipStrength: parsedClipStrength,
    hasClipStrength: parsedClipStrength !== null,
  };
}

export function buildLoraSyntax(fileName, usageTips = {}) {
  const { strength, hasStrength, clipStrength, hasClipStrength } =
    getLoraStrengthsFromUsageTips(usageTips);

  if (hasClipStrength) {
    const modelStrength = hasStrength ? strength : 1;
    return `<lora:${fileName}:${modelStrength}:${clipStrength}>`;
  }

  return `<lora:${fileName}:${strength}>`;
}

export function copyLoraSyntax(card) {
  const usageTips = JSON.parse(card.dataset.usage_tips || "{}");
  const baseSyntax = buildLoraSyntax(card.dataset.file_name, usageTips);

  const includeTriggerWords = state.global.settings.include_trigger_words;

  if (!includeTriggerWords) {
    const message = translate(
      "uiHelpers.lora.syntaxCopied",
      {},
      "LoRA syntax copied to clipboard"
    );
    copyToClipboard(baseSyntax, message);
    return;
  }

  const meta = card.dataset.meta ? JSON.parse(card.dataset.meta) : null;
  const trainedWords = meta?.trainedWords;

  if (
    !trainedWords ||
    !Array.isArray(trainedWords) ||
    trainedWords.length === 0
  ) {
    const message = translate(
      "uiHelpers.lora.syntaxCopiedNoTriggerWords",
      {},
      "LoRA syntax copied to clipboard (no trigger words found)"
    );
    copyToClipboard(baseSyntax, message);
    return;
  }

  let finalSyntax = baseSyntax;

  if (trainedWords.length === 1) {
    const triggers = trainedWords[0]
      .split(",")
      .map((word) => word.trim())
      .filter((word) => word);
    if (triggers.length > 0) {
      finalSyntax = `${baseSyntax}, ${triggers.join(", ")}`;
    }
    const message = translate(
      "uiHelpers.lora.syntaxCopiedWithTriggerWords",
      {},
      "LoRA syntax with trigger words copied to clipboard"
    );
    copyToClipboard(finalSyntax, message);
  } else {
    const groups = trainedWords
      .map((group) => {
        const triggers = group
          .split(",")
          .map((word) => word.trim())
          .filter((word) => word);
        return triggers.join(", ");
      })
      .filter((group) => group);

    if (groups.length > 0) {
      finalSyntax = baseSyntax + ", " + groups[0];
      for (let i = 1; i < groups.length; i++) {
        finalSyntax += `\n${"-".repeat(17)}\n${groups[i]}`;
      }
    }
    const message = translate(
      "uiHelpers.lora.syntaxCopiedWithTriggerWordGroups",
      {},
      "LoRA syntax with trigger word groups copied to clipboard"
    );
    copyToClipboard(finalSyntax, message);
  }
}

export async function sendLoraToWorkflow(
  loraSyntax,
  replaceMode = false,
  syntaxType = "lora"
) {
  try {
    const registryResponse = await fetch("/api/lm/get-registry");
    const registryData = await registryResponse.json();

    if (!registryData.success) {
      if (registryData.error === "Standalone Mode Active") {
        showToast("toast.general.cannotInteractStandalone", {}, "warning");
        return false;
      } else {
        showToast("toast.general.failedWorkflowInfo", {}, "error");
        return false;
      }
    }

    if (registryData.data.node_count === 0) {
      showToast("uiHelpers.workflow.noSupportedNodes", {}, "warning");
      return false;
    } else if (registryData.data.node_count > 1) {
      showNodeSelector(
        registryData.data.nodes,
        loraSyntax,
        replaceMode,
        syntaxType
      );
      return true;
    } else {
      const nodes = registryData.data.nodes;
      const nodeId = Object.keys(nodes)[0];
      return await sendToSpecificNode(
        [nodeId],
        nodes,
        loraSyntax,
        replaceMode,
        syntaxType
      );
    }
  } catch (error) {
    console.error("Failed to get registry:", error);
    showToast("uiHelpers.workflow.communicationFailed", {}, "error");
    return false;
  }
}

function resolveNodeReference(nodeKey, nodesMap) {
  if (!nodeKey) {
    return null;
  }

  const directMatch = nodesMap?.[nodeKey];
  if (directMatch) {
    return {
      node_id: directMatch.id,
      graph_id: directMatch.graph_id ?? null,
    };
  }

  if (typeof nodeKey === "string" && nodeKey.includes(":")) {
    const [graphId, ...rest] = nodeKey.split(":");
    const nodeIdPart = rest.join(":");
    const numericNodeId = Number(nodeIdPart);
    return {
      node_id: Number.isNaN(numericNodeId) ? nodeIdPart : numericNodeId,
      graph_id: graphId || null,
    };
  }

  const numericId = Number(nodeKey);
  return {
    node_id: Number.isNaN(numericId) ? nodeKey : numericId,
    graph_id: null,
  };
}

async function sendToSpecificNode(
  nodeIds,
  nodesMap,
  loraSyntax,
  replaceMode,
  syntaxType
) {
  try {
    const requestBody = {
      lora_code: loraSyntax,
      mode: replaceMode ? "replace" : "append",
    };

    if (Array.isArray(nodeIds)) {
      const references = nodeIds
        .map((nodeKey) => resolveNodeReference(nodeKey, nodesMap))
        .filter((reference) => reference && reference.node_id !== undefined);

      if (references.length > 0) {
        requestBody.node_ids = references;
      }
    } else if (nodeIds) {
      const reference = resolveNodeReference(nodeIds, nodesMap);
      if (reference) {
        requestBody.node_ids = [reference];
      }
    }

    const response = await fetch("/api/lm/update-lora-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (result.success) {
      if (syntaxType === "recipe") {
        const messageKey = replaceMode
          ? "uiHelpers.workflow.recipeReplaced"
          : "uiHelpers.workflow.recipeAdded";
        showToast(messageKey, {}, "success");
      } else {
        const messageKey = replaceMode
          ? "uiHelpers.workflow.loraReplaced"
          : "uiHelpers.workflow.loraAdded";
        showToast(messageKey, {}, "success");
      }
      return true;
    } else {
      const messageKey =
        syntaxType === "recipe"
          ? "uiHelpers.workflow.recipeFailedToSend"
          : "uiHelpers.workflow.loraFailedToSend";
      showToast(messageKey, {}, "error");
      return false;
    }
  } catch (error) {
    console.error("Failed to send to workflow:", error);
    const messageKey =
      syntaxType === "recipe"
        ? "uiHelpers.workflow.recipeFailedToSend"
        : "uiHelpers.workflow.loraFailedToSend";
    showToast(messageKey, {}, "error");
    return false;
  }
}

let nodeSelectorState = {
  isActive: false,
  clickHandler: null,
  selectorClickHandler: null,
};

function showNodeSelector(nodes, loraSyntax, replaceMode, syntaxType) {
  const selector = document.getElementById("nodeSelector");
  if (!selector) return;

  hideNodeSelector();

  const nodeItems = Object.entries(nodes)
    .map(([nodeKey, node]) => {
      const iconClass = NODE_TYPE_ICONS[node.type] || "fas fa-question-circle";
      const bgColor = node.bgcolor || DEFAULT_NODE_COLOR;
      const graphLabel = node.graph_name ? ` (${node.graph_name})` : "";

      return `
      <div class="node-item" data-node-id="${nodeKey}">
        <div class="node-icon-indicator" style="background-color: ${bgColor}">
          <i class="${iconClass}"></i>
        </div>
        <span>#${node.id}${graphLabel} ${node.title}</span>
      </div>
    `;
    })
    .join("");

  const actionType =
    syntaxType === "recipe"
      ? translate("uiHelpers.nodeSelector.recipe", {}, "Recipe")
      : translate("uiHelpers.nodeSelector.lora", {}, "LoRA");
  const actionMode = replaceMode
    ? translate("uiHelpers.nodeSelector.replace", {}, "Replace")
    : translate("uiHelpers.nodeSelector.append", {}, "Append");
  const selectTargetNodeText = translate(
    "uiHelpers.nodeSelector.selectTargetNode",
    {},
    "Select target node"
  );
  const sendToAllText = translate(
    "uiHelpers.nodeSelector.sendToAll",
    {},
    "Send to All"
  );

  selector.innerHTML = `
    <div class="node-selector-header">
      <span class="selector-action-type">${actionMode} ${actionType}</span>
      <span class="selector-instruction">${selectTargetNodeText}</span>
    </div>
    ${nodeItems}
    <div class="node-item send-all-item" data-action="send-all">
      <div class="node-icon-indicator all-nodes">
        <i class="fas fa-broadcast-tower"></i>
      </div>
      <span>${sendToAllText}</span>
    </div>
  `;

  positionNearMouse(selector);

  selector.style.display = "block";
  nodeSelectorState.isActive = true;

  eventManager.setState("nodeSelectorActive", true);

  setupNodeSelectorEvents(selector, nodes, loraSyntax, replaceMode, syntaxType);
}

function setupNodeSelectorEvents(
  selector,
  nodes,
  loraSyntax,
  replaceMode,
  syntaxType
) {
  cleanupNodeSelectorEvents();

  eventManager.addHandler(
    "click",
    "nodeSelector-outside",
    (e) => {
      if (!selector.contains(e.target)) {
        hideNodeSelector();
        return true;
      }
    },
    {
      priority: 200,
      onlyWhenNodeSelectorActive: true,
    }
  );

  eventManager.addHandler(
    "click",
    "nodeSelector-selection",
    async (e) => {
      const nodeItem = e.target.closest(".node-item");
      if (!nodeItem) return false;

      e.stopPropagation();

      const action = nodeItem.dataset.action;
      const nodeId = nodeItem.dataset.nodeId;

      if (action === "send-all") {
        const allNodeIds = Object.keys(nodes);
        await sendToSpecificNode(
          allNodeIds,
          nodes,
          loraSyntax,
          replaceMode,
          syntaxType
        );
      } else if (nodeId) {
        await sendToSpecificNode(
          [nodeId],
          nodes,
          loraSyntax,
          replaceMode,
          syntaxType
        );
      }

      hideNodeSelector();
      return true;
    },
    {
      priority: 150,
      targetSelector: "#nodeSelector",
      onlyWhenNodeSelectorActive: true,
    }
  );
}

function cleanupNodeSelectorEvents() {
  eventManager.removeHandler("click", "nodeSelector-outside");
  eventManager.removeHandler("click", "nodeSelector-selection");

  nodeSelectorState.clickHandler = null;
  nodeSelectorState.selectorClickHandler = null;
}

function hideNodeSelector() {
  const selector = document.getElementById("nodeSelector");
  if (selector) {
    selector.style.display = "none";
    selector.innerHTML = "";
  }

  cleanupNodeSelectorEvents();
  nodeSelectorState.isActive = false;

  eventManager.setState("nodeSelectorActive", false);
}

function positionNearMouse(element) {
  const mouseX = window.lastMouseX || window.innerWidth / 2;
  const mouseY = window.lastMouseY || window.innerHeight / 2;

  element.style.visibility = "hidden";
  element.style.display = "block";

  const rect = element.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  let x = mouseX + 10;
  let y = mouseY + 10;

  if (x + rect.width > viewportWidth) {
    x = mouseX - rect.width - 10;
  }

  if (y + rect.height > viewportHeight) {
    y = mouseY - rect.height - 10;
  }

  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
  element.style.visibility = "visible";
}

export function initializeMouseTracking() {
  eventManager.addHandler(
    "mousemove",
    "uiHelpers-mouseTracking",
    (e) => {
      window.lastMouseX = e.clientX;
      window.lastMouseY = e.clientY;
    },
    {
      priority: 10,
    }
  );
}

initializeMouseTracking();

export async function openExampleImagesFolder(modelHash) {
  try {
    const response = await fetch("/api/lm/open-example-images-folder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_hash: modelHash,
      }),
    });

    const result = await response.json();

    if (result.success) {
      const message = translate(
        "uiHelpers.exampleImages.openingFolder",
        {},
        "Opening example images folder"
      );
      showToast("uiHelpers.exampleImages.opened", {}, "success");
      return true;
    } else {
      showToast("uiHelpers.exampleImages.failedToOpen", {}, "error");
      return false;
    }
  } catch (error) {
    console.error("Failed to open example images folder:", error);
    showToast("uiHelpers.exampleImages.failedToOpen", {}, "error");
    return false;
  }
}
