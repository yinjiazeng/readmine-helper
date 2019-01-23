const getSettings = () => {
    return JSON.parse(localStorage.getItem('settings') || '{}')
}

chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.sendMessage(tab.tabId, getSettings())
})

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(getSettings())
})