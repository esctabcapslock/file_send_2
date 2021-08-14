var http = require('http');
var fs = require('fs');
const port = 80;

//내 주소 알아내기
const my_ip = require("./my_ip").my_ip();
console.log('내 컴퓨터 주소:',my_ip)

//파일 폴더 열기 (내장모듈)
// const exec = require('child_process').exec;
// exec('Explorer %cd%\\files ', {encoding: 'utf-8'},(err,result,stderr) => {})
// exec(`Explorer http://${my_ip[0]}`, {encoding: 'utf-8'},(err,result,stderr) => {})


//파일 받기 위함 (외부 모듈)
//const formidable = require('formidable');
/*
function getFilename(z){
    var a=z.indexOf("filename=\"");//104
    var b=z.indexOf("Content-Type");//121
    return z.substring(a+10,b-3);
}
function getFiledata(z){
    f = z.substr(z.indexOf("Content-Type"))
    return f.substring(f.indexOf("\n")+3,f.indexOf("\n-----------------------------"));
}
*/
function ok(xx){
    var a = `\/:"'?<>|`;
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

var server = http.createServer(function (요청, 응답) {

    var _url = 요청.url;
    var _method = 요청.method;
    const _ip = 요청.headers['x-forwarded-for'] ||  요청.connection.remoteAddress
    console.log(_ip, decodeURIComponent(_url),_method,요청.connection.remoteAddress);


    if (_url == '/' && _method == "GET") {
        fs.readFile('index.html', 'utf-8', (E, 파일) => {
            var 확장자 = 'text/html; charset=utf-8'
            응답.writeHead(200, {
                'Content-Type': 확장자
            });
            응답.end(파일);
        })

    }else if (_url == '/file' && _method == 'POST') {
        /*
        var form = new formidable.IncomingForm();
        
		form.parse(요청, function (err, fields, files) {
            if(err){
                응답.end("it is not file");
                return;
            }
            
            //for (var i in files) console.log('i',i);
            
			var oldpath = files.name.path;
			var newpath = './files/' + files.name.name;
            console.log('야',oldpath,newpath);
		          fs.rename(oldpath, newpath, function (err) {
                      var headcode=200
                    if (err) console.log('post file fs.remame error',err);headcode=404
                    
                      //메인
                   응답.writeHead(headcode, {'Content-Type': 'text/html; charset=utf-8','location':'/'});
                    응답.end("<script>location='/'</script>");
		});
        });
        */
        
        let post_data = [];
        let post_data_len = 0
        let file_size_maximum = 1024*1024

        let pre_data = false
        
        요청.on('data', (data) => {
            if (file_size_maximum<post_data_len) return;
            
            console.log('data 조각 받음',data.length, post_data_len, 요청.end)
            //post_data.push(data)// += data;





            
            post_data_len+=data.length
        });
        요청.on('end', () => {
            if (file_size_maximum<post_data_len){//file_size_maximum(1GB)가 넘는 파일을 보냈을 때,
                응답.writeHead(413, {'Content-Type': 'text/html; charset=utf-8'});
                응답.end("Payload Too Large");
                return;
            }

            function df(x){
                return x.replace(/\n/g,'\\n+\n').replace(/\r/g,'\\r')
            }
            post_data = Buffer.concat(post_data)
            
            //console.log('buffer - 받음.',df(post_data.toString()),'끝!');
            
            let [front, end] = [0, post_data.indexOf('\n')]
            let boundary = ''
            let file_name = ''

            //let cnt_tmp = 0
            while (true){//cnt_tmp++<3
                //boundary = ''
                file_name = ''


                while (true){
                    let data_tmp = post_data.slice(front, end-1).toString()
                    console.log('data_tmp',front, end, data_tmp.length, df(data_tmp.toString()))
    
    
                    if (!boundary) boundary = data_tmp;
                    if (data_tmp.includes('Content-Disposition:') && data_tmp.includes('filename=')){
                        let tmp = data_tmp.substring(data_tmp.indexOf('filename=')+9,data_tmp.length).split(';')[0]
                        file_name = tmp.substring(1,tmp.length-1)
                    }
    
                    front = end+1; end = post_data.indexOf('\n', end+1);
    
                    if(!data_tmp || !data_tmp.length) break;
                }


                end = post_data.indexOf(boundary, front)
                let filedata = post_data.slice(front, end-2)
                //console.log('$$$$$$$$$$$$$$$$','front-end', front, end, )
                console.log('front-end', front, end, '[boundary]', df(boundary), '[file_name]', file_name, '[data_tmp]',filedata.length)
                //console.log('front, end', front, end, boundary, file_name, data_tmp)

                front = end; end = post_data.indexOf('\n', end+1);
                boundary = post_data.slice(front, end)
                boundary = boundary.toString()
                
                console.log('front-end', front, end, 'new boundary', df(boundary))
                boundary = boundary.replace(/\r/g,'')

                
                
                front = end+1; end = post_data.indexOf('\n', end+1);




                //파일 저장하기
                if (filedata.length && file_name){
                    console.log('[파일 자장]',file_name, filedata)
                    fs.writeFile('./files/'+file_name, filedata, null, (E) => {
                        if(E) console.log('파일 오류', E);
                    })
                }

                if (boundary.endsWith('--')) break;

                console.log()

            }
                
            응답.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            응답.end("1");
            return;
        })
    }
    else if(_url=='/html'){
        
         fs.readdir('./files',(E,파일목록)=>{
            var 데이터='';//`<meta name="viewport" content="width=device-width">`;
             
            for (var i=0; i<파일목록.length; i++){
                 데이터+=`<li><a href="./files/${파일목록[i]}">${파일목록[i]}</a></li>`;
            }
             //console.log(데이터,데이터.length.toString());
             //console.log(데이터,데이터.length.toString());
             //out_html.toString().replace(/.mp3/g,"");
            var 확장자 = 'text/html; charset=utf-8';
            응답.writeHead(200, {'Content-Type':확장자,'Accept-Ranges': 'bytes', 'Content-Length':  Buffer.byteLength(데이터, 'utf8').toString()} );
            응답.end(데이터);
        });
    }
    else if(is(decodeURIComponent(_url))){
        
    var file_url=`./files/`+is(decodeURIComponent(_url));
        
       var 확장자='application/octet-stream';
    응답.writeHead(200, {'Content-Type':확장자, 'Accept-Ranges': 'bytes','Content-Transfer-Encoding': 'binary', 'Content-disposition': `attachment; filename="${encodeURIComponent(is(decodeURIComponent(_url)))}"`});
    // 1. stream 생성
    var stream = fs.createReadStream(file_url);
    // 2. 잘게 쪼개진 stream 이 몇번 전송되는지 확인하기 위한 count
    var count = 0;
    var length = 0;
    // 3. 잘게 쪼개진 data를 전송할 수 있으면 data 이벤트 발생 
    stream.on('data', function(data) {
        count++;
        length+=data.length;
        if(!(count%50)) console.log('data count='+count/50);
      // 3.1. data 이벤트가 발생되면 해당 data를 클라이언트로 전송
      응답.write(data);
    });

    // 4. 데이터 전송이 완료되면 end 이벤트 발생
    stream.on('end', function () {
      console.log('end streaming', length);
        
      // 4.1. 클라이언트에 전송완료를 알림
        //response.writeHead(200, {'Content-Length': length.toString()} );
        응답.end();
    });

    // 5. 스트림도중 에러 발생시 error 이벤트 발생
    stream.on('error', function(err) {
      console.log('err');
      // 5.2. 클라이언트로 에러메시지를 전달하고 전송완료
      응답.end('500 Internal Server '+err);
    });
  }
    else{
        응답.writeHead(404);
        응답.end(".");
    }
});

server.listen(port);
console.log(`${port}번 포트에서 실행. \n종료: Ctrl+C 또는 현재 창 닫기`)
