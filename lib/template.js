module.exports = {
  // HTML 메소드
  HTML:function(title, list, body, control){
    return `
    <!doctype html>
    <html>
    <head>
      <title>WEB1 - ${title}</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1><a href="/">WEB</a></h1>
      ${list}
      ${control}
      ${body}
    </body>
    </html>
    `;
  },
  // LIST 메소드
  list:function(filelist){
    var list = '<ul>';

    var i = 0;
    
    while(i < filelist.length){
      // 리스트 목록 만들기.
      list = list + `<li><a href="/page/${filelist[i]}">${filelist[i]}</a></li>`;
      i = i + 1;
    }

    list = list+'</ul>';
    return list;
  }
}
