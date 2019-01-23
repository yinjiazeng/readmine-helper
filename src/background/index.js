const getSettings = () => {
    return JSON.parse(localStorage.getItem('settings') || '{}')
}

chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.sendMessage(tab.tabId, getSettings())
})

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(getSettings())
})

chrome.browserAction.onClicked.addListener(() => {
    let {url, path} = getSettings();
    if(url){
        url = url.replace(/\/$/, '');
        path = path ? (path.indexOf('/') === -1 ? '/' + path : path) : '';
        chrome.tabs.getAllInWindow(undefined, (tabs) => {
            for(let i = 0, tab; tab = tabs[i]; i++){
                if(tab.url && tab.url.indexOf(url) === 0){
                    chrome.tabs.reload(tab.id);
                    return;
                }
            }
            chrome.tabs.create({url:url + path});
        })
    }
})