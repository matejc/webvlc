var utils = require('../../server/utils/utils.js');
var validator = require('validator');
var vlc = require('../../server/utils/vlc.js');
var fs = require('fs');


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
    Entry.find({order: 'updatedOn DESC'}, function(err, entries) {
      for (var k in entries) {
        if (entries[k].value === vlc.lastUrl) {
          entries[k].last = true;
        } else {
          entries[k].last = false;
        }
      }
      cb(err, entries);
    });
  };

  utils.disableAllMethodsBut(Entry, ['list', 'deleteById', 'create']);
};
