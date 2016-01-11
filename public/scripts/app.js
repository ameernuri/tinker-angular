var tinker = angular.module('tinker', ['pouchDB'])
.filter('sugar', function() {
	return function(input, format) {
		format = format || 'dd MM YYYY'
		return $filter('date')(Date.create(input), format)
	}
})
.filter('isPast', function() {
	return function(input) {
		return $filter('date')(Date.create().isAfter(Date.create(input)))
	}
})

var remote1 = 'http://localhost:5984/games',
remote2 = 'http://pener:cloudant@penser.cloudant.com/games'

log = function(log) {
	console.log(log)
}

err = function(err) {
	console.error(err)
}

fixTimeInput = function(input) {

	output = input + ' '
	output = output.replace(/([\s0-9])hr[ s]/, '$1 hour')
	.replace(/([\s0-9])h /, '$1 hour')
	.replace(/([\s0-9])min[ s]/, '$1 minute')
	.replace(/([\s0-9])m /, '$1 minute')
	.replace(/([\s0-9])sec[ s]/, '$1 second')
	.replace(/([\s0-9])s /, '$1 second')
	.replace(/([\s0-9])d /, '$1 day')
	.replace(/([\s0-9])w /, '$1 week')
	.replace(/([\s0-9])mo /, '$1 month')
	.replace(/([\s0-9])y /, '$1 year')
	.replace(/([\s0-9])yr[ s]/, '$1 year')
	.trim()
	.toLowerCase()

	return output
}

validateTime = function(input, parentEnd, validateRange) {

	if (parentEnd == undefined) {
		parentEnd = false
	}

	if (validateRange == undefined) {
		validateRange = true
	}

	var invalid = 'Invalid Date',
	info = 'time not parsed',
	error = false,
	success = false,
	input = fixTimeInput(input),
	parsed = parseTime(input)

	if (input == '') {
		return {
			error: 'enter end time',
			success: false
		}
	}

	if (Date.create(input) == 'Invalid Date') {
		input = 'in ' + input
		parsed = parseTime(input)
	}

	if (!parsed) {

		return {
			error: info,
			success: false
		}
	} else {

		var range = isValidRange(input, parentEnd)

		if (range == 'afterParent') {

			return {
				error: 'time has to be before parent\'s end time (~' + Date.create(parentEnd).relative() + ')',
				success: false
			}
		}

		if (range == 'farPast') {
			return {
				error: 'time can\'t be in the past',
				success: false
			}
		}

		if (range == 'farFuture') {
			return {
				error: 'time is too far in the future',
				success: false
			}
		}

		if (validateRange) {

			if (range == 'now') {

				return {
					error: 'time needs to be in the future',
					success: false
				}
			}

			if (range == 'past') {

				return {
					error: 'time can\'t be in the past',
					success: false
				}
			}
		}

		return {
			error: false,
			success: Date.create(parsed).relative()
		}
	}
}

parseTime = function(input) {

	input = fixTimeInput(input)

	if (Date.create(input) == 'Invalid Date') {
		input = 'in ' + input
	}

	var parsed = Date.future(input)

	if (
		parsed.getHours() == 0
		&& parsed.getHours() == 0
		&& parsed.getHours() == 0
	) {
		parsed = Date.future(input).endOfDay()
	}

	if (parsed == 'Invalid Date') {
		return false
	}

	return parsed
}

isValidRange = function(input, parentEnd) {

	if (parentEnd == undefined) {
		parentEnd = false
	}

	var time = Date.future(input)

	if (
		time.getHours() == 0
		&& time.getHours() == 0
		&& time.getHours() == 0
	) {
		time = Date.future(input).endOfDay()
	}

	if (parentEnd != false && time.isAfter(Date.create(parentEnd))) {

		return 'afterParent'
	}

	if (time.isBefore(Date.create().addMonths(-6))) {
		return 'farPast'
	}

	if (time.isPast()) {
		return 'past'
	}

	if (time.isAfter(Date.create().addYears(30))) {
		return 'farFuture'
	}

	if (time.isBefore(Date.create().addSeconds(60))) {
		return 'now'
	}

	return true
}

randomChars = function() {
  return Math.random().toString(36).substr(2, 5)
}

generateId = function() {
	return Date.create() + '-' + randomChars()
}

PouchDB.sync('games', remote1, {
	live: true,
	retry: true
})

// PouchDB.sync('games', remote2, {
// 	live: true,
// 	retry: true
// })

tinker.run(function($pouchdb) {
  $pouchdb.setDatabase("games")
})
