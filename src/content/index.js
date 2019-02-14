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

//https://stackoverflow.com/questions/20381407/fire-onchange-event-on-page-from-google-chrome-extension
const changeEvent = document.createEvent('HTMLEvents');
changeEvent.initEvent('change', true, true);

events({
    events:{
        'keydown':'keydown',
        //鼠标悬停在select上时，初始化search
        'mouseover select':'search',
        //当按tab使select获得焦点时，初始化search
        'focus select':'search focus',
        //search组件中的input回车时取消默认行为（不设置会造成页面刷新）
        'keydown .search-wrap input':'inputKeydown',
        //任务单页面切换“状态”
        'change #issue_status_id':'statusChange',
        //任务单页面点击编辑（用mousedown代替click，用click会慢于自身的点击事件）
        'mousedown .contextual .icon-edit':'changeAssign',
        'mousedown .toggle-multiselect':'multiselect',
        //点击select右边的新增按钮
        'click img[alt="Add"]':'addSearchInput',
        'click #ajax-modal [type="submit"]':'destroySearch',
        'click #ajax-modal [type="button"]':'removeSearchInput',
        'click .search-wrap':(e, elem)=>{
            elem.children('input').focus()
        },
        'click .search-wrap input':(e)=>{
            e.stopPropagation()
        }
    },
    multiselect(e, $elem){
        const $wrap = $elem.prev('.search-wrap');
        if($wrap.length){
            $wrap.children('input').search('destroy')
            $wrap.remove();
            $elem.prev('select').removeClass('hide-select')[0].bind_search = false;
        }
    },
    //将“指派给”设置为任务单创作者
    changeAssign(){
        if(settings.assigned_author !== false && $('#update').is(':hidden')){
            $('#issue_assigned_to_id').val($('.author > .user').attr('href').replace('/users/', ''))
        }
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
    addSearchInput(e, $elem){
        const $searchWrap = $elem.parent().prev();
        if($searchWrap.hasClass('search-wrap')){
            this.$searchInput = $searchWrap.children('input');
        }
    },
    removeSearchInput(){
        this.$searchInput = null
    },
    destroySearch(){
        if(this.$searchInput){
            this.$searchInput.search('destroy');
            this.removeSearchInput()
        }
    },
    keydown(e){
        if(e.keyCode === 27){
            this.removeSearchInput()
        }
    },
    inputKeydown(e){
        if(e.keyCode === 13){
            e.preventDefault()
        }
    },
    focus(e, $elem, $input){
        $input && $input.focus()
    },
    //初始化search
    search(e, $elem, option){
        const target = e.target;
        if(!target.bind_search && !$elem.attr('multiple')){
            target.bind_search = true;
            let data = this.getData($elem);
            let selectedIndex = 0;
            let defaultData = data.find((v, i) => {
                if(v.selected){
                    selectedIndex = i;
                    return true
                }
                return false
            })
            if(!defaultData){
                data = data.map(v => {
                    v.index++
                    return v
                })
                data.unshift({
                    index:0,
                    name:'',
                    value:'',
                    pinyin:[],
                    selected:true,
                    disabled:false
                })
                defaultData = data[0]
            }
            const $input = $(`<input type="text" value="${defaultData.name}" autocomplete="off">`);
            const style = this.getStyle(target);
            const {height} = style;
            delete style.height;
            const $wrap = $('<span class="search-wrap"></span>').append($input.height(height)).css(style).insertAfter($elem.attr('tabindex', '-1').addClass('hide-select'))
            $input.appendTo($wrap).focus(()=>{
                $input.select().search({
                    nullable:true,
                    cache:true,
                    limit:10,
                    item:
                        `<li class="con-search-item<%selected($data)%><%$data.disabled ? ' s-dis' : ''%><%$data.indent ? ' s-ind' : ''%>" data-index="<%$index%>">
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
                    onInit(self){
                        target.searchObject = self;
                    },
                    onShow(self){
                        //解决首次打开无法搜索bug
                        self._focus = true
                    },
                    onSelectBefore(self, res){
                        //label和禁用行不能选择
                        if(res.label || res.disabled){
                            return false
                        }
                    },
                    onSelect(self, res){
                        data[selectedIndex].selected = false;
                        data[selectedIndex = res.index].selected = true;
                        self.value(res.name)
                        $elem.val(res.value)
                        target.dispatchEvent(changeEvent)
                    },
                    onDestroy(){
                        target.bind_search = false
                        $input.unwrap();
                        $input.remove();
                    },
                    onBlur(self){
                        const name = data[selectedIndex].name;
                        if(self.val !== name){
                            self.value(name)
                        }
                    },
                    ...option,
                }).search('show')
            })
            return $input
        }
    },
    getStyle(elem){
        const style = document.defaultView.getComputedStyle(elem, null);
        const names = ['maxWidth', 'minWidth', 'width', 'height', 'margin'];
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
    getData($elem, options = [], indent){
        $elem.children().each((i, item) => {
            const $item = $(item);
            if(item.tagName === 'OPTION'){
                const text = $item.text().trim();
                options.push({
                    indent,
                    index:options.length,
                    value:item.value,
                    name:text,
                    pinyin:pinyin(text.replace(/\s+/g, '')) || [],
                    selected:item.selected,
                    disabled:item.disabled
                })
            }
            else if(item.tagName === 'OPTGROUP'){
                options.push({
                    index:options.length,
                    label:$item.attr('label')
                })
                this.getData($item, options, true)
            }
        })
        return options
    }
})