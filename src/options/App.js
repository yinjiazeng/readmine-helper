import React, {Component} from 'react';
import {Input, Form, Checkbox, Switch, Button, message} from 'antd';
import data from './data';

const formItemLayout = {
    labelCol: {
      sm: { span: 4 },
    },
    wrapperCol: {
      sm: { span: 20 },
    },
}

message.config({
    top: 100,
    duration: 2,
    maxCount: 1,
});

class App extends Component {

    constructor(props){
        super(props)
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        this.state = settings
    }

    handleSubmit = (e) => {
        e.preventDefault()
        this.props.form.validateFields((err, values) => {
            if(!err){
                localStorage.setItem('settings', JSON.stringify(values))
                chrome.runtime.sendMessage({settings:values})
                message.success('设置成功')
            }
        })
    }

    render(){
        const {state, props} = this;
        const {getFieldDecorator} = props.form;
        return (
            <div style={{padding:20}}>
                <h1 style={{marginBottom:20, paddingBottom:4, borderBottom:'1px solid #cecece'}}>设置</h1>
                <Form onSubmit={this.handleSubmit} style={{width:480}}>
                    <Form.Item
                        {...formItemLayout}
                        label="域名"
                        >
                        {getFieldDecorator('domain', {
                            initialValue:state.domain
                        })(
                            <Input />
                        )}
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        label="用户名"
                        >
                        {getFieldDecorator('username', {
                            initialValue:state.username
                        })(
                            <Input />
                        )}
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        label="密码"
                        >
                        {getFieldDecorator('password', {
                            initialValue:state.password
                        })(
                            <Input />
                        )}
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        label="自动跟踪"
                        >
                        {getFieldDecorator('tracks', { valuePropName: 'checked' })(
                            <Switch />
                        )}
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        label="美化选择框"
                        >
                        {getFieldDecorator('beautify', {
                            initialValue:state.beautify || []
                        })(
                            <Checkbox.Group style={{ width:"100%"}}>
                                {
                                    data.map(v => {
                                        return <Checkbox key={v.id} value={v.id} style={{display:'block', marginLeft:8, marginBottom:4}}>{v.name}</Checkbox>
                                    })
                                }
                            </Checkbox.Group>
                        )}
                    </Form.Item>
                    <Form.Item
                        {...formItemLayout}
                        colon={false}
                        label="&nbsp;"
                        >
                        <Button type="primary" htmlType="submit">保 存</Button>
                    </Form.Item>
                </Form>
            </div>
        )
    }
}

export default Form.create()(App)