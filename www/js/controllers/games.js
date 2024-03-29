var app = angular.module('tinker', [
	'pouchdb',
	'ionic',
	'angularMoment'
]),

// remote = 'http://localhost:5984/games'
remote = 'https://penser:cloudant@penser.cloudant.com/games'

app.config(function($ionicConfigProvider) {
	$ionicConfigProvider.spinner.icon('none')
  $ionicConfigProvider.views.transition('ios')
  $ionicConfigProvider.tabs.style('standard').position('bottom')
  $ionicConfigProvider.navBar.alignTitle('center').positionPrimaryButtons('left')
})

app.directive('focusMe', function ($timeout) {
  return {
    link: function (scope, element, attrs) {
      if (attrs.focusMeDisable === "true") {
        return
      }

      $timeout(function () {
        element[0].focus()
        if (
        	window.cordova 
        	&& window.cordova.plugins 
        	&& window.cordova.plugins.Keyboard
        ) {
          cordova.plugins.Keyboard.show()
        }
      }, 350)
    }
  }
})


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
.filter('toMinutes', function() {
  return function(input) {

		return zeroPad(parseInt(input/60))
  }
})
.filter('toSeconds', function() {
  return function(input) {

		return zeroPad(parseInt(input%60))
  }
})

function zeroPad(num) {
  var zero = 2 - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
}

app.run(function($window, $rootScope) {
	$rootScope.online = navigator.onLine

	$window.addEventListener('offline', function() {
		$rootScope.$apply(function() {
			$rootScope.online = false
		})
	}, false)

	$window.addEventListener('online', function() {
		$rootScope.$apply(function() {
			$rootScope.online = true
		})
	}, false)
})

