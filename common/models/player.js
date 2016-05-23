var utils = require('../../server/utils/utils.js');
var validator = require('validator');
var vlc = require('../../server/utils/vlc.js');
var loopback = require('loopback');

module.exports = function(Player) {

  var manualStop = false;

  vlc.init(function(err) {
    if (err) {
      console.log('VLC Init Error: ', err)

    } else {
      console.log('VLC Init: DONE')
      vlc.emitter.on('stopped', function() {
        console.log('#################### stopped');
        if (!manualStop) {
          Player.next(function() {});
        }
      });
      vlc.emitter.on('playing', function() {
        console.log('#################### playing');
        // vlc.current(function(err, data) {
        //   if (err) {
        //     console.error(err);
        //   } else {
        //     console.log(data);
        //   }
        // });
      });
    }
  });

  Player.play = function(body, callback) {
    var url = body.value;
    if (!validator.isURL(url)) {
      callback({
        message: 'URL not valid: ' + url,
        status: 400
      });
    } else {
      vlc.stop(function(err) {
        if (err) {
          return console.error(err);
        }
        vlc.play(url, function(err) {
          if (err) {
            console.error(err);
          }
        });
      });
      manualStop = false;
      callback();
    }
  };

  Player.stop = function(callback) {
    manualStop = true;
    vlc.stop(function(err) {
      if (err) {
        return console.error(err);
      }
    });
    callback();
  };

  Player.pause = function(callback) {
    vlc.pause(function(err) {
      if (err) {
        return console.error(err);
      }
    });
    callback();
  };

  Player.volup = function(callback) {
    vlc.volup(3, function(err) {
      if (err) {
        return console.error(err);
      }
    });
    callback();
  };

  Player.voldown = function(callback) {
    vlc.voldown(3, function(err) {
      if (err) {
        return console.error(err);
      }
    });
    callback();
  };

  Player.next = function(callback) {
    var Entry = loopback.getModel('entry');
    new Promise(function(resolve, reject) {
      vlc.current(function(err, data) {
        if (err) console.error(err.stack || err.message || err);
        resolve(data);
      })
    })
    .then(function(current) {
        return new Promise(function(resolve, reject) {
            Entry.find({order: 'createdOn ASC'}, function(err, entries) {
                if (err) {
                    callback(err);
                } else {
                    var errorFun = function(err) {
                        if (err) console.error(err.stack || err.message || err);
                    };
                    var i = 0;
                    for (var k in entries) {
                        if (entries[k].value === current.url && entries[i+1]) {
                            var url = entries[i+1].value;
                            vlc.play(url, errorFun);
                            return resolve();
                        }
                        i++;
                    }
                    resolve();
                }
            });
        });
    })
    .then(function() {
        callback(null);
    })
    .catch(function(err) {
        console.error(err.stack || err.message || err);
    });
  };

  utils.disableAllMethodsBut(Player, ['play', 'stop', 'pause', 'volup',
    'voldown', 'next']);
};
