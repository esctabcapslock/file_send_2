//similar_socket
//const os = require('os');

//res는, http 의 res 객체..

class S_Socket_Server {

    constructor(name, value) {
        this.name = name;
        this.value = value;
        this.res_list = [];
        this.log('constructor '+name);
        this.interval()
    }
    change_value(value, callback) {
        //console.log('[change_value]',value)
        if(this.value==value) return;
        this.value = value;
        this.onchange(callback);
    }
    add_value(add_val) {
        try{
            this.change_value(this.value+add_val, ()=>{})
        }
        catch{
            this.log("can not add" , add_val, this.value)
        }
    }

    add_res(res) {  
        this.res_list.push(res);
    }

    interval() {
        this.log('interval')
        this.flag = setInterval(() => {
            this.onchange(()=>{})
            //this.log('interval roop')
        }, 25000);
    }

    onchange(callback) {
        //this.log('onchange');
        while (this.res_list.length) {
            var res = this.res_list.pop();
            this.send_res(res, callback);
        }
    }

    send_res(res, callback) {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });
        res.end(this.value);
        callback();
    }
    log(str){
        console.log(`S_Socket_Server\\${this.name}>`,str);
    }
}


module.exports.S_Socket_Server = S_Socket_Server;