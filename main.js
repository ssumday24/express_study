var http = require('http'); //http 모듈 불러오기 -nodejs 내장
var fs = require('fs'); // 파일시스템 모듈
var url = require('url'); // url모듈
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');

var app = http.createServer(function (request, response) {
    var _url = request.url; //request 객체에서 도메인,포트번호 이후 나머지부분저장
    var queryData = url.parse(_url, true).query; // _url 객체에서 "query" 객체 접근
    var pathname = url.parse(_url, true).pathname;

    if (pathname === '/') {
        // localhost:3000/ 일때
        if (queryData.id === undefined) {
            fs.readdir('./data', function (error, filelist) {
                var title = 'Welcome';
                var description = 'Hello, Node.js';
                var list = template.list(filelist);
                var html = template.HTML(title, list,
                    `<h2>${title}</h2>${description}`,
                    `<a href="/create">create</a>`
                );
                response.writeHead(200);
                response.end(html);
            });
        } else {
            // localhost:3000/?id=abcd 형식일때
            fs.readdir('./data', function (error, filelist) {
                var filteredId = path.parse(queryData.id).base;
                fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
                    var title = queryData.id;
                    var sanitizedTitle = sanitizeHtml(title);
                    var sanitizedDescription = sanitizeHtml(description, {
                        allowedTags: ['h1']
                    });
                    var list = template.list(filelist);
                    var html = template.HTML(sanitizedTitle, list,
                        `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
                        ` <a href="/create">create</a>
                          <a href="/update?id=${sanitizedTitle}">update</a>
                          <form action="delete_process" method="post">
                            <input type="hidden" name="id" value="${sanitizedTitle}">
                            <input type="submit" value="delete">
                          </form>`
                    );
                    response.writeHead(200);
                    response.end(html);
                });
            });
        }
    } else if (pathname === '/create') {
        // localhost:3000/create 일때
        fs.readdir('./data', function (error, filelist) {
            var title = 'WEB - create';
            var list = template.list(filelist);
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
            response.writeHead(200);
            response.end(html);
        });
    } else if (pathname === '/create_process') {
        // localhost:3000/create_process 일때
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
    } else if (pathname === '/update') {
        fs.readdir('./data', function (error, filelist) {
            var filteredId = path.parse(queryData.id).base;
            fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
                var title = queryData.id;
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
                    `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
                );
                response.writeHead(200);
                response.end(html);
            });
        });
    } else if (pathname === '/update_process') {
        var body = '';
        request.on('data', function (data) {
            body = body + data;
        });
        request.on('end', function () {
            var post = qs.parse(body);
            var id = post.id;
            var title = post.title;
            var description = post.description;
            fs.rename(`data/${id}`, `data/${title}`, function (error) {
                fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
                    response.writeHead(302, { Location: `/?id=${title}` });
                    response.end();
                })
            });
        });
    } else if (pathname === '/delete_process') {
        var body = '';
        request.on('data', function (data) {
            body = body + data;
        });
        request.on('end', function () {
            var post = qs.parse(body);
            var id = post.id;
            var filteredId = path.parse(id).base;
            fs.unlink(`data/${filteredId}`, function (error) {
                response.writeHead(302, { Location: `/` });
                response.end();
            })
        });
    } else {
        response.writeHead(404); //pagenotfound
        response.end('Not found');
    }
});
app.listen(3000);