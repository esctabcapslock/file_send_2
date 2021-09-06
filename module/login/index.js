var fs = require('fs');
const crypto = require('crypto');
console.log('process.cwd()',process.cwd(), __dirname)

const encrypt = ((val) => {
    let cipher = crypto.createCipheriv('aes-256-cbc', '1192f16753719483d1b0de41046ea2f4', 'e126cd4e2c172ffc');
    let encrypted = cipher.update(val, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  });
  
const decrypt = ((encrypted) => {
    let decipher = crypto.createDecipheriv('aes-256-cbc', '1192f16753719483d1b0de41046ea2f4', 'e126cd4e2c172ffc');
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    return (decrypted + decipher.final('utf8'));
});

//KEY can be generated as crypto.randomBytes(16).toString('hex');

const SHA512 = (txt)=>{
    //creating hash object 
    const hash = crypto.createHash('sha512');
    //passing the data to be hashed
    const data = hash.update('bfg'+txt, 'utf-8');
    //Creating the hash in the required format
    const gen_hash= data.digest('hex');
    //Printing the output on the console
    return gen_hash;
}

//레벨 관련.. 여기서는 1: 가벼운 사람, 2: 권한 있는 사람, 3: 관리자. 그외 유리수는 미정
//아님 소수로 해서 합성수는 소인수의 권한을 갖게... 2진법도 마찬가지 => 귀찮음.

const Login = {
    login_page_url : __dirname+'/auth/login.html',
    pw_change_url : __dirname+'/auth/change_pw.html',
    pw_url : __dirname+'/auth/auth_pw.txt',
    signup_page_url : __dirname+'/auth/signup.html',
    level_page_url : __dirname+'/auth/set_level.html',
    allowed_cookies:[],
    ip_create_account_count:{},
    iP_create_account_check:(ip)=>{ //같은 ip에서 요청 많이 해오면 블락
        console.log('[iP_create_account_check]',Login.ip_create_account_count);

        if(!Login.ip_create_account_count[ip]) Login.ip_create_account_count[ip]=1;
        else Login.ip_create_account_count[ip]++;
        if(Login.ip_create_account_count[ip]>5) return false;
        return true;
    },
    get_account_data:()=>{
        let data = fs.readFileSync(Login.pw_url).toString()
        if(!data) return [];

        data = data.split('\n').map(v=>{
            v = v.split(' ')
            return {level: Number(v[0]), account:decrypt(v[1]), pw: decrypt(v[2])}
        })
        return data;
    },
    check_pw:(value)=>{
        const data = Login.get_account_data();
        //console.log('계정 데이터',data);
        const authed = data.some(v=> value.account == v.account && value.pw == v.pw);
        return authed;
    },
    get_level:(value)=>{
        const data = Login.get_account_data();
        //console.log('ckd',data);
        for(let i=0; i<data.length; i++){
            if(data[i].account == value.account && data[i].pw == value.pw) return data[i].level;
        }
        return false;
    },
    set_level:(values, callback)=>{
        values = values.filter(v=>!isNaN(v.level)&&(typeof v.account=='string'));
        console.log('set_lev',values);
        const data = Login.get_account_data();
        //console.log('ckd',data);
        data.forEach(v=>{
            values.forEach(vv=>{
                if(v.account == vv.account) v.level = vv.level;
            })
        })
        Login.save_changed_account(data, callback);
    },
    check_overlap:(account)=>{
        const data = Login.get_account_data();
        console.log('ckd',data);
        const authed = data.some(v=> account == v.account);
        return authed;
    },
    add_account:(new_data)=>{
        console.log('[add_account]',new_data);
        const data = Login.get_account_data();
        console.log('ckd',data);
        data.push({level:1,account:new_data.account, pw:new_data.pw});

        Login.save_changed_account(data);
    },
    change_account:(value)=>{
        console.log('[add_account]',value);
        const data = Login.get_account_data();

        data.map((v,i,ar)=>{
            if(v.account == value.account) v.pw = value.next_pw;
        })
        Login.save_changed_account(data);
    },
    save_changed_account:(data, callback)=>{
        const print_data = data.map(v=>`${v.level} ${encrypt(v.account)} ${encrypt(v.pw)}`).join('\n');
        fs.writeFile(Login.pw_url, print_data, err=>{
            if(err) console.log('비번 저장 관련 오류',err);

            callback && callback(); //있으면 하기.
        })
        
    },
    create_cookie:(level)=>{
        const random = ()=>SHA512('emf'+Math.random())
        let cookie = random()
        while(Login.allowed_cookies.includes(cookie)) cookie = random() // 중복 방지.
        Login.allowed_cookies.push({cookie, level})
        console.log('[set_cookies]',Login.allowed_cookies)
        return cookie
    },
    remove_cookie:(cookie)=>{
        setTimeout(() => {
            Login.remove_cookie_now(cookie);
        }, 600*1000);
    },
    remove_cookie_now:(cookie)=>{
        let ind;
        for(ind=0; ind<Login.allowed_cookies.length && Login.allowed_cookies[ind].cookie!=cookie; ind++);
        console.log('쿠키삭제',ind);
        if (ind>=0 && ind<Login.allowed_cookies.length) Login.allowed_cookies.splice(ind,1)
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
    check_cookie:(cookie)=>{
        //[allowed, level]
        let ind;
        for(ind=0; ind<Login.allowed_cookies.length && Login.allowed_cookies[ind].cookie!=cookie; ind++);
        //console.log('쿠키체크',ind);
        if (ind<0 || ind>=Login.allowed_cookies.length) return [false, null];
        else return[true, Login.allowed_cookies[ind].level];
    },
    post:(req,res,callback)=>{
        body = '';
        req.on('data', (chunk)=>body += chunk);
        req.on('end', ()=>{
            if(!body||!body.includes('=')) {
                try{
                    const data=JSON.parse(body);
                    callback(req,res,data)
                }catch{Login.not_auth(res);}
            return;}

            const data = {}
            body.split('&').forEach(v=>{let vv = v.split('='); data[vv[0]] = vv.splice(1).join('=')});
            callback(req,res,data)
        })
    },
    not_auth:(res,err)=>{
        if(err) console.log('[not_auth]',err);

        res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<script>alert(\`${err}\`)</script><meta http-equiv="refresh" content="0;URL='/auth/login'"/>`)
    },
    server:(req,res,callback)=>{
        //console.log(req.headers.authorization)
        
        //const authentication = req.headers.authorization ? (new Buffer.from(req.headers.authorization.split(' ')[1], 'base64')).toString('utf8') : '';
        //console.log(authentication);
        const Auth_cookies = Login.parse_cookie(req.headers.cookie)['Auth']
        const [allowed, level] = Login.check_cookie(Auth_cookies)
        const method = req.method
        const url = req.url
        const referer = req.headers.referer
        const ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress;

        //console.log('로그인=> 상태가',allowed, level, url)

        //이상한 값 확인
        const id_regex = 	/^[a-zA-Z!@#$%^*+=\-0-9가-힣ㄱ-ㅎㅏ-ㅣ]{1,10}$/
        const pw_regex = /^[a-zA-Z!@#$%^*+=\-0-9]{1,30}$/;

        //url.startsWith('/auth/api/')
        if (['/auth/api/signin', '/auth/api/signup', '/auth/api/update_pw'].includes(url) && method=='POST') Login.post(req,res,(req,res,data)=>{
            if(typeof data.account =='string') data.account = decodeURIComponent(data.account); //아이디는 디코딩시켜거 알아보기 쉽게

            //비밀번호 보호를 위해 끄기 -> 해제하면 노출됨
            //console.log('[post_data]', data);

            
            // 비었으면 리턴
            if(!data.account || !data.pw || !id_regex.test(data.account) || !pw_regex.test(data.pw)) 
                {Login.not_auth(res,'올바른 아이디/비밀번호를 입력해주세요.'); return;}
            
            data.pw = SHA512(data.pw); //해싱

            //요청별로...
            if(!allowed && url=='/auth/api/signin' ){

                //인증 안되면 리턴
                const check = Login.check_pw(data);
                if(!check)  {Login.not_auth(res,'해당되는 계정은 존재하지 않습니다. 다시 입력해주세요'); return;}


                //쿠키설청
                const cookie = Login.create_cookie(Login.get_level(data));
                res.writeHead(200, {
                    'Content-Type':'text/html; charset=utf-8', 'Content-Location': '/', 
                    'Set-Cookie':[`Auth=${cookie}; Max-Age=600; path=/; HttpOnly`]
                });
                Login.remove_cookie(cookie)
                res.end(`<meta http-equiv="refresh" content="0;URL='/'"/>`);
            }
            else if (!allowed && url=='/auth/api/signup'){

                if(data.pw_2) data.pw_2 = SHA512(data.pw_2); //해싱                

                //두 비번 다르면 리턴
                if(data.pw!=data.pw_2) {Login.not_auth(res,'입력된 두 비밀번호가 일치하지 않음'); return;}
                
                //아이디 중복시 리턴
                if(Login.check_overlap(data.account))
                {Login.not_auth(res,'아이디 중복됨'); return;}

                //ip당 제한하기
                if(!Login.iP_create_account_check(ip))
                    {Login.not_auth(res,'너무 많은 계정 생성됨'); return;}
                
                //아이디 추가
                Login.add_account(data);
                res.end(`<meta http-equiv="refresh" content="0;URL='/auth/login'"/>`);
                
            }else if(allowed && url=='/auth/api/update_pw'){
                
                //형식확인
                if(!pw_regex.test(data.next_pw)) {Login.not_auth(res,'비밀번호 형식을 만족하지 않음'); return;}
                
                //두 비번 다르면 리턴
                if(data.next_pw!=data.next_pw_2) {Login.not_auth(res,'입력된 두 비밀번호가 일치하지 않음'); return;}

                //변경하기
                data.next_pw = SHA512(data.next_pw); //해싱
                Login.change_account(data);
                res.end(`<meta http-equiv="refresh" content="0;URL='/'"/>`);
            }
            else {Login.not_auth(res); return;};
        })
        else if(!allowed && url=='/auth/login'){ //로그인
            const file = fs.readFileSync(Login.login_page_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }else if(!allowed && url=='/auth/signup'){ //회원가입
            const file = fs.readFileSync(Login.signup_page_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }else if(!allowed){ //인증X인 기타경우
            res.writeHead(401, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<meta http-equiv="refresh" content="0;URL='/auth/login'" /> `)
        }else if(['/auth/login','/auth/signup'].includes(url)){ //인증하고, 로그인/회원가입 시도시 거부...
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<meta http-equiv="refresh" content="0;URL='/'" /> `)
        }
        else if(url=='/auth/edit_pw'){
            const file = fs.readFileSync(Login.pw_change_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }
        else if(url=='/auth/logout'){
            Login.remove_cookie_now(Auth_cookies)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end('<meta http-equiv="refresh" content="0;URL=\'/\'" />')
        }
        else if(url=='/auth/set_level'){
            if(level<3) {Login.not_auth(res,'권한이 없습니다'); return;}

            const file = fs.readFileSync(Login.level_page_url)
            res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
            res.end(file);
        }
        else if(url=='/auth/api/get_level'){
            if(level<3) {Login.not_auth(res,'권한이 없습니다'); return;}

            const data = Login.get_account_data().map(v=>{delete v.pw; return v;});
            res.writeHead(200,{'Content-Type': 'application/json; charset=utf8'});
            res.end(JSON.stringify(data));
        }
        else if(url=='/auth/api/set_level' && method=='POST'){
            if(level<3) {Login.not_auth(res,'권한이 없습니다'); return;}

            Login.post(req,res,(req,res,data)=>{
                console.log('권한설정',data);
                
                Login.set_level(data, ()=>{res.writeHead(200); res.end('ok')});
                
            })
        }
        else callback(req, res, level)    
    }
}

module.exports.Login = Login