app.controller('GamesCtrl', function(
	$log, $scope, $http, $ionicSideMenuDelegate, 
	$ionicModal, $ionicPopover, pouchDB, $timeout
) {
	$scope.timeboxStarted = false
	$scope.currentTimebox = {}


	var gamesDB = pouchDB('games'),
	usersDB = pouchDB('games'),
	changes = gamesDB.changes({live: true, since: 'now'}),
	numChanges = 0

	gamesDB.info().catch(function (err) {
		gamesDB = new PouchDB(remote)
	})

	sessionGame = window.sessionStorage.getItem('currentGame')

	var currentUser = window.sessionStorage.getItem('currentUser')

  $ionicModal.fromTemplateUrl('signInModal.html', function(modal) {
    $scope.signInModal = modal;
  }, {
    focusFirstInput: true
  })

  $ionicModal.fromTemplateUrl('signUpModal.html', function(modal) {
    $scope.signUpModal = modal;
  }, {
    focusFirstInput: true
  })

  $ionicPopover.fromTemplateUrl('editPopover.html').then(function(popover) {
    $scope.popover = popover
  })

  $scope.openPopover = function($event) {
    $scope.popover.show($event);
  };

  $scope.closePopover = function() {
    $scope.popover.hide();
  };

  $scope.$on('$destroy', function() {
    $scope.popover.remove();
  });

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

	$scope.doSync = function(success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		$scope.syncMessage = ''

		gamesDB.sync(remote).on('change', function(change) {

    	$scope.$broadcast('scroll.refreshComplete')
    	$scope.syncMessage = 'Sync Complete'

    	success()
		}).on('paused', function(info) {
    	$scope.$broadcast('scroll.refreshComplete')
    	$scope.syncMessage = 'No Connection'

    	error()
		}).on('active', function(info) {
		  // replication was resumed
    	$scope.syncMessage = 'Syncing...'

    	success()
		}).on('error', function(err) {
    	$scope.$broadcast('scroll.refreshComplete')
    	$scope.syncMessage = 'Sync Failed'

    	error()
		})
	}

	$scope.pullToSync = function() {
		$scope.doSync(function() {

	  	$('.sync-message').fadeIn()
	  	setTimeout(function() {
	  		$('.sync-message').slideUp()
	  	}, 3000)
		}, function() {

	  	$('.sync-message').fadeIn()
	  	setTimeout(function() {
	  		$('.sync-message').slideUp()

	  		if (window.sessionStorage.getItem('local') == 'local') {

		  		$scope.signUpModal.show()
	  		}
	  	}, 3000)
		})

	}

	$scope.pullToOpenParent = function() {
		$scope.openCurrentParent()
    $scope.$broadcast('scroll.refreshComplete')
	}

	changes.on('change', function(change) {
		$scope.doSync()

		if ($scope.currentGame._id != '_endgame') {
			$scope.fetchOne($scope.currentGame._id, function(doc) {
				$scope.currentGame = doc
				$scope.fetchPath($scope.currentGame._id)
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

		$scope.fetchChildrenWithState($scope.currentGame._id)

		$scope.fetchPrios($scope.currentGame._id, function(prios) {
			$scope.prios = prios
		})
	})

	$scope.fetchChildren = function(parent, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		childrenMap = function(doc, emit) {
		  if (doc.parent == parent && doc.user == currentUser) {

		    emit([doc.position])
		  }
		}

		gamesDB.query(childrenMap, {include_docs: true}).then(function(games) {
			success(games.rows)
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.fetchChildrenWithState = function(parent, success, error) {

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		childrenMap = function(doc, emit) {
		  if (doc.parent == parent && doc.user == currentUser) {

		    emit([doc.position])
		  }
		}

		gamesDB.query(
			childrenMap,
			{include_docs: true}
		).then(function(games) {

			$scope.playingGames = []
			$scope.wonGames = []
			$scope.lostGames = []

			$.each(games.rows, function() {
				var game = $(this)[0].doc

				if (game.plays[game.plays.length-1].state == 'playing') {
					$scope.playingGames.push($(this)[0])
				}

				if (game.plays[game.plays.length-1].state == 'won') {
					$scope.wonGames.push($(this)[0])
				}

				if (game.plays[game.plays.length-1].state == 'lost') {
					$scope.lostGames.push($(this)[0])
				}
			})

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

		gamesDB.get(id).then(function(doc) {
			success(doc)
			return doc
		}).catch(function(err) {
			error(err)
		})
	}

	$scope.fetchPath = function(id, success, error) {

		var tempPath = []

		if (success == undefined) {
			success = function() {}
		}

		if (error == undefined) {
			error = function() {}
		}

		(function insertToPath(i, parent) {
   		
   		gamesDB.get(parent, {include_docs: true}, function(err, current) {
         
      	if (--i > 0 && parent != '_endgame') {

      		if (id != current._id) {
      			tempPath.splice(0, 0, current)
      		}
	      	
	      	insertToPath(i, current.parent)
      	} else {
    			$scope.currentPath = []
    			$scope.currentPath = tempPath
    		}
   		}) 
		})(30, id)
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
				&& doc.user == currentUser
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

		gamesDB.query(prioMap, {include_docs: true, limit: 25}).then(function(games) {

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

		$scope.fetchChildrenWithState($scope.currentGame._id)
		$scope.fetchPrios($scope.currentGame._id, function(prios) {
			$scope.prios = prios
		})
	} else {

		$scope.fetchOne(sessionGame, function(doc) {
			$scope.currentGame = doc

			$scope.fetchChildrenWithState($scope.currentGame._id)
			$scope.fetchPrios($scope.currentGame._id, function(prios) {
				$scope.prios = prios
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

			$scope.fetchPath(doc._id)

		}, function(err) {
			window.sessionStorage.setItem('currentGame', '_endgame')

			$scope.currentGame = {
				_id: '_endgame'
			}

			$scope.currentParent = {
				_id: '_noparent'
			}

			$scope.fetchChildrenWithState($scope.currentGame._id)
			$scope.fetchPrios($scope.currentGame._id, function(prios) {
				$scope.prios = prios
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
			if(doc.parent == parent && doc.user == currentUser) {
				emit()
			}
		}

		// defining game and pushing to $scope.playingGames here because the ui needs to be rendered as fast as possible

		if (repeat != '' && repeat != undefined && repeat != false) {

			var game = {
				_id: gameId,
				user: currentUser,
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
				user: currentUser,
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

		if ($scope.playingGames == undefined) {
			$scope.playingGames = []
		}

		$scope.playingGames.reverse()
		$scope.playingGames.push(temp)
		$scope.playingGames.reverse()

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

			gamesDB.put(game).then(function(meta) {

				gamesDB.get(meta.id, {include_docs: true}).then(function(res) {

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
		  if (doc.game == '_trash' && doc.user == currentUser) {
		    emit([doc])
		  }
		}

		gamesDB.query(trashedMap, {include_docs: true}).then(function(trashed) {
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

		gamesDB.remove(id).then(function(game) {
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
		  if (doc.parent == id && doc.user == currentUser) {
		    emit([doc])
		  }
		}

		gamesDB.query(childrenMap, {include_docs: true}).then(function(children) {
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

		gamesDB.get($scope.currentGame._id).then(function(edited) {

			edited.parent = parent

			gamesDB.put(edited, edited._id, edited._rev).then(function(doc) {
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

		gamesDB.get($scope.currentGame._id).then(function(edited) {
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

			gamesDB.put(edited, edited._id, edited._rev).then(function(doc) {
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

		gamesDB.get(id).then(function(repeated) {

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

			gamesDB.put(repeated, repeated._id, repeated._rev).then(function(doc) {
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

		gamesDB.get($scope.currentGame._id).then(function(edited) {
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

			gamesDB.put(edited, edited._id, edited._rev).then(function(doc) {

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

		gamesDB.get(id).then(function(doc) {
			var updatedDoc = doc

			updatedDoc.plays[updatedDoc.plays.length-1].state = state
			console.log(updatedDoc)

			return gamesDB.put(updatedDoc, doc._id, doc._rev).then(function() {
				// updates the ui, the actual result is slow
				$.each($scope.playingGames, function() {
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

		gamesDB.get(id).then(function(doc) {
			var updatedDoc = doc
			updatedDoc.position = pos

			return gamesDB.put(updatedDoc, doc._id, doc._rev).then(function() {
				console.log('updated')
			}).catch(function(err) {
				console.error(err)
			})
		})
	}

  $scope.closeModal = function() {
    $scope.modal.hide();
  }

	$scope.isRightSideBarOpen = function() {
		return $ionicSideMenuDelegate.isOpenRight()
	}

	$scope.isLeftSideBarOpen = function() {
		return $ionicSideMenuDelegate.isOpenLeft()
	}

	$scope.toggleRightMenu = function() {
		$ionicSideMenuDelegate.toggleRight()
	}

	$scope.toggleLeftMenu = function() {
		$ionicSideMenuDelegate.toggleLeft()
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

	$scope.setCurrentGame = function(id) {
		if ($scope.currentGame._id == id) {
			return true
		}

		$scope.fetchPath(id)

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

		$scope.currentPath = []


		$scope.playingGames = []
		$scope.wonGames = []
		$scope.lostGames = []

		$('.children-wrap .no-games').hide()

		$scope.fetchChildrenWithState(id, function(children) {

			if (
				children[0] != undefined 
				&& children[0].doc.parent == $scope.currentGame._id
			) {

				$('.children-wrap')
				.css({
					'margin-top': 20
				})
				.animate({
					'margin-top': 0,
					'opacity': 1
				}, function() {
					setTimeout(function () {
						$('.children-wrap .no-games').fadeIn()
					}, 300)
				})
			}
		})

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
				$('.children-wrap').css('opacity', 1)
			})
		}
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

	$scope.isPast = function(time) {
		var d = Date.create(time)

		return d.isPast()
	}

	$scope.startTimebox = function(id) {

		if (!$scope.timeboxStarted) {
			$scope.startTime = Date.create().getTime()
			$scope.counter = 3600
			window.sessionStorage.setItem('currentTimebox', id)
			$scope.currentTimebox._id = window.sessionStorage.getItem('currentTimebox')

			$scope.fetchOne(id, function(doc) {
				$scope.currentTimebox = doc
			})

			$scope.timeboxTimeout = $timeout($scope.onTimeout, 1000)

			$scope.timeboxStarted = true
		} else {
			$scope.setCurrentGame(id)
		}

	}

	$scope.startTimeboxOnCurrentGame = function() {
		$scope.startTimebox($scope.currentGame._id)
	}

	$scope.closeNotif = function(id) {

		$scope.notifs.remove(
			$scope.notifs.find({id: id})
		)
	}

	$scope.stopTimebox = function() {
		$timeout.cancel($scope.timeboxTimeout)

		var now = parseInt(Date.create().getTime()/1000),
		startTime = parseInt($scope.startTime/1000)
		
		var duration = now - startTime

		if (duration >= 60) {
			duration = parseInt(duration/60)

			if (duration == 1) {
				duration = '1 minute'
			} else {
				duration =  duration + ' minutes'
			}
		}

		if (duration < 60) {

			if (duration == 1) {
				duration = '1 second'
			} else {
				duration = duration + ' seconds'
			}
		}

		notif = {
			message: {
				a: $scope.currentTimebox.game,
				b: $scope.currentTimebox._id,
				c: duration
			},
			time: Date.create(),
			tag: 'success',
			type: 'timeboxEnded',
			id: 'notif-' + generateId()
		},
		length = 1

		if ($scope.notifs == undefined) {
			$scope.notifs = [notif]
		} else {
			$scope.notifs.remove(
				$scope.notifs.find({message: {b: $scope.currentTimebox._id}})
			)
			$scope.notifs.push(notif)
			length = $scope.notifs.length
		}

		window.sessionStorage.setItem('currentTimebox', '')
		$scope.currentTimebox._id = ''

		$scope.timeboxStarted = false
	}

	$scope.onTimeout = function() {
		var now = parseInt(Date.create().getTime()/1000),
		startTime = parseInt($scope.startTime/1000)
		$scope.counter = 3600 - (now - startTime)
		$scope.timeboxTimeout = $timeout($scope.onTimeout, 1000)

		if ($scope.counter <= 0) {

			$scope.stopTimebox()
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
			$scope.signInModal.hide()
			$scope.signUpModal.hide()
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
