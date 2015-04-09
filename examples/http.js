'use strict';

var activeHandles = require('../');
var http = require('http');
var PORT = 3000;

function onrequest(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('hello world\r\n');
  activeHandles.print();
}

function onlistening() {
  console.error('Listening on localhost %d', PORT);
}

var server = http.createServer();
server
  .on('error', console.error)
  .on('request', onrequest)
  .on('listening', onlistening)
  .listen(PORT);


function onclientResponse(res) {
  console.log('\n\n--------------\nStatus: %d', res.statusCode);
  server.close();
}

http
  .get('http://localhost:' + PORT)
  .on('error', console.error)
  .on('response', onclientResponse)
