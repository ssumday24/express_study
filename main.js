const express = require('express') //express 모듈로드
const app = express()
const port = 3000

var qs = require('querystring');
var sanitizeHtml = require('sanitize-html');
var path = require('path');
var fs = require('fs');
var template = require('./lib/template.js');
const { request } = require('http');
const bodyParser = require('body-parser') //parser 추가 : 11강
var compression = require('compression')

//정적인 파일 찾기
app.use(express.static('public'));

// 요청이 들어올때마다 이 미들웨어들이 실행됨
app.use(bodyParser.urlencoded()); // request객체에 body라는 속성 만들어줌

// 서버가 보내는 응답을, zip 처럼 압축해서 브라우저한테 보내줌
app.use(compression());

// app.use : 모든 요청에 대해 무조건 이 함수 실행.
// app.use('/user/:id', ...)
// 어떤 주소로 요청이 들어오든 ./data 파일목록을 읽어서, request객체에 저장
app.use(function (request, response, next) {
    fs.readdir('./data', function (error, filelist) {
        request.list = filelist; // request 객체에 저장
        next(); // 필수 : 다음 제어로 넘겨준다.
    });
});

//pm2 start main.js --watch  : --watch 해야 자동반영
//두번째 인자는 콜백함수
// req: 클라->서버 요청정보.
// res : 서버->클라 응답. response.send()
app.get('/', (request, response) => {

    var title = 'Welcome';
    var description = 'Hello, Node.js';
    var list = template.list(request.list); //미들웨어 사용
    var html = template.HTML(title, list,

        `   <h2> ${title} </h2> ${description}  
        
            <img src="/images/hello.jpg" style="width:300px; display : block;" >
        `,


        `<a href="/create"> create  </a>`
    );
    return response.send(html); //클라에 html 전송
});

//pageid 라는 ,우리가 정한 key 에 클라이언트가 쓴 value 가 저장
// pageid 는 request.params 객체 안의 "key" 가 됨.
// {pageId: "HTML"}
// 콜백의 filelist : /data 폴더의 모든 파일 이름들의 배열
app.get('/topic/:pageId/', (request, response) => {

    console.log(request.list);

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

    //BODY PARSER 미들웨어 사용 -> 자동으로 body 속성 생성.
    var post = request.body;
    var title = post.title; //post 내용의 title 필드
    var description = post.description; //post의 desc 필드

    // data/{title} 폴더에 desc 내용을 쓰기.
    fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
        response.writeHead(302, { Location: `/?id=${title}` }); // 302 : 리디렉션
        response.end();
    })
});


app.get('/update/:pageId', (request, response) => {

    //콜백함수에서 error 객체도 반환
    fs.readdir('./data', function (error, filelist) {
        var filteredId = path.parse(request.params.pageId).base;
        fs.readFile(`data/${filteredId}`, 'utf8', (err, description) => {
            if (err) {
                next();
            }
            else {
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
            }

        });
    });
});

app.post('/update_process', (request, response) => {

    var post = request.body;
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

app.post('/delete_process', (request, response) => {
    var post = request.body;
    var id = post.id;
    var filteredId = path.parse(id).base;
    fs.unlink(`data/${filteredId}`, function (error) {
        response.redirect('/');
    });
});

//에러처리 미들웨어 - 순차적으로 실행되기때문에 여기 배치
app.use((req, res, next) => {
    res.status(404).send("Sorry can't find that!");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});
