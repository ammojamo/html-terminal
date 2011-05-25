var express = require('express');
var spawn = require('child_process').spawn;

var app = express.createServer();

app.use(express.bodyParser());
app.use(express.static(__dirname + '/public'));

app.commandId = 0;

app.commands = {};

function command(cmd, id) {
  this.id = id;
  
  var proc = spawn('sh', ['-c',cmd]);
  var chunk = 0;
  var chunks = {};
  var running = true;
  
  function newChunk(i) {
    chunks[i] = {};
    chunks[i].stdout = "";
    chunks[i].stderr = "";
  }
  
  newChunk(0);
  
  proc.stderr.on('data', function(data) {
    chunks[chunk].stderr += data;
  });
  proc.stdout.on('data', function(data) {
    chunks[chunk].stdout += data;
  });
  proc.on('exit', function(code) {
    running = false;
  });
  
  this.getChunk = function(id) {
     if(id != chunk) {
       return null;
     }
     var msg = {
         chunkId: chunk,
         running: running,
         stdout: chunks[chunk].stdout,
         stderr: chunks[chunk].stderr
     };
     chunks[chunk] = null;
     chunk++;
     newChunk(chunk);
     return msg;
  }
}

app.get('/', function(req, res){
  res.render('index.jade', {pageTitle: 'Title', layout: false});
});

app.get('/command/:id/chunk/:cid', function(req, res) {
  var cmd = app.commands[req.params.id];
  if(cmd == null) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end("Invalid command id");
  }
  var msg = cmd.getChunk(req.params.cid);
  if(msg != null) {
    res.writeHead(200, {'Content-Type': 'application/json'});
    setTimeout(function() { res.end(JSON.stringify(msg)); }, 500);
  } else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end("Invalid chunk id");
  }
});

app.post('/commands', function(req, res) {
  var cmd = new command(req.body.cmd, app.commandId++);
  app.commands[cmd.id] = cmd;

  res.writeHead(200, {'Content-Type': 'application/json'});
  
  res.end(JSON.stringify({commandId: cmd.id}));
});

app.listen(1337);
 