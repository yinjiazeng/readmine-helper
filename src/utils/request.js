/**
 * @func fetch拦截器
 */

import qs from 'qs';
import service from './service';
import {Base64} from 'js-base64';

export default function(id, options = {}, settings) {
    return new Promise((resolve, reject) => {
        let {url, username, password} = settings || JSON.parse(localStorage.getItem('settings') || '{}');
        if (username && password) {
            
            const rule = /\.json$/.test(id) ? id : service[id];

            if(url && !/\/$/.test(url)){
                url += '/'
            }

            if(!rule){
                reject()
                return
            }

            const temp = rule.split(':');
            let _url = temp[0], _method = temp[1] || 'get';

            if(!options.method && _method){
                options.method = _method
            }

            const {method} = options;

            const headers = {
                'Content-Type':`application/x-www-form-urlencoded;charset=UTF-8`,
                'Authorization':`Basic ${Base64.encode(username + ':' + password)}`
            }
            
            const isGet = method.toLowerCase() === 'get';

            let data = options.body || '';

            if(typeof data === 'object'){
                data = qs.stringify(data)
            }

            options.headers = {...options.headers, ...headers}

            if (url && !/^(https?:)?\/?\//.test(_url)) { 
                _url = url + _url;
            }

            //no cache
            _url += '?_=' + new Date().getTime()

            if(isGet){
                if(data){
                    _url += '&' + data
                    delete options.body
                }
            }
            else{
                options.body = data
            }

            //请求时携带cookie，不然后台会做登录拦截
            if(!options.credentials){
                options.credentials = 'same-origin'
            }

            fetch(_url, options)
                .then(res => {
                    if(res.status === 200){
                        resolve(res.json())
                    }
                    else{
                        reject(res.status)
                    }
                }).catch(() => {
                    reject()
                })
        }
        else{
            reject()
        }
    })
}