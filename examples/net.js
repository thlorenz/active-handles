'use strict';

var activeHandles = require('../');
var net = require('net');
var PORT = 3000;

function onconnect(c) {
  c.write('hello world\r\n');
  c.pipe(c);
  activeHandles.print();
}

function onlistening() {
  console.error('Listening on localhost %d', PORT);
}

var server = net.createServer()
server
  .on('connection', onconnect)
  .on('error', console.error)
  .on('listening', onlistening)
  .listen(PORT)

function onclientConnect() {
  client.write('hola mundo\r\n');
}

function onclientData(data) {
  console.log('\n\n--------------\n%s', data.toString());
  client.end();
}

function onclientEnd() {
  console.log('disconnected from server');
  server.close();
}

var client =  net
  .connect({ port: PORT })
  .on('error', console.error)
  .on('connection', onclientConnect)
  .on('data', onclientData)
  .on('end', onclientEnd);
