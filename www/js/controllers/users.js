app.controller('UsersCtrl', function($scope, pouchDB) {

	var gamesDB = pouchDB('games'),
	usersDB = pouchDB('users'),
	sessionUser = window.sessionStorage.getItem('signedIn')

	if (sessionUser == undefined || sessionUser == '') {
		$scope.signedIn = 'local'
	} else {
		$scope.signedIn = sessionUser
	}


	$scope.doSignIn = function(email) {

		window.sessionStorage.setItem('signedIn', email)
		$scope.signedIn = email
	}

	// if currentUser session is empty, store with a random user id
	if (
		window.sessionStorage.getItem('currentUser') == undefined
		|| window.sessionStorage.getItem('currentUser') == ''
	) {
		window.sessionStorage.setItem('currentUser', 'user_' + generateId())
	}

	// if signedIn session is empty, add 'local' to it
	if (
		window.sessionStorage.getItem('signedIn') == undefined
		|| window.sessionStorage.getItem('signedIn') == ''
	) {
		$scope.doSignIn('local')
	}

	$scope.currentUser = window.sessionStorage.getItem('currentUser')
	$scope.signedIn = window.sessionStorage.getItem('signedIn')

	$scope.signUp = function() {

		var user = {
			_id: $scope.currentUser,
			email: $scope.signUpEmail,
			password: $scope.signUpPassword,
			username: $scope.signUpUsername,
			name: $scope.signUpName
		}

		usersDB.put(user).then(function() {

			$scope.doSignIn($scope.signUpEmail)
			window.location.reload()

		}).catch(function(err) {
			console.error(err)
		})
	}

	$scope.signIn = function() {
		
		var userMap = function(doc, emit) {
			if (
				(
					doc.email == $scope.signInUsernameOrEmail
					|| doc.username == $scope.signInUsernameOrEmail
				)
				&& doc.password == $scope.signInPassword
			) {
				emit()
			}
		}

		usersDB.query(userMap, {include_docs: true}).then(function(users) {

			if (users.rows[0].doc.email != undefined) {

				window.sessionStorage.setItem('currentUser', users.rows[0].doc._id)

				window.sessionStorage.setItem('signedIn', users.rows[0].doc.email)
				$scope.signedIn = users.rows[0].doc.email
				window.location.reload()
			}
			return true
		}).catch(function(err) {
			console.error(err)
		})
	}

	$scope.signOut = function() {

		window.sessionStorage.setItem('currentGame', '_endgame')
		window.sessionStorage.setItem('currentUser', 'user_' + generateId())
		window.sessionStorage.setItem('signedIn', 'local')
		$scope.signedIn = 'local'
		window.location.reload()
	}
})