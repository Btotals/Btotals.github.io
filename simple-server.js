var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var querystring = require('querystring');

function getMimeType(ext) {
  switch(ext) {
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/x-javascript';
    case '.ico':
      return 'image/x-icon';
    // default:
    //   throw new Error(p + ' is invalid mime type!');
  }
}

var server = http.createServer(function(request, response) {
  var pathname = url.parse(request.url).pathname;
  var query = querystring.parse(request.url);
  switch(pathname) {
    case '/':
      response.writeHead(200, {'Content-type': 'text/html'});
      response.write('Hehe~');
      response.end();
      break;

    default:
      fs.readFile(__dirname+pathname, function(err, data) {
        if (err) {
          response.writeHead(404);
          response.write('404 not found');
          response.end();
        } else {
          var mime = getMimeType(path.extname(pathname));
          response.writeHead(200, {'Content-Type': mime});
          response.write(data, 'utf-8');
          response.end();
        }
      });
    }
});

server.listen(8000);
