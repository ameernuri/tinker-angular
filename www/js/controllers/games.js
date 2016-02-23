var app = angular.module('tinker', [
	'pouchdb',
	'ionic',
	'angularMoment'
]),

remote = 'https://penser:cloudant@penser.cloudant.com/games'

app.filter('repeatTime', function() {
  return function(input) {
    return 'every ' + Date.create(Date.create().getTime() + input).relative()
		.replace(' from now', '')
		.replace(' ago', '')
  }
})
.filter('relativeTime', function() {
  return function(input) {
		var t = Date.create(input)

		if (t.isPast()) {
			return t.relative()
		}

    return 'for ' + t.relative()
		.replace(' from now', '')
  }
})

app.controller('GamesCtrl', function($log, $scope, $http, pouchDB) {
	var db = pouchDB('games'),
	changes = db.changes({live: true, since: 'now'}),
	numChanges = 0

	db.info().catch(function (err) {
		db = new PouchDB(remote)
	})

	sessionGame = window.sessionStorage.getItem('currentGame')

	$scope.editTemp
	$scope.game = []
	$scope.game.game = ''
	$scope.game.end = ''
	$scope.game.repeat = ''
	$scope.game.priority = 4

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

	$scope.replayForm = {
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

	$scope.doSync = function() {

		$scope.fetchPrios($scope.currentGame._id, function(prios) {
			$scope.prios = prios
		})

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

    $scope.$broadcast('scroll.refreshComplete');
	}

	changes.on('change', function(change) {
		$scope.doSync()
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

	$scope.fetchPrios = function(parent, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		prioMap = function(doc, emit) {
		  if (
				doc.parent != '_trash'
				&& doc.plays[doc.plays.length-1].state == 'playing'
				&& true /* is a descendent of parent */
			) {
				var now = Date.create().valueOf(),
				time = Date.create(doc.plays[doc.plays.length-1].end).valueOf(),
				priority = doc.plays[doc.plays.length-1].priority,
				diff = now - time,
				absDiff = Math.abs(diff)
				order = (time - (diff - absDiff) * Math.log(absDiff)) / Math.log(2000 + (priority/2))

		    emit([order])
		  }
		}

		db.query(prioMap, {include_docs: true, limit: 25}).then(function(games) {

			success(games.rows)
		}).catch(function(err) {
			error(err)
		})
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

		$scope.fetchPrios($scope.currentGame._id, function(prios) {
			$scope.prios = prios
		})

		$scope.fetchChildren($scope.currentGame._id, function(games) {
			$scope.games = games
		})
	} else {

		$scope.fetchOne(sessionGame, function(doc) {
			$scope.currentGame = doc

			$scope.fetchPrios($scope.currentGame._id, function(prios) {
				$scope.prios = prios
			})

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

			$scope.fetchPrios($scope.currentGame._id, function(prios) {
				$scope.prios = prios
			})

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
			v = validateTime($scope.game.end, $scope.currentGame.plays[$scope.currentGame.plays.length-1].end)
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
			v = validateTime($scope.editForm.time.text, $scope.currentParent.plays[$scope.currentParent.plays.length-1].end, false)
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

	$scope.validateReplayTime = function() {

		var v

		if ($scope.currentGame.parent != '_endgame') {
			v = validateTime($scope.replayForm.time.text, $scope.currentParent.plays[$scope.currentParent.plays.length-1].end, false)
		} else {
			v = validateTime($scope.replayForm.time.text, false, false)
		}

		var success = v.success

		if (v.error != false) {
			$scope.replayForm.time.error = v.error
			$scope.replayForm.time.success = v.success

			return false
		} else {

			$scope.replayForm.time.error = v.error
			$scope.replayForm.time.success = v.success

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
			v = validateTime($scope.game.end, $scope.currentGame.plays[$scope.currentGame.plays.length-1].end)
		} else {
			v = validateTime($scope.game.end)
		}

		if (v.error != false) {
			$('.form-wrap .time-input').focus()
			$scope.addForm.time.error = v.error

			return false
		}

		var now = Date.create(),
		end = parseTime($scope.game.end),
		gameId = generateId(),
		gameText = $scope.game.game.trim()

		if ($scope.game.repeat != '') {
			var repeat = parseTime($scope.game.repeat).getTime() - now.getTime(),
			repeatEnd = Date.create(Date.create().getTime() + repeat)
		}

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

		if (repeat != '' && repeat != undefined && repeat != false) {

			var game = {
				_id: gameId,
				game: gameText,
				parent: $scope.currentGame._id,
				repeat: repeat,
				end: end,
				created: now,
				position: 0,
				plays: [
					{
						state: 'playing',
						end: repeatEnd,
						kind: 'repeat',
						priority: $scope.game.priority,
						created: now
					}
				]
			}
		} else {

			var game = {
				_id: gameId,
				game: gameText,
				parent: $scope.currentGame._id,
				repeat: repeat,
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
		}

		var temp = {
			doc: game
		}

		if ($scope.games == undefined) {
			$scope.games = []
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
					$scope.game.repeat = ''
					$scope.game.priority = 4

					$('.form-wrap .repeat-input').hide()
				}).catch(function(err) {
					console.log(err)
				})
			}).catch(function(err) {
				console.log(err)
			})
		}).catch(function(err) {
			console.log(err)
		})
	}

	$scope.saveEdit = function() {
		$scope.update(function() {
			$scope.hideEditForm()
		})
	}

	$scope.findTrashed = function(success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		var trashedMap = function(doc, emit) {
		  if (doc.game == '_trash') {
		    emit([doc])
		  }
		}

		db.query(trashedMap, {include_docs: true}).then(function(trashed) {
			success(trashed)
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.delete = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		db.remove(id).then(function(game) {
			success(game)
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.findChildren = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		var childrenMap = function(doc, emit) {
		  if (doc.parent == id) {
		    emit([doc])
		  }
		}

		db.query(childrenMap, {include_docs: true}).then(function(children) {
			success(children)
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.delete = function(success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		$scope.trash($scope.currentGame._id)

		$scope.openCurrentParent()
		$scope.hideEditForm()
	}

	$scope.trash = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		$scope.changeParent(id, '_trash', success, error)
	}

	$scope.changeParent = function(child, parent, success, error) {


		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		db.get($scope.currentGame._id).then(function(edited) {

			edited.parent = parent

			db.put(edited, edited._id, edited._rev).then(function(doc) {
				success(doc)
			}).catch(function(err) {
				error(err)
			})
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.update = function(success, error) {

		var v

		if ($scope.currentParent._id != '_noparent') {

			v = validateTime($scope.editForm.time.text, $scope.currentParent.plays[$scope.currentParent.plays.length-1].end, false)
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

			if (end != '' && end != edited.plays[edited.plays.length-1].end) {
				edited.plays[edited.plays.length-1].end = end
			}

			if (priority != 8 && priority != 4 && priority != 2) {
				priority = 4
			}

			if (priority != edited.plays[edited.plays.length-1].priority) {
				edited.plays[edited.plays.length-1].priority = priority
			}

			db.put(edited, edited._id, edited._rev).then(function(doc) {
				success(doc)
			}).catch(function(err) {

				$scope.hideEditForm()
				error(err)
			})
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.createRepeat = function(id, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		db.get(id).then(function(repeated) {

			var end = Date.create(
				Date.create(repeated.plays[repeated.plays.length-1].end)
				.getTime() + repeated.repeat
			)
			var	priority = repeated.plays[repeated.plays.length-1],
			now = Date.create()

			if (end.isAfter(Date.create(repeated.end))) {
				return false
			}

			if (priority != 8 && priority != 4 && priority != 2) {
				priority = 4
			}

			var replay = {
				state: 'playing',
				end: end,
				priority: priority,
				kind: 'repeat',
				created: now
			}

			repeated.plays.push(replay)

			db.put(repeated, repeated._id, repeated._rev).then(function(doc) {
				success(doc)
			}).catch(function(err) {
				error(err)
			})
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.createReplay = function(success, error) {

		var v

		if ($scope.currentParent._id != '_noparent') {

			v = validateTime($scope.replayForm.time.text, $scope.currentParent.plays[$scope.currentParent.plays.length-1].end, false)
		} else {
			v = validateTime($scope.replayForm.time.text, false, false)
		}

		if (v.error != false) {
			$('.replay-form-wrap .time-input').focus()
			$scope.replayForm.time.error = v.error
			return false
		}

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		var end = parseTime($scope.replayForm.time.text)

		if (end == false) {
			$('.replay-form-wrap .time-input').focus()
			$scope.replayForm.time.error = 'unknown error'
			return false
		}

		if ($scope.replayForm.time.text == '') {
			$('replay-form-wrap .time-input').focus()
			return false
		}

		db.get($scope.currentGame._id).then(function(edited) {
			console.log('checkpoint 1: ' + edited)
			var	priority = $scope.replayForm.priority.value,
			now = Date.create()

			if (priority != 8 && priority != 4 && priority != 2) {
				priority = 4
			}

			var replay = {
				state: 'playing',
				end: end,
				priority: priority,
				created: now
			}

			edited.plays.push(replay)

			db.put(edited, edited._id, edited._rev).then(function(doc) {

				$scope.replayForm.time.text = ''

				hideReplayForm()
				success(doc)
			}).catch(function(err) {

				$scope.hideReplayForm()
				error(err)
			})
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.focusOnReplayTime = function() {
		$('.replay-form-wrap .time-input').focus()
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

			updatedDoc.plays[updatedDoc.plays.length-1].state = state
			console.log(updatedDoc)

			return db.put(updatedDoc, doc._id, doc._rev).then(function() {
				// updates the ui, the actual result is slow
				$.each($scope.games, function() {
					if ($(this)[0].doc._id == id) {
						$(this)[0].doc = updatedDoc
					}
				})

				if (doc.repeat != '' && doc.repeat != undefined && doc.repeat != false) {
					console.log('>>>>>>> there will be a replay here!')
					$scope.createRepeat(doc._id, function() {
						console.log('>>>>>> Yay!')
					}, function(err) {
						console.error(err)
					})
				}
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
				console.log('updated')
			}).catch(function(err) {
				console.error(err)
			})
		})
	}

	$scope.showForm = function() {
		$('.form-wrap .form-content-wrap').show(function() {

			$('.form-wrap .game-input').focus()
		})
		$('.form-wrap .form-switch').hide()
	}

	$scope.hideForm = function() {
		$('.form-wrap .form-content-wrap').hide()
		$('.form-wrap .form-switch').show()

		$scope.addForm.time.error = false
		$scope.addForm.time.success = false

	}

	$scope.showEditForm = function() {
		$('.edit-form-wrap').fadeIn(500, function() {
			$('.edit-form-wrap .game-input').focus()
		})
		$('.editable-switch').hide()

		$scope.editForm.game.text = $scope.currentGame.game
		$scope.editForm.time.text = Date.create($scope.currentGame.plays[$scope.currentGame.plays.length-1].end)
		.format('{Mon} {d} {yyyy} {12hr}:{mm} {TT}')
		$scope.editForm.priority.value = $scope.currentGame.plays[$scope.currentGame.plays.length-1].priority

		$scope.editing = true
	}

	$scope.hideEditForm = function() {

		$('.edit-form-wrap').hide()
		$('.editable-switch').fadeIn(500)
		$('.game-form-content').show()
		$('.edit-more-wrap').hide()

		$scope.editing = false

		$scope.editForm.time.error = false
		$scope.editForm.time.success = false
	}

	$scope.showReplayForm = function() {
		$('.replay-form-wrap').fadeIn(500, function() {
			$('.replay-form-wrap .time-input').focus()
		})
		$('.editable').hide()
		$('.replay-form-switch').hide()

		$scope.replayForm.priority.value = $scope.currentGame.plays[$scope.currentGame.plays.length-1].priority
	}

	$scope.hideReplayForm = function() {

		$('.replay-form-wrap').hide()
		$('.replay-form-switch').show()
		$('.editable').fadeIn()

		$scope.replayForm.time.error = false
		$scope.replayForm.time.success = false
	}

	$scope.showRepeatInput = function() {
		$('.form-wrap .repeat-input').toggle(function() {
			$(this).focus()
		})
	}

	$scope.hideRepeatInput = function() {
		$('.form-wrap .repeat-input')
			.hide()
	}

	$scope.tab2 = function() {

		if ($(window).width() <= 660) {

			$('body').addClass('tab-2')
			$('body').removeClass('tab-1')
		}
	}

	$scope.tab1 = function() {

		if ($(window).width() <= 660) {

			$('body').addClass('tab-1')
			$('body').removeClass('tab-2')
		}
	}

	$scope.setCurrentGame = function(id) {
		if ($scope.currentGame._id == id) {
			return true
		}

		$('.form-wrap .game-input').val('')
		$('.form-wrap .time-input').val('')

		$scope.addForm.game.text =
		$scope.addForm.game.success =
		$scope.addForm.game.info =
		$scope.addForm.game.error =
		$scope.addForm.time.text =
		$scope.addForm.time.success =
		$scope.addForm.time.info =
		$scope.addForm.time.error =
		$scope.addForm.time.typeahead = ''

		$scope.fetchPrios(id, function(prios) {
			$scope.prios = prios
		})

		$scope.fetchChildren(id, function(games) {
			$scope.games = games

			$('.no-games').css('opacity', 1)
		})

		$('.no-games').css('opacity', 0)

		if (id == '_endgame') {
			$scope.currentGame = { _id: id}
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

		if (id != undefined && !target.is('.state-wrap') && !target.parents().is('.state-wrap')) {

			$scope.setCurrentGame(id)
		}
	}

	$scope.openCurrentParent = function() {
		if ($scope.currentGame._id != '_endgame') {
			$scope.setCurrentGame($scope.currentGame.parent)
		}
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

	$scope.showEditMore = function() {
		$('.game-form-content').hide()
		$('.edit-more-wrap').fadeIn()

		return false
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

	$scope.nextPriority = function() {
		var p = $scope.game.priority

		if (p == 8) {
			$scope.game.priority = 4
		}

		if (p == 4) {
			$scope.game.priority = 2
		}

		if (p == 2) {
			$scope.game.priority = 8
		}

		$('.form-wrap .game-input').focus()
	}

	$scope.nextEditPriority = function() {
		var p = $scope.editForm.priority.value

		if (p == 8) {
			$scope.editForm.priority.value = 4
		}

		if (p == 4) {
			$scope.editForm.priority.value = 2
		}

		if (p == 2) {
			$scope.editForm.priority.value = 8
		}

		$('.edit-form-wrap .game-input').focus()
	}

	$scope.nextReplayPriority = function() {
		var p = $scope.replayForm.priority.value

		if (p == 8) {
			$scope.replayForm.priority.value = 4
		}

		if (p == 4) {
			$scope.replayForm.priority.value = 2
		}

		if (p == 2) {
			$scope.replayForm.priority.value = 8
		}
	}

	$(document).on('mouseup click touch', function(e) {
		var target = e.target,
		form = $('.form-wrap'),
		editForm = $('.editable')
		replayForm = $('.replay-wrap')

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

		if (
			!$(target).is(replayForm)
			&& !$(target).parents().is(replayForm)
		) {
			$scope.hideReplayForm()
		}
	})

	$(document).keydown(function(e) {
		if (e.keyCode === 27) {
			$scope.hideForm()
			$scope.hideEditForm()
			$scope.hideReplayForm()
			return false
		}

		if (
			$scope.addForm.time.typeahead != ''
			&& $scope.addForm.time.typeahead != false
			&& $scope.addForm.time.typeahead != undefined
			&& $(e.target)[0] == $('.form-wrap .time-input')[0]
		) {

			if (e.keyCode == 9 || e.keyCode == 39) {
				$scope.replaceTypeahead()

				return false
			}

			if (e.keyCode == 13) {
				$scope.replaceTypeahead()
			}
		}
	})
})
