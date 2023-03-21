const path = require('path');
const { createServer } = require('http');

const express = require('express');
const app = express();

const { getIO, initIO } = require('./socket');

const httpServer = createServer(app);

app.get('/',function(req,res){
	res.sendFile(__dirname+'/chatwithoutroom/index.html');
});

app.get('/videocall',function(req,res){
	app.use('/assets',express.static(__dirname +'/videocall/assets'));
	res.sendFile(__dirname+'/videocall/index.html');
});

app.get('/videolive/cast',function(req,res){
	app.use('/assets',express.static(__dirname +'/videolive/assets'));
	res.sendFile(__dirname+'/videolive/broadcast.html');
});

app.get('/videolive',function(req,res){
	app.use('/assets',express.static(__dirname +'/videolive/assets'));
	res.sendFile(__dirname+'/videolive/client.html');
});

app.get('/multiplevideocall',function(req,res){
	app.use('/assets',express.static(__dirname +'/multiplevideocall/assets'));
	res.sendFile(__dirname+'/multiplevideocall/index.html');
});

let port = process.env.PORT || 3001;

initIO(httpServer);

httpServer.listen(port)
console.log("Server started on ", port);

getIO();