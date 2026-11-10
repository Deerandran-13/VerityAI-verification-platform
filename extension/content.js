// VerityAI Content Script
// Listens for selection events or shortcut triggers
window.addEventListener("mouseup", () => {
  const selected = window.getSelection().toString().trim();
  if (selected.length > 20) {
    // Stores latest text snippet for quick popup access
    try {
      chrome.storage.local.set({ selectedText: selected });
    } catch (e) {
      // Ignored if extension context invalidated
    }
  }
});

