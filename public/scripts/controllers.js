var controllers = angular.module('tinker.controllers', []);

controllers.controller('GamesCtrl', function($scope, $rootScope, $pouchdb, $http, $timeout) {
	var db = new PouchDB('games');

	db.allDocs({include_docs: true, descending: true}).then(function (result) {
		$scope.games = result.rows;
		$scope.$apply();
	}).catch(function (error) {
		log(error);
	});

	$scope.density = 4;

	$scope.games = {};

  $pouchdb.startListening();

  $rootScope.$on("$pouchdb:change", function(event, data) {
    $scope.games[data.doc._id] = data.doc;
    $scope.$apply();
  });

  $rootScope.$on("$pouchdb:delete", function(event, data) {
    delete $scope.games[data.doc._id];
    $scope.$apply();
  });

	$scope.save = function() {

		var newGame = {
			_id: new Date().toISOString(),
			game: this.gameText,
			replays: [
				{
					result: 'active',
					end: this.endTime,
					density: this.density
				}
			]
		};

		$pouchdb.save(newGame).then(function(response) {
			log('game saved');
		}).catch(function(error) {
			log(error);
		});
	}
});
