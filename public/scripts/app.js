var tinker = angular.module('tinker', ['pouchDB']);

var remote = 'http://localhost:5984/games';

log = function(log) {
	console.log(log);
};

randomChars = function() {
  return Math.random().toString(36).substr(2, 5);
}

generateId = function() {
	return new Date().toISOString() + '-' + randomChars();
}

PouchDB.sync('games', remote, {
	live: true,
	retry: true,
	complete: function() {
		log('sync happened!');
	}
});

tinker.run(function($pouchdb) {
  $pouchdb.setDatabase("games");
});
