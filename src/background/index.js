import request from '../utils/request';

let assigned_to_id;
let timer;

//获取设置信息
const getSettings = () => {
    return JSON.parse(localStorage.getItem('settings') || '{}')
}

const getIssues = () => {
    const callback = function(){
        timer = setTimeout(() => {
            setBadge()
        }, 1500)
    }
    request('issues', {
        body:{
            assigned_to_id,
            limit:50
        }
    }).then(data => {
        const {total_count} = data;
        chrome.browserAction.setBadgeText({
            text:(total_count ? (total_count > 99 ? '99+' : total_count) : '').toString()
        })
        callback()
    }).catch(() => {
        assigned_to_id = null
        callback()
    })
}

const setBadge = () => {
    if(!assigned_to_id){
        request('user').then(data => {
            assigned_to_id = data.user.id;
            getIssues()
        }).catch(() => {
            chrome.browserAction.setBadgeText({
                text:''
            })
        })
    }
    else{
        getIssues()
    }
}

setBadge()

//监听页签选中，向content_script发消息，来更新设置（当readmine和选项页面同时打开，保存设置后，切换到readmine页面会立即生效）
chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.sendMessage(tab.tabId, getSettings())
})

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
    //和content_script通信，用于页面刷新或打开时获取设置信息
    if(request === 'settings_init'){
        sendResponse(getSettings())
    }
    //更新选项后
    else if(request && request.settings){
        clearTimeout(timer)
        assigned_to_id = null
        setBadge()
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
                        selected:true,
                        url:url + path
                    });
                    return;
                }
            }
            chrome.tabs.create({url:url + path});
        })
    }
})