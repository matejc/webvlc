var spawn = require('child_process').spawn;
var process = require('process');
var net = require('net');
var EventEmitter = require('events');
var util = require('util');

var processes = [];
var vlcExec = process.env.VLC_EXEC || 'vlc';
var vlcPassword = process.env.VLC_PASSWORD || 'vlcadmin';
var vlcPort = process.env.VLC_PORT || 12701;
var inStatusLoop = false;
var prevState = 'false';

function VlcEmitter() {
  EventEmitter.call(this);
}
util.inherits(VlcEmitter, EventEmitter);
var emitter = new VlcEmitter();

exports.emitter = emitter;
exports.lastUrl = null;

exports.run = function(args, env, callback) {
  var output = "";
  var outerr = "";

  var options = {
    env: (env ? env : process.env)
  };

  var vlcprocess = spawn(vlcExec, args, options);
  var processItem = {
    process: vlcprocess
  };
  processes.push(processItem);

  console.log("vlc args: " + args.join(' '));

  vlcprocess.stdout.on("data", function(data) {
    console.log("vlc stdout: " + data);
    output += data;
  });

  vlcprocess.stderr.on("data", function(data) {
    console.error("vlc stderr: " + data);
    outerr += data;
  });

  vlcprocess.on("close", function(code) {
    for (var i in processes) {
      if (vlcprocess === processes[i].process) {
        processes.splice(i, 1);
        break;
      }
    }
    console.error("vlc exited with status: " + code);
  }.bind(vlcprocess));

  callback(null);

  return processItem;
};

exports.kill = function() {
  for (var i in processes) {
    if (processes[i].process) {
      processes[i].process.kill("SIGINT");
    }
  }
};

process.on('exit', (code) => {
  exports.kill();
  console.log('About to exit with code:', code);
});

process.on('SIGTERM', () => {
  exports.kill();
  process.exit(1);
});

exports.alive = function() {
  for (var i in processes) {
    if (processes[i].process) {
      return true;
    }
  }
  return false;
};

exports.init = function(cb) {
  exports.run([
      '--verbose',
      0,
      '-I telnet',
      '--telnet-port',
      vlcPort,
      '--telnet-password',
      vlcPassword,
      '--no-video',
      '--no-loop'
    ],
    null,
    function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null);
      }
    });
}


exports.play = function(url, cb) {
  prevState = 'false';
  send("clear\r\nadd " + url, function(err, data) {
    if (err) {
      exports.lastUrl = null;
    } else {
      exports.lastUrl = url;
    }
    cb(err, data);
  });
}

exports.stop = function(cb) {
  prevState = 'false';
  console.trace('stop')
  send("stop", function(err, data) {
    exports.lastUrl = null;
    cb(err, data);
  });
}

exports.pause = function(cb) {
  prevState = 'false';
  send("pause", cb);
}

exports.volup = function(steps, cb) {
  send("volup "+steps, cb);
}

exports.voldown = function(steps, cb) {
  send("voldown "+steps, cb);
}

exports.current = function(cb) {
  new Promise(function(resolve, reject) {
    var result = {url: exports.lastUrl};
    send("get_title", function(err, data) {
      if (err) {
        reject(err);
      } else {
        result.title = data;
        resolve(result);
      }
    });
  })
  .then(function(result){
    return new Promise(function(resolve, reject) {
      send("status", function(err, data) {
        if (err) {
          reject(err);
        } else {
          var match = data.match(/\(\ audio\ volume\:\ (.*) \)/);
          if (match && match.length > 0) {
            result.volume = match[1];
          }
          resolve(result);
        }
      });
    });
  })
  .then(function(result) {
    cb(null, result);
  })
  .catch(function(err) {
    cb(err);
  });
}

function send(str, cb) {
  statusLoop(function(err) {
    if (err) {
      console.error(err);
    }
  });

  var dst = {
    port: vlcPort,
    host: '127.0.0.1'
  };

  var sock = net.connect(dst, function() {
    sock.setNoDelay();
    sock.setEncoding('utf8');

    sock.write(vlcPassword + "\r\n", function(err) {
      if (err) {
        console.log(err);
      }
    });

    var body = "";

    sock.on("data", function(buf) {
      body += buf;
    });

    sock.once("end", function() {
      //trim vlc verbosity
      body = body.replace(/status change:.*\r?\n/g, '');
      body = body.replace(/^[\s\S]*?>\ ?(>\ )?/, '');
      body = body.replace(/> Bye-bye!.*/, '');
      cb(null, body.trim());
    });

    sock.once("error", function(err) {
      cb(err);
    });

    try {
      sock.write(str + "\r\n", function() {
        sock.end();
      });
    } catch (e) {
      cb(e)
    }
  });

  sock.on("error", cb);
}



function statusLoop(callback) {
  if (inStatusLoop) {
    return callback(null);
  }

  var cb = function(err, data) {
    inStatusLoop = false;
    callback(err, data);
  };

  var dst = {
    port: vlcPort,
    host: '127.0.0.1'
  };

  var sock = net.connect(dst, function() {
    sock.setNoDelay();
    sock.setEncoding('utf8');

    sock.write(vlcPassword + "\r\n", function(err) {
      if (err)
        cb(err);
    });

    var body = "";

    sock.on("data", function(buf) {
      body += buf;
      var match = body.match(/\(\ state\ (.*) \)/);
      if (match && match.length > 0 && match[1] !== prevState) {
        emitter.emit(match[1]);
        prevState = match[1];
      }
    });

    sock.once("end", function() {
      //trim vlc verbosity
      body = body.replace(/status change:.*\r?\n/g, '');
      body = body.replace(/^[\s\S]*?>/, '');
      body = body.replace(/> Bye-bye!.*/, '');
      cb(null, body.trim());
    });

    sock.once("error", function(err) {
      cb(err);
    });

    try {
      var interval = setInterval(function() {
        body = "";
        sock.write("status\r\n", function(err) {
          if (err)
            clearInterval(interval);
        });
      }, 1000);
    } catch (e) {
      cb(e)
    }
  });

  sock.on("error", cb);

  inStatusLoop = true;
}
