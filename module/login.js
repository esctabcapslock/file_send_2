const SHA512 = require("./sha512").SHA512
var fs = require('fs');
const crypto = require('crypto');

const encrypt = ((val) => {
    let cipher = crypto.createCipheriv('aes-256-cbc', '6da2a078bd56ec4205559a7cb07f025c', '083154fa848405b7');
    let encrypted = cipher.update(val, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  });
  
const decrypt = ((encrypted) => {
    let decipher = crypto.createDecipheriv('aes-256-cbc', '6da2a078bd56ec4205559a7cb07f025c', '083154fa848405b7');
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    return (decrypted + decipher.final('utf8'));
});

const Login = {
    login_page_url : './asset/login.html',
    pw_change_url : './asset/change_pw.html',
    pw_url : './asset/auth_pw.txt',
    allowed_cookies:[],
    check_pw:(pw)=>{
        let data = fs.readFileSync(Login.pw_url).toString()
        data = decrypt(data)
        return pw==data
    },
    create_cookie:()=>{
        const random = ()=>SHA512('emf'+Math.random())
        let cookie = random()
        while(Login.allowed_cookies.includes(cookie)) cookie = random() // 중복 방지.
        Login.allowed_cookies.push(cookie)
        console.log('set_cookies',Login.allowed_cookies)
        return cookie
    },
    remove_cookie:(cookie)=>{
        setTimeout(() => {
            const ind =  Login.allowed_cookies.indexOf(cookie)
            console.log('쿠키삭제',ind);
            if (ind>=0) Login.allowed_cookies.splice(ind,1)
        }, 600*1000);
    },
    remove_cookie_now:(cookie)=>{
        const ind =  Login.allowed_cookies.indexOf(cookie)
        console.log('쿠키삭제',ind);
        if (ind>=0) Login.allowed_cookies.splice(ind,1)
    },
    parse_cookie:(str)=>{
        //console.log(str, typeof(str))
        let out={}
        if(typeof(str)=='string') str.split(';').forEach(i=>{
            var d=i.trim().split('=');
            out[d[0]]=d[1]
        })
        return out
    },
    allowed:(cookie_str)=>{
        if (!cookie_str) return false;
        const Auth_cookies = Login.parse_cookie(cookie_str)['Auth']
        return Login.allowed_cookies.includes(Auth_cookies);
    },
    server:(req,res,callback)=>{
        const Auth_cookies = Login.parse_cookie(req.headers.cookie)['Auth']
        const allowed = Login.allowed_cookies.includes(Auth_cookies)
        const method = req.method
        const url = req.url
        const referer = req.headers.referer
        let level = 0;


        if (!allowed && url=='/auth/value' && method=='POST'){
            var body='';
            req.on('data', (chunk)=>body += chunk);
            req.on('end', ()=>{
                if(body.includes('=') && Login.check_pw(body.split('=')[1])){
                    const cookie = Login.create_cookie()
                    res.writeHead(200, {
                        'Content-Type':'text/html; charset=utf-8', 'Content-Location': '/', 
                        'Set-Cookie':[`Auth=${cookie}; Max-Age=600; path=/; HttpOnly`]
                    });
                    Login.remove_cookie(cookie)
                }else res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8' });

                res.end('<meta http-equiv="refresh" content="0;URL=\'/\'" />')
            })
        }
        else if(!allowed && url=='/'){
            const file = fs.readFileSync(Login.login_page_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }else if(!allowed){
            res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8' });
            res.end('<meta http-equiv="refresh" content="0;URL=\'/\'" /> ')
        }
        else if(url=='/auth/edit/pw'){
            const file = fs.readFileSync(Login.pw_change_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }
        else if(url=='/auth/update/pw' && referer && method=='POST'){
            var data=[];
            req.on('error', () => {_404(res,url, 'post err, else;'); });
            req.on('data', (chunk) => {data.push(chunk)});
            req.on('end', () => {
                data = Buffer.concat(data).toString()
                data = data.split('&').map(v=>v.includes('=')?decodeURIComponent(v.split('=')[1]):'')
                console.log('data',data)
                res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });

                if(data.length==3 && data[1]===data[2] && data[1] && Login.check_pw(data[0])){
                    const pw = encrypt(data[2]);
                    //console.log('new pw',pw)
                    fs.writeFileSync(Login.pw_url, pw);
                    res.end('<script>alert("비밀번호 변경 성공"); location="/";</script>');

                }else res.end('<script>alert("비밀번호 변경 실패"); location="/auth/edit/pw";</script>');
            })
        }
        else if(url=='/auth/logout'){
            Login.remove_cookie_now(Auth_cookies)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end('<meta http-equiv="refresh" content="0;URL=\'/\'" />')
        }
        else callback(req, res, level)    
    }
}

module.exports.Login = Login