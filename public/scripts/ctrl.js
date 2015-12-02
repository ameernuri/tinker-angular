var tinker;

tinker = angular.module('tinker', []);

log = function(log) {
	console.log(log);
};

uuidGenerate = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = crypto.getRandomValues(new Uint8Array(1))[0]%16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
};

tinker.controller('GamesCtrl', function GamesController($scope, $http) {
	var db = new PouchDB('games');

	db.allDocs({include_docs: true, descending: true}).then(function (result) {
		$scope.games = result.rows;
	}).catch(function (error) {
		log(error);
	});

	$scope.addGame = function() {
		var newGame = {
			_id: new Date().toISOString(),
			game: this.gameText,
			replays: [
				{
					result: 'lost',
					end: this.endTime,
					density: 2
				}
			]
		};

		db.put(newGame).then(function (result) {
			this.gameText = '';
			this.endTime = '';
		}).catch(function (error) {
			log(error);
		});
	};
});
