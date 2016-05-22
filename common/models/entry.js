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
        resolve(data);
      })
    })
    .then(function(data) {
      Entry.find({order: 'updatedOn DESC'}, function(err, entries) {
        for (var k in entries) {
          if (entries[k].value === data.url) {
            console.log(data.playing, !lastTitle, data.title)
            if (data.playing && data.title && lastTitle !== data.title) {
              entries[k].title = data.title;
              lastTitle = data.title;
            } else if (data.playing && lastTitle) {
              entries[k].title = lastTitle;
            } else {
              entries[k].title = '';
              lastTitle = '';
            }
            entries[k].last = true;
          } else {
            entries[k].last = false;
          }
        }
        cb(err, entries);
      });
    });
  };

  utils.disableAllMethodsBut(Entry, ['list', 'deleteById', 'create']);
};
