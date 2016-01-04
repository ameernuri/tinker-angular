var tinker = angular.module('tinker', ['pouchDB'])

var remote1 = 'http://localhost:5984/games',
remote2 = 'http://localhost:5984/games'

log = function(log) {
	console.log(log)
}

err = function(err) {
	console.error(err)
}

parseTime = function(input) {
	log('parseTime: ' + input)

	var parsed = Date.future(input).relative()

	if (parsed == 'Invalid Date') {
		return false
	}

	return parsed
}

isValidTime = function(input) {
	log('isValidTime: ' + input)

	var time = Date.future(input)

	if (time.isPast()) {
		return 'past'
	}

	if (time.isAfter(Date.create().addYears(30))) {
		return 'far'
	}

	return true
}

randomChars = function() {
  return Math.random().toString(36).substr(2, 5)
}

generateId = function() {
	return new Date().toISOString() + '-' + randomChars()
}

PouchDB.sync('games', remote1, {
	live: true,
	retry: true
})

PouchDB.sync('games', remote2, {
	live: true,
	retry: true
})

tinker.run(function($pouchdb) {
  $pouchdb.setDatabase("games")
})
