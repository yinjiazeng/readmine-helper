//获取设置信息
const getSettings = () => {
    return JSON.parse(localStorage.getItem('settings') || '{}')
}

//监听页签选中，向content_script发消息，来更新设置（当readmine和选项页面同时打开，保存设置后，切换到readmine页面会立即生效）
chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.sendMessage(tab.tabId, getSettings())
})

//和content_script通信，用于页面刷新或打开时获取设置信息
chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    if(request === 'init'){
        sendResponse(getSettings())
    }
})

//点击图标打开或者刷新页面
chrome.browserAction.onClicked.addListener(() => {
    let {url, path} = getSettings();
    if(url){
        url = url.replace(/\/$/, '');
        path = path ? (path.indexOf('/') === -1 ? '/' + path : path) : '/my/page';
        chrome.tabs.getAllInWindow(undefined, (tabs) => {
            for(let i = 0, tab; tab = tabs[i]; i++){
                if(tab.url && tab.url.indexOf(url) === 0){
                    chrome.tabs.update(tab.id, {
                        selected:true
                    });
                    chrome.tabs.reload(tab.id);
                    return;
                }
            }
            chrome.tabs.create({url:url + path});
        })
    }
})