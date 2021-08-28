class S_Socket_Client {

    constructor(name, url, callback) {
        this.name = name;
        this.url = url;
        this.checker(callback);
    }

    checker(callback) {
        fetch(this.url).then((data) => {
            if (data.status==200) return data.text()
            else return null;
        }).then((data) => {
            if(data){
                callback(data);
                this.checker(callback);
            }
            else if (data===null){
                callback('서버 오류 발생!');
                setTimeout(() => {this.checker(callback);}, 20*1000);   
            }
            else this.checker(callback);
        })
    }
}