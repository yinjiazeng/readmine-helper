import './style.less';
import 'nuijs/components/search';
import {events} from 'nuijs/core';
import pinyin from './pinyin';

events({
    events:{
        'mouseover select':'search',
        'focus select':'search focus',
        'keydown .search-wrap input':'keydown',
        'change #issue_status_id':'statusChange'
    },
    callbacks:{
        project_quick_jump_box(data){
            if(data.value){
                window.location = data.value;
            }
        }
    },
    getCallback(id){
        for(let i in this.callbacks){
            if(i === id){
                return this.callbacks[i]
            }
        }
    },
    checkEnable(id){
        return [
            'issue_assigned_', 
            'values_assigned_', 
            'values_author_', 
            'values_watcher_',
        ].find(v => id.indexOf(v) === 0) || [].includes(id)
    },
    statusChange(e, $elem){
        if($elem.val() == 3){
            $('#issue_done_ratio').val(100);
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
    search(e, $elem){
        const id = $elem.attr('id');
        if(!e.target.bind_search && this.checkEnable(id)){
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
                        if(labelCount === array.length){
                            array = []
                        }
                        return array
                    },
                    data:() => data,
                    onShow(self){
                        self._focus = true
                    },
                    onSelectBefore(self, data){
                        if(data.label || data.disabled){
                            return false
                        }
                    },
                    onSelect(self, data){
                        self.value(data.name)
                        $elem.val(data.value).change()
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
                    pinyin:pinyin(text.replace(/\s+/g, '')),
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