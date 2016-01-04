var app = angular.module('tinker', ['pouchdb'])

app.controller('GamesCtrl', function($log, $scope, $http, pouchDB) {
	var db = pouchDB('games'),
	changes = db.changes({live: true, since: 'now'}),
	numChanges = 0

	sessionGame = window.sessionStorage.getItem('currentGame')

	$scope.editTemp
	$scope.game = []
	$scope.game.game = ''
	$scope.game.end = ''

	if (sessionGame == '_endgame') {
		$scope.game.priority = 8
	} else {
		$scope.game.priority = 4
	}

	$scope.addForm = {
		game: {
			text: '',
			error: '',
			message: ''
		},
		time: {
			text: '',
			error: '',
			message: ''
		}
	}

	$scope.editForm = {
		game: {
			text: '',
			error: '',
			message: ''
		},
		time: {
			text: '',
			error: '',
			message: ''
		},
		priority: {
			value: $scope.game.priority
		}
	}

	changes.on('change', function(change) {
		$scope.fetchChildren($scope.currentGame._id, function(games) {
			$scope.games = games
		})
		if ($scope.currentGame._id != '_endgame') {
			$scope.fetchOne($scope.currentGame._id, function(doc) {
				$scope.currentGame = doc
			}, function(err) {

				if (err.status == 404) {
					$scope.currentGame = {
						_id: '_endgame'
					}
				} else {
					console.error(err)
				}
			})

			$scope.fetchOne($scope.currentGame.parent, function(parent) {
				$scope.currentParent = parent
			}, function(err) {
				console.error(err)
			})
		}
	})

	$scope.fetchChildren = function(parent, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		childrenMap = function(doc, emit) {
		  if (doc.parent == parent) {
		    emit([doc.position])
		  }
		}

		db.query(childrenMap, {include_docs: true}).then(function(games) {
			success(games.rows)
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.fetchOne = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		db.get(id).then(function(doc) {
			success(doc)
			return doc
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.fetchPath = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		// fetch path here
	}

	// set session game
	if (sessionGame == undefined || sessionGame == '_endgame') {

		$scope.currentGame = {
			_id: '_endgame'
		}

		$scope.currentParent = {
			_id: '_noparent'
		}

		window.sessionStorage.setItem('currentGame', '_endgame')
		$scope.fetchChildren($scope.currentGame._id, function(games) {
			$scope.games = games
		})
	} else {

		$scope.fetchOne(sessionGame, function(doc) {
			$scope.currentGame = doc

			$scope.fetchChildren($scope.currentGame._id, function(games) {
				$scope.games = games
			})

			if ($scope.currentGame.parent == '_endgame') {

				$scope.currentParent = {
					_id: '_noparent'
				}
			} else {

				$scope.fetchOne($scope.currentGame.parent, function(doc) {
					$scope.currentParent = doc
				})
			}
		}, function(err) {
			window.sessionStorage.setItem('currentGame', '_endgame')

			$scope.currentGame = {
				_id: '_endgame'
			}

			$scope.currentParent = {
				_id: '_noparent'
			}

			$scope.fetchChildren($scope.currentGame._id, function(games) {
				$scope.games = games
			})
		})
	}

	$scope.validateTime = function() {
		var input = $scope.game.end.trim(),
		invalid = 'Invalid Date',
		parsed = parseTime(input),
		error = 'time not parsed'

		if (input == '') {
			$scope.addForm.time.error = false
			$scope.addForm.time.message = false
			return false
		}

		if (!parsed) {

			$scope.addForm.time.error = error
			$scope.addForm.time.message = false
		} else {

			if (isValidTime(input) == 'past') {
				$scope.addForm.time.error = 'time cannot be in the past'
				$scope.addForm.time.message = false

				return false
			} else if (isValidTime(input) == 'far') {
				$scope.addForm.time.error = 'time is too far in the future'
				$scope.addForm.time.message = false

				return false
			}

			$scope.addForm.time.error = false
			$scope.addForm.time.message = parseTime(input)
			return true
		}

		// not parsed, add 'in ' and try again
	  parsed = parseTime('in ' + input)

		if (!parsed) {

			$scope.addForm.time.error = error
			$scope.addForm.time.message = false
		} else {

			if (isValidTime(input) == 'past') {
				$scope.addForm.time.error = 'time cannot be in the past'
				$scope.addForm.time.message = false

				return false
			} else if (isValidTime(input) == 'past') {
				$scope.addForm.time.error = 'time is too far in the future'
				$scope.addForm.time.message = false

				return false
			}

			$scope.addForm.time.error = false
			$scope.addForm.time.message = parsed
			return true
		}

		return true
	}

	$scope.add = function() {

		if ($scope.game.game == '') {
			$('.form-wrap .game-input').focus()
			return false
		}

		if ($scope.game.end == '') {
			$('.form-wrap .time-input').focus()
			return false
		}

		var end = Date.create(($scope.game.end))

		if (end == 'Invalid Date') {
			$('.form-wrap .time-input').focus()
			$scope.addForm.time.error = 'time not parsed'
			return false
		}

		var gameId = generateId(),
		gameText = $scope.game.game.trim(),
		now = new Date().toISOString()

		countMap = function(doc, emit) {
			if(doc.parent == parent) {
				emit()
			}
		}

		// defining game and pushing to $scope.games here because the ui needs to be rendered as fast as possible
		var game = {
			_id: gameId,
			game: gameText,
			parent: $scope.currentGame._id,
			created: now,
			position: 0,
			plays: [
				{
					state: 'playing',
					end: end,
					priority: $scope.game.priority,
					created: now
				}
			]
		}

		var temp = {
			doc: game
		}

		$scope.games.reverse()
		$scope.games.push(temp)
		$scope.games.reverse()
		$scope.hideForm()

		$scope.addForm.time.error = false
		$scope.addForm.time.message = false

		$scope.fetchChildren($scope.currentGame._id, function(children) {
			var low = 1

			$.each(children, function() {
				pos = $(this)[0].doc.position

				if (pos < low) {
					low = pos
				}
			})

			game.position = low - 1

			db.put(game).then(function(meta) {
				db.get(meta.id, {include_docs: true}).then(function(res) {
					var game = {
						doc: res
					}

					$scope.game.game = ''
					$scope.game.end = ''
					$scope.game.priority = 4
				})
			})
		})
	}

	$scope.saveEdit = function() {
		$scope.update(function() {
			$scope.hideEditForm()
		})
	}

	$scope.update = function(success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		if ($scope.editForm.game.text == '') {
			$('edit-form-wrap .game-input').focus()
			return false
		}

		if ($scope.editForm.time.text == '') {
			$('edit-form-wrap .time-input').focus()
			return false
		}

		db.get($scope.currentGame._id).then(function(edited) {
			var gameText = $scope.editForm.game.text
			end = $scope.editForm.time.text
			priority = $scope.editForm.priority.value

			if (gameText != '' && gameText != edited.game) {
				edited.game = gameText
			}

			if (end != '' && end != edited.plays[0].end) {
				edited.plays[0].end = end
			}

			if (
				(priority == 8 || priority == 4 || priority == 2)
				&& priority != edited.plays[0].priority
			) {
				edited.plays[0].priority = priority
			}

			db.put(edited, edited._id, edited._rev).then(function(doc) {
				currentGame = doc
				success(doc)
			}).catch(function(err) {

				$scope.hideEditForm()
				error(err)
			})
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.setState = function(id, state) {

		db.get(id).then(function(doc) {
			var updatedDoc = doc

			updatedDoc.plays[0].state = state
			log(updatedDoc)

			return db.put(updatedDoc, doc._id, doc._rev).then(function() {
				// updates the ui, the actual result is slow
				$.each($scope.games, function() {
					if ($(this)[0].doc._id == id) {
						$(this)[0].doc = updatedDoc
					}
				})
			}).catch(function(err) {
				console.error(err)
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
				console.error(err)
			})
		})
	}

	$scope.showForm = function() {
		$('.form-wrap .form-content-wrap')
			.css('opacity', 0)
			.slideDown()
			.animate({
				opacity: 1
			})
			.find('.game-input').focus()
		$('.form-wrap .form-switch')
			.hide()
			.css('opacity', 0)
	}

	$scope.hideForm = function() {
		$('.form-wrap .form-content-wrap')
			.animate({
				opacity: 0
			})
			.slideUp(function() {
				$('.form-wrap .form-switch')
					.fadeIn(200)
					.css('opacity', 1)
			})

			$('.form-wrap .form-switch').animate({
				opacity: 1
			})
	}

	$scope.showEditForm = function() {
		$('.edit-form-wrap').fadeIn(500)
		$('.edit-form-wrap .game-input').focus()
		$('.editable-switch').hide()

		$scope.editForm.game.text = $scope.currentGame.game
		$scope.editForm.time.text = $scope.currentGame.plays[0].end
		$scope.editForm.priority.value = $scope.currentGame.plays[0].priority

		$scope.editing = true
	}

	$scope.hideEditForm = function(save) {

		if (save == undefined) {
			save = true
		}

		$('.edit-form-wrap').hide()
		$('.editable-switch').fadeIn(500)

		if (save) {
			$scope.update()
		}

		$scope.editing = false
	}

	$scope.setCurrentGame = function(id) {
		if ($scope.currentGame._id == id) {
			return true
		}

		$scope.fetchChildren(id, function(games) {
			$scope.games = games
			$('.children').css({
				'margin-left': 60,
				opacity: 0
			}).animate({
				'margin-left': 0,
				opacity: 1
			})

			$('.no-games').css('opacity', 1)
		})

		$('.current-game-text').css({
			'margin-left': -60,
			'zoom': .6,
			opacity: 0
		}).animate({
			'margin-left': 0,
			'zoom': 1,
			opacity: 1
		})

		$('.no-games').css('opacity', 0)

		if (id == '_endgame') {
			$scope.currentGame = { _id: id}
			$scope.game.priority = 8
			window.sessionStorage.setItem('currentGame', id)
		} else {

			$scope.fetchOne(id, function(current) {
				$scope.currentGame = current
				$scope.game.priority = 4

				window.sessionStorage.setItem('currentGame', current._id)

				if ($scope.currentGame.parent == '_endgame') {

					$scope.currentParent = {
						_id: '_noparent'
					}
				} else {

					$scope.fetchOne($scope.currentGame.parent, function(doc) {
						$scope.currentParent = doc
					})
				}
			}, function(err) {
				console.error(err)
			})
		}

		$('.container').animate({ scrollTop: 0})
		$('body').animate({ scrollTop: 0})

		$.each($('.children .child'), function() {
			$(this).css({
				opacity: 0,
				'margin-left': -$(this).offset().top*.8
			})
		})
	}

	$scope.openGame = function(e) {
		var target = $(e.target),
		element = $(e.currentTarget),
		id = element.data('id')

		log(element)

		if (id != undefined && !target.is('.state-wrap') && !target.parents().is('.state-wrap')) {

			$scope.setCurrentGame(id)
		}
	}

	$(document).on('mouseup click touch', function(e) {
		var target = e.target,
		form = $('.form-wrap'),
		editForm = $('.editable')

		if (
			!$(target).is(form) && !$(target).parents().is(form)
		) {
			$scope.hideForm()
		}

		if (
			!$(target).is(editForm)
			&& !$(target).parents().is(editForm)
			&& $scope.editing == true
		) {
			$scope.hideEditForm()
		}
	})

	$(document).ready(function() {

		$(document).keydown(function (e) {
			if (e.keyCode === 27) {
				$scope.hideForm()
				$scope.hideEditForm(false)
				return false;
			}
		})

		//todo: doesn't work on mobile & jquery-ui-touch-punch doesn't seem to be helping :(

		// var stopPos

		//
		// $('.sortable').sortable({
		// 	axis: 'y',
		// 	containment: '.children-wrap',
		// 	distance: 10,
		// 	revert: true,
		// 	tolerance: 'pointer',
		// 	delay: 500,
		// 	stop: function(event, ui) {
		// 		stopPos = ui.item.index()
		// 		var movedId = $(ui.item).data('id'),
		// 		prevId = $(ui.item).prev().data('id'),
		// 		nextId = $(ui.item).next().data('id')
		//
		// 		db.get(prevId).then(function(doc) {
		//
		// 			var prevPos = doc.position
		//
		// 			if (!isNaN(prevPos)) {
		// 				return prevPos
		// 			} else {
		// 				return 0
		// 			}
		// 		}).then(function(prevPos) {
		// 			// prevPos is found
		// 			db.get(nextId).then(function(doc) {
		// 				var nextPos = doc.position
		//
		// 				if (!isNaN(nextPos)) {
		// 					log('nextPos: ' + nextPos)
		// 					log('prevPos: ' + prevPos)
		// 					return (nextPos + prevPos)/2
		//
		// 				} else {
		//
		// 					log('prevPos: ' + prevPos)
		// 					return Math.round(prevPos + 1)
		// 				}
		// 			}).then(function(pos) {
		// 				log("finalPos: " + pos)
		// 				$scope.setPosition(movedId, pos)
		// 			}).catch(function(err) {
		// 				// we don't have nextPos
		// 				console.error(err)
		// 				log('prevPos: ' + prevPos)
		// 				$scope.setPosition(movedId, Math.round(prevPos + 1))
		// 			})
		// 		}).catch(function(err) {
		// 			// prevPos is not found
		// 			db.get(nextId).then(function(doc) {
		// 				var nextPos = doc.position
		//
		// 				if (!isNaN(nextPos)) {
		// 					log('nextPos: ' + nextPos)
		// 					return Math.round(nextPos - 1)
		//
		// 				} else {
		// 					// we've nothing - return 0
		// 					return 0
		// 				}
		// 			}).then(function(pos) {
		// 				// we've nextPos
		// 				log("finalPos: " + pos)
		// 				$scope.setPosition(movedId, pos)
		// 			}).catch(function(err) {
		// 				// we've nothing
		// 				console.error(err)
		// 				$scope.setPosition(movedId, 0)
		// 			})
		// 		})
		//
		// 		return false
		// 	}
		// })
	})
})
