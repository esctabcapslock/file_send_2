var http = require('http');
var fs = require('fs');
const port = 80;
const make_index_html = require('./module/index_html').make_index_html
const Login = require('./module/login').Login
const NFD2NFC = require('./module/NFC-NFD').NFD2NFC
const S_Socket_Server = require("./module/s_socket_server").S_Socket_Server;
const file_list_html = new S_Socket_Server('file_list_html',file_list_2_html())


const iconvlite = require('iconv-lite');

//내 주소 알아내기
const my_ip = require("./module/my_ip").my_ip();
console.log('내 컴퓨터 주소:',my_ip)

//파일 폴더 열기 (내장모듈)
// const exec = require('child_process').exec;
// exec('Explorer %cd%\\files ', {encoding: 'utf-8'},(err,result,stderr) => {})
// exec(`Explorer http://${my_ip[0]}`, {encoding: 'utf-8'},(err,result,stderr) => {})

function ok(xx){
    var a = `\/:"'?<>|*`;
    for (var i=0; i<a.length; i++){
        if (xx.includes(a[i])) return 0;
    }
    return 1;
}
function is(xx){
    if (!xx.includes(`/files/`)) return 0;
    var yy = xx.substr(`/files/`.length);
    if (!ok(yy)) return 0;
    return yy;
}

function file_list_2_html(){
    파일목록 = fs.readdirSync('./files')
    return 파일목록.map(v=>`<li><a href="./files/${v}"><pre>${v}</pre></a> <a href="./delete/${v}">삭제</a></li>`).join('')
}



