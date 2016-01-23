var app = angular.module('tinker', ['pouchdb', 'angularMoment'])

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
			info: '',
			success: ''
		},
		time: {
			text: '',
			error: '',
			info: '',
			success: '',
			typeahead: ''
		}
	}

	$scope.editForm = {
		game: {
			text: '',
			error: '',
			info: '',
			success: ''
		},
		time: {
			text: '',
			error: '',
			info: '',
			success: '',
			typeahead: ''
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

	$scope.validateGame = function() {
		if ($scope.game.game == '') {
			$scope.addForm.game.error = 'what\'s the game?'
			return false
		} else {
			$scope.addForm.game.error = false
			return true
		}
	}

	$scope.validateTime = function(e) {

		$('.form-wrap .typeahead').show()

		$scope.addForm.time.typeahead = ''

		var v

		if ($scope.currentGame._id != '_endgame') {
			v = validateTime($scope.game.end, $scope.currentGame.plays[0].end)
		} else {
			v = validateTime($scope.game.end)
		}

		var success = v.success

		if (v.error != false) {
			$scope.addForm.time.error = v.error
			$scope.addForm.time.success = v.success

			return false
		} else {

			$scope.addForm.time.error = v.error
			$scope.addForm.time.success = v.success
			$scope.addForm.time.typeahead = v.typeahead

			return true
		}
	}

	$scope.validateEditTime = function() {

		var v

		if ($scope.currentGame.parent != '_endgame') {
			v = validateTime($scope.editForm.time.text, $scope.currentParent.plays[0].end, false)
		} else {
			v = validateTime($scope.editForm.time.text, false, false)
		}

		var success = v.success

		if (v.error != false) {
			$scope.editForm.time.error = v.error
			$scope.editForm.time.success = v.success

			return false
		} else {

			$scope.editForm.time.error = v.error
			$scope.editForm.time.success = v.success

			return true
		}
	}

	$scope.add = function() {

		if ($scope.game.game == '') {
			$('.form-wrap .game-input').focus()
			$scope.addForm.game.error = 'what\'s the game?'
			return false
		}

		var v

		if ($scope.currentGame._id != '_endgame') {
			v = validateTime($scope.game.end, $scope.currentGame.plays[0].end)
		} else {
			v = validateTime($scope.game.end)
		}

		if (v.error != false) {
			$('.form-wrap .time-input').focus()
			$scope.addForm.time.error = v.error
			return false
		}

		var end = parseTime($scope.game.end),
		gameId = generateId(),
		gameText = $scope.game.game.trim(),
		now = Date.create()

		if (end == false) {
			$('.form-wrap .time-input').focus()
			$scope.addForm.time.error = 'unknown error'
			return false
		}

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
		$scope.addForm.time.success = false

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

		var v

		if ($scope.currentParent._id != '_noparent') {

			v = validateTime($scope.editForm.time.text, $scope.currentParent.plays[0].end, false)
		} else {
			v = validateTime($scope.editForm.time.text, false, false)
		}

		if (v.error != false) {
			$('.edit-form-wrap .time-input').focus()
			$scope.editForm.time.error = v.error
			return false
		}

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		var end = parseTime($scope.editForm.time.text)

		if (end == false) {
			$('.edit-form-wrap .time-input').focus()
			$scope.editForm.time.error = 'unknown error'
			return false
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

	$scope.focusOnEditGame = function() {
		$('.edit-form-wrap .game-input').focus()
	}

	$scope.focusOnAddGame = function() {
		$('.form-wrap .game-input').focus()
	}

	$scope.setState = function(id, state) {

		$('.state-wrap.activate').removeClass('activate')

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

			$scope.addForm.time.error = false
			$scope.addForm.time.success = false

	}

	$scope.showEditForm = function() {
		$('.edit-form-wrap').fadeIn(500)
		$('.edit-form-wrap .game-input').focus()
		$('.editable-switch').hide()

		$scope.editForm.game.text = $scope.currentGame.game
		$scope.editForm.time.text = Date.create($scope.currentGame.plays[0].end)
		.format('{Mon} {d} {yyyy} {12hr}:{mm} {TT}')
		$scope.editForm.priority.value = $scope.currentGame.plays[0].priority

		$scope.editing = true
	}

	$scope.hideEditForm = function() {

		$('.edit-form-wrap').hide()
		$('.editable-switch').fadeIn(500)

		$scope.editing = false

		$scope.editForm.time.error = false
		$scope.editForm.time.success = false
	}

	$scope.setCurrentGame = function(id) {
		if ($scope.currentGame._id == id) {
			return true
		}

		$('.form-wrap .game-input').val('')
		$('.form-wrap .time-input').val('')

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

	$scope.openCurrentParent = function() {
		$scope.setCurrentGame($scope.currentGame.parent)
	}

	$scope.showStateButtons = function(e) {
		var element = $(e.currentTarget)

		$('.state-wrap')
			.removeClass('activate')
			.find('.state')
			.removeClass('ready')

		element
			.addClass('activate')
			.find('.state')
			.addClass('ready')
	}

	$scope.hideStateButtons = function(e) {
		var element = $(e.currentTarget)

		element.removeClass('activate')
	}

	$scope.replaceTypeahead = function() {
		var typeahead = $scope.game.end + $scope.addForm.time.typeahead
		typeahead = typeahead
		.replace(/([0-9])([a-zA-Z])/, '$1 $2')

		$scope.addForm.time.typeahead = ''
		$('.form-wrap .time-input')
			.val(typeahead)
			.focus()

		$scope.game.end = typeahead
	}

	$scope.hideTypeahead = function() {
		$('.form-wrap .typeahead').hide()
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

	$(document).keydown(function(e) {
		if (e.keyCode === 27) {
			$scope.hideForm()
			$scope.hideEditForm()
			return false
		}

		if (
			(e.keyCode == 9 || e.keyCode == 39)
			&& $scope.addForm.time.typeahead != ''
			&& $scope.addForm.time.typeahead != false
			&& $scope.addForm.time.typeahead != undefined
			&& $(e.target)[0] == $('.form-wrap .time-input')[0]
		) {

			$scope.replaceTypeahead()

			return false
		}
	})

	$(window).scroll(function(e) {
		var dh = $(document).height(),
		wh = $(window).height(),
		st = $(window).scrollTop()

		log('...')
		log(st)
		log(wh)
		log(dh)

		if (st + wh >= dh) {
			return false
		}

		if (st <= 0) {
			return false
		}
	})


	//todo: doesn't work on mobile & jquery-ui-touch-punch doesn't seem to be helping :(

	// var stopPos
	//
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
