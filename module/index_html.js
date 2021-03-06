module.exports.make_index_html=make_index_html
function make_index_html(html, level){
    console.log('[make_index_html]',html.length, level)
return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <title>파일</title>
    <script src='s_socket_client.js'></script>
    <script src='jszip.js'></script>
    <style>
        pre{
            display:inline
        }
        #list>li{
            display: table-row;
        }
        #list>li>*{
            display: table-cell;
            padding: 0 10px;
            white-space:nowrap;
        }
    </style>
</head>
<body>
    ${level==null?
    `<a href='/auth/login'>로그인</a>
    <a href='/auth/signup'>회원가입</a>`:
    `<a href='/auth/edit_pw'>비밀번호 변경</a>
    <a href='/auth/logout'>로그아웃</a>
    <a href='/auth/set_level'>권한설정</a>`}
    <h3>보내기</h3>
    <form action="./file" method="POST" id='file_input' enctype="multipart/form-data">
        <input type="file"  multiple name="name">
        <!-- <input type="text" name='text' value=""> -->
        <input type="submit" value="전송">
    </form>
    <br>
    <h3>받기 <button onclick='reload()'>목록 새로고침</button></h3>
    <button id='dn_a' onclick="download_all()">전체 다운로드</button>
    <button id='f_a_d' onclick="remove_all()">전체 식제</button>
    <div id="list">${html}</div>
    <script>
        const reload = () => fetch('./html').then(d=>d.text()).then(data=>document.getElementById("list").innerHTML=data )
        const file_list_html = new S_Socket_Client('file_list_html','./file_list_html',data=>document.getElementById("list").innerHTML=data)
        //자동전송
        const file_input = document.getElementById('file_input')
        file_input.addEventListener('change',()=>file_input.submit())
    </script>

    <script>
        function download_all(){
            const btn = document.getElementById('dn_a');
            btn.disabled = 'disabled'
            const zip = new JSZip();

            const promise_list = [...document.querySelectorAll('li>a:nth-child(1)')].map(v=>new Promise((resolve, reject)=>{
                fetch(v.href).then(d=>d.blob()).then(d=>{
                    console.log(v.innerText,d); zip.file(v.innerText,d)
                    resolve();
                })}))

            if(!promise_list.length){
                alert('다운로드할 파일이 없습니다.')
                btn.disabled = false
                return;
            }
            Promise.all(promise_list).then(d=>{
                console.log('프로미스--중');
                zip.generateAsync({type:"blob"})
                .then(function(content) {
                    console.log('content',content);
                    let a = document.createElement('a');
                    a.download = 'download.zip';
                    a.href =URL.createObjectURL(content)
                    a.click()
                    btn.disabled = false
                });
            })
        }
        function remove_all(){
            document.getElementById('f_a_d').disabled = 'disabled' // 중복 삭제 방지.
            const promise_list = [...document.querySelectorAll('li>a:nth-child(2)')].map(v=>new Promise((resolve, reject)=>{
                fetch(v.href).then(d=>resolve())
            }))
            Promise.all(promise_list).then(d=>location.reload())
        }

        
    </script>
    
</body>
</html>`
}