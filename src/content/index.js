import './style.less';
import 'nuijs/components/search';
import {events} from 'nuijs/core';
import pinyin from './pinyin';

//ajax请求时必传token
const csrfToken = $('meta[name="csrf-token"]').attr('content');

let settings = {};

//初始化设置信息
chrome.extension.sendMessage('init', (response) => {
    settings = response
})

//和background通信，更新设置信息
chrome.extension.onMessage.addListener(request => {
    settings = request
})

events({
    events:{
        //鼠标悬停在select上时，初始化search
        'mouseover select':'search',
        //当按tab使select获得焦点时，初始化search
        'focus select':'search focus',
        //search组件中的input回车时取消默认行为（不设置会造成页面刷新）
        'keydown .search-wrap input':'keydown',
        //任务单页面切换“状态”
        'change #issue_status_id':'statusChange',
        //任务单页面点击编辑（click无效）
        'mousedown .contextual .icon-edit':'changeAssign'
    },
    //select可能包含onchange事件，在content_script中无法触发该事件回调的执行，因此需要设置回调模拟
    //key:select的id属性
    //value:回调函数
    callbacks:{
        //项目（页面右上角）
        project_quick_jump_box(data){
            if(data.value){
                window.location = data.value;
            }
        },
        //项目（任务单中）
        issue_project_id(data){

        }
    },
    getCallback(id){
        for(let i in this.callbacks){
            if(i === id){
                return this.callbacks[i]
            }
        }
    },
    //将“指派给”设置为任务单创作者
    changeAssign(){
        if(settings.assigned_author !== false && $('#update').is(':hidden')){
            $('#issue_assigned_to_id').val($('.author > .user').attr('href').replace('/users/', ''))
        }
    },
    //检测select是否需要执行美化
    checkEnabled(id){
        //默认包含了选择人的下拉框
        return [
            'issue_assigned_', 
            'values_assigned_', 
            'values_author_', 
            'values_watcher_',
        ].find(v => id.indexOf(v) === 0) || 
        //自定义
        (settings.beautify || []).find(v => v === id)
    },
    //状态切换
    statusChange(e, $elem){
        const value = $elem.val();
        //状态为Resolved时，将完成度设置为100%
        if(value == 3 && settings.percent !== false){
            $('#issue_done_ratio').val(100);
        }
        let $off;
        //状态为Started或Resolved时，设置跟踪
        if(
            (value == 3 || value == 2) && 
            settings.tracks && 
            //没有设置为跟踪
            ($off = $('.icon-fav-off')).length &&
            //任务单的被指派人和当前用户相同（表示该单子是你的）
            $('.assigned-to > .user').attr('href') === $('#loggedas > .user').attr('href')
        ){
            $off.removeClass('icon-fav-off').addClass('icon-fav').text('取消跟踪').attr('data-method', 'delete');
            $.ajax({
                type:'post',
                url:$off.attr('href'),
                headers:{
                    'X-CSRF-Token':csrfToken
                }
            })
        }
    },
    keydown(e){
        if(e.keyCode === 13){
            e.preventDefault()
        }
    },
    focus(e, $elem, $input){
        $input && $input.focus()
    },
    //初始化search
    search(e, $elem){
        const id = $elem.attr('id');
        if(!e.target.bind_search && this.checkEnabled(id)){
            e.target.bind_search = true;
            const callback = this.getCallback(id);
            const data = this.getData($elem);
            const defaultData = data.find(v => {
                return v.selected
            }) || data[0] || {
                name:''
            }
            const $input = $(`<input type="text" value="${defaultData.name}" autocomplete="off">`);
            const style = this.getStyle(e.target);
            const $wrap = $elem.attr('tabindex', '-1').wrap('<span class="search-wrap"></span>').parent().css(style);
            $input.appendTo($wrap).focus(()=>{
                $input.search({
                    nullable:true,
                    cache:true,
                    limit:10,
                    item:
                        `<li class="con-search-item<%selected($data)%>" data-index="<%$index%>">
                            <%if $data.label%>
                            <strong><%$data.label%></strong>
                            <%else%>
                            <%$data.name%>
                            <%/if%>
                        </li>`,
                    empty:
                        `<span>没有匹配到数据</span>`,
                    offset:{
                        top:3
                    },
                    selected(self, data){
                        return self.val === data.name
                    },
                    filter(self, source, value){
                        let labelCount = 0;
                        let array = source.filter(v => {
                            if(v.label){
                                labelCount++
                            }
                            if(v.label || v.name.indexOf(value) !== -1 || v.pinyin.find(v=>v.indexOf(value) === 0)){
                                return true
                            }
                        })
                        //搜索时，label也会包含在列表中，但真实的数据为空时，则不显示label
                        if(labelCount === array.length){
                            array = []
                        }
                        return array
                    },
                    data:() => {
                        return data
                    },
                    onShow(self){
                        //解决首次打开无法搜索bug
                        self._focus = true
                    },
                    onSelectBefore(self, data){
                        //label和禁用行不能选择
                        if(data.label || data.disabled){
                            return false
                        }
                    },
                    onSelect(self, data){
                        self.value(data.name)
                        $elem.val(data.value)
                        if(callback){
                            callback(data)
                        }
                    }
                }).search('show')
            })
            return $input
        }
    },
    getStyle(elem){
        const style = document.defaultView.getComputedStyle(elem, null);
        const names = ['maxWidth', 'minWidth', 'width', 'margin'];
        const data = {}
        names.forEach(name => {
            const value = style[name];
            if(/width$/i.test(name) && value === '0px'){
                return
            }
            data[name] = style[name]
        })
        return data
    },
    getData($elem, options = []){
        $elem.children().each((i, item) => {
            const $item = $(item);
            if(item.tagName === 'OPTION'){
                const text = $item.text();
                options.push({
                    value:item.value,
                    name:text,
                    pinyin:pinyin(text.replace(/\s+/g, '')) || [],
                    selected:item.selected,
                    disabled:item.disabled
                })
            }
            else if(item.tagName === 'OPTGROUP'){
                options.push({
                    label:$item.attr('label')
                })
                this.getData($item, options)
            }
        })
        return options
    }
})