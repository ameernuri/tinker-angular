var app = angular.module('tinker', ['pouchdb']);

app.service('service', function(pouchDB) {
  var db = pouchDB('games');
});

app.controller('GamesCtrl', function($log, $scope, $http, pouchDB) {
	var db = pouchDB('games');

  error = function(err) {
    $log.error(err);
  }

  get = function(res) {
    if (!res.ok) {
      return error(res);
    }
    return db.get(res.id);
		console.log(res.id);
  }

  bind = function(res) {
    $scope.games.push(res);
  }

	$scope.games = [];
	$scope.gameText = null;
	$scope.endTime = null;
	$scope.density = 4;

	db.allDocs({include_docs: true, descending: true})
		.then(function(result) {
			$scope.games = result.rows;
		})
		.catch(error);


	$scope.save = function() {

		var doc = {
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


		db.put(doc).then(function(meta) {
			db.get(meta.id, {include_docs: true})
				.then(function(res) {
					var game = {
						doc: res
					}

					this.gameText = 'new_tit';
					$scope.games.push(game);
				})
				.catch(function(err) {
					console.log(err);
				});
		});
	}

	$scope.showForm = function() {
		$('.form-content-wrap').slideDown().find('.game-input').focus();
		$('.form-switch').hide().css({'margin-top': '-10px', opacity: 0});
	}

	$scope.hideForm = function() {
		$('.form-content-wrap').slideUp();
		$('.form-switch').fadeIn();
		$('.form-switch').animate({
			'margin-top': 0,
			opacity: 1
		}, 0);
	}
});
