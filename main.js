const express = require('express') //express 모듈로드
const app = express()
const port = 3000

var qs = require('querystring');
var sanitizeHtml = require('sanitize-html');
var path = require('path');
var fs = require('fs');
var template = require('./lib/template.js');
const { request } = require('http');

//pm2 start main.js --watch  : --watch 해야 자동반영
//라우팅: 두번째 인자는 콜백함수
// req: 클라->서버 요청정보.
// res : 서버->클라 응답. response.send()
app.get('/', (request, response) => {
    fs.readdir('./data', function (error, filelist) {
        var title = 'Welcome';
        var description = 'Hello, Node.js123';
        var list = template.list(filelist);
        var html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`
        );
        return response.send(html); //클라에 html 전송
    });

});

//pageid 라는 ,우리가 정한 key 에 클라이언트가 쓴 value 가 저장
// pageid 는 request.params 객체 안의 "key" 가 됨.
// {pageId: "HTML"}
// 콜백의 filelist : /data 폴더의 모든 파일 이름들의 배열
app.get('/page/:pageId/', (request, response) => {
    fs.readdir('./data', function (error, filelist) {
        // filteredId = 'HTML' 이 들어감
        var filteredId = path.parse(request.params.pageId).base;
        fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
            var title = request.params.pageId;
            var sanitizedTitle = sanitizeHtml(title);
            var sanitizedDescription = sanitizeHtml(description, {
                allowedTags: ['h1']
            });

            // data 폴더의 모든 파일 목록을 ul 리스트화.
            // 여기서 delete / POST 호출
            var list = template.list(filelist);
            var html = template.HTML(sanitizedTitle, list,
                `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
                ` <a href="/create">create</a>
                          <a href="/update/${sanitizedTitle}">update</a>
                          <form action="/delete_process" method="post">
                            <input type="hidden" name="id" value="${sanitizedTitle}">
                            <input type="submit" value="delete">
                          </form>`
            );
            response.send(html); // 응답을 클라에 전달
        });
    });

});

app.get('/create', (request, response) => {

    fs.readdir('./data', function (error, filelist) {
        var title = 'WEB - create';
        var list = template.list(filelist);

        // submit 하면 , POST 방식으로 /create_process 로 모든 데이터 전송. app.post('/create_process',...)
        var html = template.HTML(title, list, `
          <form action="/create_process" method="post">
            <p><input type="text" name="title" placeholder="title"></p>
            <p>
              <textarea name="description" placeholder="description"></textarea>
            </p>
            <p>
              <input type="submit">
            </p>
          </form>
        `, '');
        response.send(html);

    });
});

//폼에 내용을 작성하면 이곳에서 받음 ,POST방식으로 요청시.
app.post('/create_process', function (request, response) {

    var body = '';
    request.on('data', function (data) {
        body = body + data; //콜백이 실행될때마다 데이터 추가
    });
    request.on('end', function () {
        var post = qs.parse(body);
        var title = post.title; //post 내용의 title 필드
        var description = post.description; //post의 desc 필드

        // data/{title} 폴더에 desc 내용을 쓰기.
        fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
            response.writeHead(302, { Location: `/?id=${title}` }); // 302 : 리디렉션
            response.end();
        })
    });

});


app.get('/update/:pageId', (request, response) => {

    fs.readdir('./data', function (error, filelist) {
        var filteredId = path.parse(request.params.pageId).base;
        fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
            var title = request.params.pageId;
            var list = template.list(filelist);
            var html = template.HTML(title, list,
                `
            <form action="/update_process" method="post">
              <input type="hidden" name="id" value="${title}">
              <p><input type="text" name="title" placeholder="title" value="${title}"></p>
              <p>
                <textarea name="description" placeholder="description">${description}</textarea>
              </p>
              <p>
                <input type="submit">
              </p>
            </form>
            `,
                `<a href="/create">create</a> <a href="/update?id=${title}">update 1</a>`
            );
            response.send(html);

        });
    });
});

app.post('/update_process', (request, response) => {
    var body = '';

    //POST 방식으로 전송되는 데이터를, 여러 조각으로 나누어받음.
    request.on('data', function (data) {
        //BODY 에 차곡차곡 쌓기.
        body = body + data;
    });

    //데이터가 완전히 도착하고나서야 콜백함수 실행
    request.on('end', function () {
        var post = qs.parse(body);
        var id = post.id;
        var title = post.title;
        var description = post.description;
        fs.rename(`data/${id}`, `data/${title}`, function (error) {
            fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                //리디렉션 메소드.
                response.redirect(`/?id=${title}`);
            })
        });
    });

});

app.post('/delete_process', (request, response) => {

    var body = '';

    //데이터 CHUNK로 받기
    request.on('data', function (data) {
        body = body + data;
    });

    // 전송 모두 완료되면
    request.on('end', function () {
        var post = qs.parse(body);
        var id = post.id;
        var filteredId = path.parse(id).base;
        fs.unlink(`data/${filteredId}`, function (error) {
            response.redirect('/');
        })
    });


});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});
