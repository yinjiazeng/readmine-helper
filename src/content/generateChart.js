import { events } from 'nuijs/core';
import layer from 'nuijs/components/layer/layer';
import request from '../utils/request';
import moment from 'moment';

export default function() { 
    //必须是问题页面
    if (/\/issues$/.test(location.pathname)) { 
        const query_form_with_buttons = document.getElementById('query_form_with_buttons');
        const buttons = query_form_with_buttons.querySelector('p.buttons');
        const generate = document.createElement('a');
        generate.href = 'javascript:void(0);';
        generate.className = 'icon j-generate-chart';
        generate.innerText = '生成图表';
        buttons.appendChild(generate);
        return events.call(this, {
            events: {
                'click .j-generate-chart': 'checkUrl getSettings generate'
            },
            generate(e, elem, settings) {
                if (!settings.username || !settings.password) { 
                    alert('请在在插件设置页面填入用户名、密码');
                    return false;
                }
                if (!elem.hasClass('loading')) { 
                    elem.addClass('loading').html('生成中...');

                    new Promise((resolve, reject) => {
                        let issues = [];
                        const generateRequest = (page = 1) => {
                            request(location.pathname + '.json', {
                                body: `${$('#query_form').serialize()}&page=${page}&limit=100&sort=created_on:asc`
                            }, settings).then(data => {
                                issues = issues.concat(data.issues);
                                if (data.total_count > issues.length) {
                                    generateRequest(page + 1);
                                }
                                else {
                                    if (issues.length) {
                                        resolve(issues);
                                    }
                                    else {
                                        reject('没有搜索到数据，请更改筛选条件');
                                    }
                                }
                            }).catch(e => {
                                reject('操作失败，请重试');
                            })
                        }
                        generateRequest();
                    }).then(issues => {
                        return Promise.all([
                            //获取状态类型
                            request('/issue_statuses.json', {}, settings),
                            //获取优先级类型
                            request('/enumerations/issue_priorities.json', {}, settings),
                            //获取用户当前信息
                            request('/users/current.json', {}, settings),
                            //问题列表
                            Promise.resolve(issues),
                        ])
                    }).then((datas) => {
                        //状态条形图数据
                        const statuses = {};
                        //优先级条形图数据
                        const priorities = {};
                        //以日期为key，存储当天数据
                        const temp = {};
                        //问题列表数据
                        const issues = datas[3];
                        //趋势图数据
                        const source = [];
                        //系统当前日期
                        // const systemDate = datas[2].user.last_login_on.substr(0, 10);
                        //问题单最初创建时间
                        // let currentDate;
                        //初始化状态数据
                        let _statuses;

                        datas[0].issue_statuses.forEach(ele => {
                            statuses[ele.name] = 0;
                        });

                        _statuses = { ...statuses };

                        datas[1].issue_priorities.forEach(ele => {
                            priorities[ele.name] = 0;
                        });

                        issues.forEach(ele => {
                            ele.create_date = ele.created_on.substr(0, 10);
                            const { status, priority } = ele;
                            let data = temp[ele.create_date];
                            if (!data) {
                                data = temp[ele.create_date] = {
                                    date: ele.create_date,
                                    '缺陷总数': 0,
                                    ..._statuses
                                }
                                source.push(data);
                            }
                            data['缺陷总数']++;
                            data[status.name]++;
                            statuses[status.name]++;
                            priorities[priority.name]++;
                        });
                        
                        // currentDate = issues[0].create_date;

                        //日期不能断
                        // while (currentDate <= systemDate) {
                        //     if (!temp[currentDate]) {
                        //         temp[currentDate] = {
                        //             date: currentDate,
                        //             '缺陷总数': 0,
                        //             ..._statuses
                        //         }
                        //     }
                        //     source.push(temp[currentDate]);
                        //     currentDate = moment(currentDate).add(1, 'day').format('YYYY-MM-DD');
                        // }

                        source.forEach((ele, i) => {
                            //获取昨天数据，进行累计
                            const yesterdayData = source[i - 1];
                            if (yesterdayData !== undefined) {
                                for (let key in ele) {
                                    if (key !== 'date') {
                                        ele[key] += yesterdayData[key]
                                    }
                                }
                            }
                        });

                        layer({
                            title: '统计图表',
                            width: 1100,
                            edge: 20,
                            template:
                                `<div style="padding: 20px 20px 0;">
                                    <div id="trend-chart" style="width: 100%; height: 400px; margin-bottom: 20px;"></div>
                                    <div id="status-chart" style="width: 100%; height: 400px; margin-bottom: 20px;"></div>
                                    <div id="priority-chart" style="width: 100%; height: 400px; margin-bottom: 20px;"></div>
                                </div>`,
                            cancel: {
                                enable: false
                            },
                            trendChart() { 
                                const legend = ['缺陷总数', 'Resolved', 'Closed'];
                                return {
                                    color: ['#3398DB', '#AC5A59', '#9BB85B'],
                                    title: {
                                        text: '缺陷趋势图',
                                    },
                                    legend: {
                                        data: legend,
                                        top: 30
                                    },
                                    xAxis: {
                                        type: 'category',
                                        axisLabel : {
                                            rotate: '45'
                                        },
                                        data: source.map(v => v.date)
                                    },
                                    yAxis: {
                                        type: 'value'
                                    },
                                    series: legend.map((v, i) => { 
                                        return {
                                            type: 'line',
                                            name: v,
                                            label: {
                                                show: true
                                            },
                                            symbol: 'none',
                                            data: source.map(ele => ele[v])
                                        }
                                    })
                                }
                            },
                            statusChart() { 
                                const xDatas = [];
                                const values = [];
                                for (let i in statuses) { 
                                    xDatas.push(i);
                                    values.push(statuses[i]);
                                }
                                return {
                                    color: ['#3398DB'],
                                    title: {
                                        text: '状态分布图'
                                    },
                                    xAxis: [
                                        {
                                            type: 'category',
                                            axisLabel : {
                                                rotate: '45'
                                            },
                                            data: xDatas
                                        }
                                    ],
                                    yAxis: [
                                        {
                                            type: 'value'
                                        }
                                    ],
                                    series: [
                                        {
                                            type: 'bar',
                                            label: {
                                                show: true
                                            },
                                            data: values
                                        }
                                    ]
                                }
                            },
                            priorityChart() { 
                                const xDatas = [];
                                const values = [];
                                for (let i in priorities) { 
                                    xDatas.push(i);
                                    values.push(priorities[i]);
                                }
                                return {
                                    color: ['#3398DB'],
                                    title: {
                                        text: '优先级分布图'
                                    },
                                    xAxis: [
                                        {
                                            type: 'category',
                                            data: xDatas
                                        }
                                    ],
                                    yAxis: [
                                        {
                                            type: 'value'
                                        }
                                    ],
                                    series: [
                                        {
                                            type: 'bar',
                                            label: {
                                                show: true
                                            },
                                            data: values
                                        }
                                    ]
                                }
                            },
                            initCharts() { 
                                this.charts = [];
                                Array.prototype.slice.apply(arguments).map(ele => {
                                    const dom = document.getElementById(ele + '-chart');
                                    const echart = echarts.init(dom);
                                    echart.setOption({
                                        title: {
                                            left: 'center'
                                        },
                                        toolbox: {
                                            feature: {
                                                saveAsImage: {}
                                            }
                                        },
                                        tooltip: {
                                            trigger: 'axis'
                                        },
                                    });
                                    echart.setOption(this[ele + 'Chart']());
                                    this.charts.push(echart);
                                });
                            },
                            onInit(self) { 
                                this.initCharts('trend', 'status', 'priority');
                                self.resize();
                            },
                            onResize() { 
                                this.charts.forEach(ele => {
                                    ele.resize();
                                });
                            },
                            onDestroy() { 
                                this.charts.forEach(ele => {
                                    ele.dispose();
                                });
                                this.charts = null;
                            }
                        })
                    }).catch(e => {
                        if (typeof e === 'string') {
                            alert(e);
                        }
                        else { 
                            alert('程序错误，请打开控制台查看报错信息');
                            throw e;
                        }
                    }).finally(() => { 
                        elem.removeClass('loading').html('生成图表');
                    })
                }
            }
        });
    }
}