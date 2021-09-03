# Node.js 파일 전송 2

## 개요

- [file_send](https://github.com/esctabcapslock/file_send)의 후속작임
- 변경점이 많아 새롭게 래파지토리 만듦

## 목적

1. 기존 프로그램의 단점 개선

    - 파일 삭제 기능 없음
    - 모든 사용자의 접근 허용
    - 파일 다운로드를 외부 모듈에 의존
    - 파일 삭제 기능 전무

2. 라즈베리 파이에 넣기 위해서
   - 심심해서 만짐
   - 원격으로 삭제할 수 있어야

## 의존성

- 클라이안트에서 **모든 파일 저장하기** 기능을 만들기 위해서 [jszip](https://stuk.github.io/jszip/)모듈을 사용함. 겁나 느림...

## 기술상 특징

- 파일을 계속 저장힉(?)위해 fs의 파일스트림(?)을 사용
- HTTP POST에서 파일 주고받는 것을 직접 구현
- 로그인 구현, 비밀번호 변경 기능 추가, 비밀번호 암호화 저장(ARS-CBC-256)
- 누군가 파일을 업로드하면, 알아서 사용자 페이지가 변경되도록 함.
- 업로드된 파일의 비밀번호는 '2'번입니다.
- 다운로드시 파일 이름 관련해서 **latin1**(ISO-8859-1)인코딩 써야함... utf-8 안됨. (하지만 PC용은 encodeURI써도 됨?) [다음](https://silvernine.me/wp/?p=943)을 참조.

## 보완점

- 다중 사용자 계정 구현은 아직.. [파일키위](https://file.kiwi/)처럼 만들면 좋을 듯?
- 서버에 보관중인 파일이 컴퓨터의 가용 용량을 넘는 것을 방지할 필요 있음
- tmp 폴더에 파일이 잔류하는 경우 해결해야...