var server = http.createServer((요청, 응답) => { Login.server(요청, 응답, (요청, 응답)=>{

    const _url = 요청.url;
    const url_list = _url.split('/')
    const _method = 요청.method;
    const _ip = 요청.headers['x-forwarded-for'] ||  요청.connection.remoteAddress
    console.log(_ip, decodeURIComponent(_url),_method);

    
    if (_url == '/' && _method == "GET") {
        응답.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
        응답.end(make_index_html(file_list_2_html()));
    }
    else if (_url=='/file_list_html') file_list_html.add_res(응답)
    else if (_url=='/s_socket_client.js'){
        const file = fs.readFileSync('./asset/s_socket_client.js');
        응답.writeHead(200, {'Content-Type': 'text/JavaScript; charset=utf-8' });
        응답.end(file);
    }else if (_url=='/jszip.js'){
        const file = fs.readFileSync('./asset/jszip.min.js');
        응답.writeHead(200, {'Content-Type': 'text/JavaScript; charset=utf-8' });
        응답.end(file);
    }else if (_url == '/file' && _method == 'POST') {
        
        const df = x => x.replace(/\n/g,'\\n+\n').replace(/\r/g,'\\r')
        const positive = x => x>0?x:0

        //let post_data = [];
        //https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST
        //let file_list = fs.readdirSync('./files')
        const promise_list = [];
        let post_data_len = 0
        let file_size_maximum = 1*1024*1024*1024
        let past_data = Buffer.from([])
        let file_name = ''
        let boundary = ''
        let 단계 = 1; // 0: 시작안함. 1: 해더 분석중, 2: 본문 내용 파싱, 3: 다음 바운더리 찾기.
        let front = end = 0
        let 진행중 = true
        let 오류 = false
        // let cnt = 0
        let stream
        let mylog = ()=>{}//console.log// ()=>{}//console.log
        
        요청.on('data', (data) => {
            // let now_cnt = cnt;
            // cnt++;
            if (file_size_maximum<post_data_len) {
                if(!오류){
                    console.log('용량초과')
                    요청.emit('error'); 
                    오류 = true;
                }
                //요청.pause()
                //요청.destroy()
                //요청.destroy(Error('Payload Too Large'))
                return;
            }
                
            if (!진행중) return;
            mylog('\n\ndata 조각 받음',data.length, post_data_len, file_size_maximum, past_data.length,'[진행중]',진행중,'단계',단계, '[file_name]',file_name)
            let 아무것도안함 = true;
            let 루프 = true
            post_data_len+=data.length

            now_data  = Buffer.concat([past_data, data]);
            //console.log('\nnow_data - 받음.\n',df(now_data.toString()),'끝!\n');

            let cnt_tmp = 0
            while(루프){
                
                if (단계==1){
                    end = now_data.indexOf('\n', front)
                    if (end==-1) 루프=false; //시작할 수 없음!
                    

                    while(true){
                        아무것도안함 = false;

                        let tmp = now_data.slice(front, end-1).toString()
                        mylog('tmp',front, end, tmp.length, tmp.length<100?(df(tmp)):'[생략]')
        
                        if (!boundary) boundary = tmp;
                        if (!file_name && tmp.includes('Content-Disposition:') && tmp.includes('filename=')){
                            let foo = tmp.substring(tmp.indexOf('filename=')+9,tmp.length)
                            file_name = foo.substring(1, foo.substr(1).indexOf('"')+1 )
                            //file_name = foo.substring(1,foo.length-1)
                            console.log('[file_name]',file_name)
                            file_name=NFD2NFC(file_name)
                            file_name=file_name.match(/\s|[()]|[+-.]|[0-9]|@|[A-Z]|\[|\]|_|[a-z]|[가-힣]|[ㄱ-ㅎ]|[ᄀ-ᅞ]|[ᅡ-ᇿ]/g) //일부 문자(한/영)만 허용함.
                            if(Array.isArray(file_name)) file_name=file_name.join('').substr(0,100) //파일 이름은 글자 수 100자 이내
                            else file_name=''
                            console.log('[file_name]',file_name)

                            if(fs.existsSync('./files/'+file_name)||fs.existsSync('./tmp/'+file_name)){
                                file_name=''
                                if(stream) {stream.end(); stream=null}
                            }else{
                                stream = fs.createWriteStream('./tmp/'+file_name,{flags:'wx'})
                            }
                        }
                        front = end+1; end = now_data.indexOf('\n', end+1);
                        if (end==-1) 루프=false; //시작할 수 없음!
                        if(!tmp || !tmp.length){
                            단계=2;
                            break;
                        } 
                    }
                }
                if (단계==2){

                    end = now_data.indexOf(boundary, front)-2;
                    
                    if (end==-3) {
                        //console.log('-1임..',end)
                        if (boundary.length < data.length){ // 바운더리가 없는 경우에는... past_data 부분만 생각하자.
                            end = past_data.length;
                        }else{ //데이터 안에 boundary가 들어 있을 수 있음.
                            break; //다음으로 넘기자.
                        }
                        루프 = false;
                        
                        //console.log('-1임.. 후',end)
                    }
                    else{
                        mylog('-1 아님음..',end)
                        단계=3
                        //end+=2;
                    }
                    if (!file_name) {아무것도안함=false; break;}

                    let filedata = now_data.slice(front, end)
                    아무것도안함 = false;
                    mylog('[데이터 부분] front-end', front, end, past_data.length, data.length,  now_data.length, file_name, '[boundary]', df(boundary), '[file_name]', file_name, '[data_tmp]',filedata.length)
                    if(file_name && stream){
                        let dnyp = stream.write(filedata)// fs.appendFileSync('./files/'+file_name, filedata)
                        mylog('데이터 조각 저장',dnyp)
                        // fs.appendFile('./files/'+file_name, filedata, null, (E) => {
                        //     if(E) console.log('파일 오류', E);
                        // })
                    }

                    
                }

                if (단계==3){
                    //file_list.push(file_name)
                    const p1 = new Promise((resolve, reject)=>{
                        let callback = (name=>{return ()=>{
                            console.log('스트림 종료!!', name)
                            
                            fs.rename('./tmp/'+name, './files/'+name, (err)=>{
                                if(err){
                                    console.log(err)
                                    resolve()
                                } 
                                else{
                                    console.log('성공적으로 옮겨짐.')
                                    resolve(name)
                                }
                            })
                            
                        }})(file_name);
                        if(stream) stream.end(callback)
                        else resolve()
                    })
                    promise_list.push(p1)

                    file_name = ''
                    stream = null
                    아무것도안함 = false;
                    end+=2;

                    front = end; end = now_data.indexOf('\n', end);
                    boundary = now_data.slice(front, end)
                    boundary = boundary.toString()
                    mylog('front-end', front, end, 'new boundary', df(boundary))
                    boundary = boundary.replace(/\r/g,'').replace(/\r\n/g,'')

                    
                    
                    front = end+1; end = now_data.indexOf('\n', end+1);
                    단계 = 1

                    if (boundary.endsWith('--')) {
                        break;
                        진행중 = false;
                    }
                    
                }
            }

            if (아무것도안함) past_data = now_data
            else {
                //위치 조절하기.
                front = positive(front - past_data.length)
                end = positive(end - past_data.length)
                past_data = data
            }
        });
        요청.on('end', () => {
            if(stream) stream.end()
            stream=null;

            console.log('[promise_list]',promise_list)

            Promise.all(promise_list).then(d=>{file_list_html.change_value(file_list_2_html(),()=>{})}).catch(err=>file_list_html.change_value(file_list_2_html(),()=>{}))
            
            
            if (file_size_maximum<post_data_len){//file_size_maximum(1GB)가 넘는 파일을 보냈을 때,
                응답.writeHead(413, {'Content-Type': 'text/html; charset=utf-8'});
                응답.end('<script>alert("Payload Too Large"); location="/";</script>');
                return;
            }
            응답.writeHead(303, {'location': '/'});
            응답.end('.')
            
            return;
        })
        요청.on('error',()=>{
            console.log('[pause event]')
            if(stream) {stream.end(); stream=''}
            if(file_name && fs.existsSync('./tmp/'+file_name)){
                fs.unlink('./tmp/'+file_name,err=>{
                    if(err)console.log('err>Err',err)
                    file_name=''
                })
            }
            //응답.writeHead(413, {'Content-Type': 'text/html; charset=utf-8'});
            //응답.end(`<script>alert("너무 긴(${parseInt(file_size_maximum/1024/1024)}MB) 파일"); location="/";</script>`);
        })
    }
    else if(_url=='/html'){
        var 데이터 = file_list_2_html()
        file_list_html.change_value(데이터,()=>{})
        var 확장자 = 'text/html; charset=utf-8';
        응답.writeHead(200, {'Content-Type':확장자,'Accept-Ranges': 'bytes', 'Content-Length':  Buffer.byteLength(데이터, 'utf8').toString()} );
        응답.end(데이터);
    }
    else if(url_list[1]=='files' && ok(decodeURIComponent(url_list[2])) && fs.existsSync('./files/'+decodeURIComponent(url_list[2]))){
        
        const file_name = decodeURIComponent(url_list[2])
        const encoding_file_name = iconvlite.decode(iconvlite.encode(file_name, "UTF-8"), 'ISO-8859-1');
        
        const file_url=`./files/`+file_name;
        console.log('[file_url]',file_url)
            
        const 확장자='application/octet-stream';
        console.log(file_name,'file_name', encoding_file_name)
        응답.writeHead(200, {
            'Content-Type':확장자, 
            'Accept-Ranges': 'bytes',
            'Content-Transfer-Encoding': 'binary',
            'Content-disposition': `attachment; filename="${encoding_file_name}"`//encodeURICmponent
        });

        var stream = fs.createReadStream(file_url);
        var count = 0;
        var length = 0;
        stream.on('data', function(data) {
            count++;
            length+=data.length;
            if(!(count%50)) console.log('data count='+count/50);
            응답.write(data);
        });

        stream.on('end', function () {
            console.log('end streaming', length);
            응답.end();
        });

        stream.on('error', function(err) {
            console.log('err');
            응답.end('500 Internal Server '+err);
        });
    }
    else if(url_list[1]=='delete' && ok(decodeURIComponent(url_list[2])) && fs.existsSync('./files/'+decodeURIComponent(url_list[2]))){
        const file_name = decodeURIComponent(url_list[2])
        const file_url=`./files/`+file_name;
        fs.unlink(file_url,err=>{
            if(err) console.log('[파일 삭제 오류]',err)
            file_list_html.change_value(file_list_2_html(),()=>{})
            응답.writeHead(303, {'location': '/'});
            응답.end('.')
        })
    }
    else{
        응답.writeHead(404,{'Content-Type': 'text/html; charset=utf-8'});
        응답.end("404 not found");
    }
})});

server.listen(port);
console.log(`${port}번 포트에서 실행. \n종료: Ctrl+C 또는 현재 창 닫기`)
