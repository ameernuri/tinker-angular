var app = angular.module('tinker', ['pouchdb'])

app.controller('GamesCtrl', function($log, $scope, $http, pouchDB) {
	var db = pouchDB('games'),
	changes = db.changes({live: true, since: 'now'}),
	numChanges = 0

	changes.on('change', function(change) {
		$scope.fetchEndGames()
	})

	$scope.game = []

	$scope.games = []
	$scope.game.game = ''
	$scope.game.endsOn = ''
	$scope.game.density = 4

	$scope.fetchChildren = function(parent) {

		childrenMap = function(doc, emit) {
		  if (doc.parent == parent) {
		    emit([doc.position, doc._id])
		  }
		}

		db.query(childrenMap, {include_docs: true}).then(function(games) {
			$scope.games = games.rows
		}).catch(function(err) {
			log(err)
		})
	}

	$scope.fetchEndGames = function() {
		$scope.fetchChildren('_endgame')
	}

	$scope.fetchEndGames()

	$scope.add = function(parent) {
		if($scope.game.game == '') {
			$('.game-input').focus()
			return false
		}

		if($scope.game.endsOn == '') {
			$('.time-input').focus()
			return false
		}

		var gameId = generateId(),
		gameText = $scope.game.game.trim(),
		now = new Date().toISOString(),
		position = 0

		countMap = function(doc, emit) {
			if(doc.parent == parent) {
				emit()
			}
		}

		db.query(countMap).then(function(res) {
			return res.rows.length
		}).then(function(pos) {

			var game = {
				_id: gameId,
				game: gameText,
				parent: parent,
				created: now,
				position: pos,
				plays: [
					{
						state: 'playing',
						end: $scope.game.endsOn,
						density: $scope.game.density,
						created: now
					}
				]
			}

			db.put(game).then(function(gameMeta) {
				db.get(gameMeta.id, {include_docs: true}).then(function(res) {
					var game = {
						doc: res
					}

					$('.game-input').focus()
					$scope.game.game = ''
					$scope.game.endsOn = ''
					$scope.game.density = 4
					$scope.hideForm()

					$('.container').animate({
						scrollTop: $('.children-wrap').offset().top - $('.container-content').offset().top + $('.children-wrap').height()
					})
				})
			})
		}).catch(function(err) {
			log('error: ' + err)
			position = 0
		})
	}

	$scope.setState = function(id, state) {

		db.get(id).then(function(doc) {
			var updatedDoc = doc

			updatedDoc.plays[0].state = state
			log(updatedDoc)

			return db.put(updatedDoc, doc._id, doc._rev).then(function() {
				log('state set to "' + state + '"')
			}).catch(function(err) {
				log('error: ' + err)
			})
		})
	}

	$scope.setPosition = function(id, pos) {

		db.get(id).then(function(doc) {
			var updatedDoc = doc
			updatedDoc.position = pos

			return db.put(updatedDoc, doc._id, doc._rev).then(function() {
				log('updated')
			}).catch(function(err) {
				log('error: ' + err)
			})
		})
	}

	$scope.showForm = function() {
		$('.form-content-wrap')
			.slideDown()
			.find('.game-input').focus()
		$('.form-switch')
			.hide()
			.css({
				opacity: 0
			})
	}

	$scope.hideForm = function() {
		$('.form-content-wrap').slideUp()
		$('.form-switch').fadeIn()
		$('.form-switch').animate({
			opacity: 1
		}, 0)
	}

	$(document).on('mouseup click touch', function(e) {
		var target = e.target
		var form = $('.form-wrap')

		if (
			!$(target).is(form) && !$(target).parents().is(form)
		) {
			$scope.hideForm()
		}
	})

	$(document).ready(function() {

		//todo: doesn't work on mobile & jquery-ui-touch-punch doesn't seem to be helping :(
		var stopPos

		$('.form-wrap').find('input').keydown(function (e) {
			if (e.keyCode === 27) {
				$scope.hideForm()
				return false;
			}
		})

		$('.sortable').sortable({
			axis: 'y',
			containment: '.children-wrap',
			distance: 10,
			revert: true,
			tolerance: 'pointer',
			delay: 500,
			stop: function(event, ui) {
				stopPos = ui.item.index()
				var movedId = $(ui.item).data('id'),
				prevId = $(ui.item).prev().data('id'),
				nextId = $(ui.item).next().data('id')

				db.get(prevId).then(function(doc) {

					var prevPos = doc.position

					if (!isNaN(prevPos)) {
						return prevPos
					} else {
						return 0
					}
				}).then(function(prevPos) {
					// prevPos is found
					db.get(nextId).then(function(doc) {
						var nextPos = doc.position

						if (!isNaN(nextPos)) {
							log('nextPos: ' + nextPos)
							log('prevPos: ' + prevPos)
							return (nextPos + prevPos)/2

						} else {

							log('prevPos: ' + prevPos)
							return Math.round(prevPos + 1)
						}
					}).then(function(pos) {
						log("finalPos: " + pos)
						$scope.setPosition(movedId, pos)
					}).catch(function(err) {
						// we don't have nextPos
						log('error: ' + err)
						log('prevPos: ' + prevPos)
						$scope.setPosition(movedId, Math.round(prevPos + 1))
					})
				}).catch(function(err) {
					// prevPos is not found
					db.get(nextId).then(function(doc) {
						var nextPos = doc.position

						if (!isNaN(nextPos)) {
							log('nextPos: ' + nextPos)
							return Math.round(nextPos - 1)

						} else {
							// we've nothing - return 0
							return 0
						}
					}).then(function(pos) {
						// we've nextPos
						log("finalPos: " + pos)
						$scope.setPosition(movedId, pos)
					}).catch(function(err) {
						// we've nothing
						log('error: ' + err)
						$scope.setPosition(movedId, 0)
					})
				})
			}
		})
	})
})
