var tinker = angular.module('tinker', ['tinker.controllers', 'tinker.services']);

log = function(log) {
	console.log(log);
};

tinker.run(function($pouchdb) {
  $pouchdb.setDatabase("games");
  //$pouchdb.sync(">> url to remote db <<");
});
