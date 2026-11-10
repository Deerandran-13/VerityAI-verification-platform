chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "verityai-verify-selection",
    title: "Verify with VerityAI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "verityai-verify-selection" && info.selectionText) {
    chrome.storage.local.set({ selectedText: info.selectionText }, () => {
      chrome.action.openPopup();
    });
  }
});

