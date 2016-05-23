var utils = require('../../server/utils/utils.js');
var validator = require('validator');
var vlc = require('../../server/utils/vlc.js');
var fs = require('fs');
var lastTitle;

module.exports = function(Entry) {

  Entry.beforeRemote('create', function(context, unused, next) {
    var url = context.req.body.value;
    if (validator.isURL(url)) {
      next();
    } else {
      next({message: 'URL not valid: '+url, status: 400});
    }
  });

  Entry.list = function(cb) {
    new Promise(function(resolve, reject) {
      vlc.current(function(err, data) {
        if (err) console.error(err.stack || err.message || err);
        resolve({current: data});
      })
    })
    .then(function(data) {
        return new Promise(function(resolve, reject) {
            Entry.find({order: 'createdOn DESC'}, function(err, entries) {
                if (err) {
                    reject(err);
                } else {
                    data.entries = entries;
                    resolve(data);
                }
            });
        });
    })
    .then(function(data) {
        var entries = data.entries;
        var current = data.current;
        var results = [];
        var promises = [];
        function changePromise(r, doc) {
            return new Promise(function(resolve, reject) {
                doc.updateAttribute('title', r.title, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            });
        }

        for (var k in entries) {
            var entry = entries[k];
            var r = {
                value: entry.value,
                title: entry.title || '',
                last: false
            };

            if (entry.value === current.url) {
                if (current.playing && current.title && entry.title !== current.title) {
                    r.title = current.title;
                    promises.push(changePromise(r, entry));
                }
                r.last = true;
            }
            results.push(r);
        }
        data.promises = promises;
        data.results = results;
        return data;
    })
    .then(function(data) {
        return new Promise(function(resolve, reject) {
            if (data.promises.length === 0) {
                resolve(data);
            } else {
                Promise.all(data.promises)
                    .then(function() {
                        resolve(data);
                    })
                    .catch(reject);
            }
        });
    })
    .then(function(data) {
        cb(null, data.results);
    })
    .catch(function(err) {
        cb(err);
    });
  };

  utils.disableAllMethodsBut(Entry, ['list', 'deleteById', 'create']);
};
