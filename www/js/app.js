var tinker = angular.module('tinker', ['pouchDB'])
var remote = 'https://lvertedeeperedindewinger:9b259f919a413189f79794d9b5f0f3986f90d980@penser.cloudant.com/games'

getTypeahead = function(input) {
	var output = input
	.toLowerCase()
	.trim()

	output = output + ' '
	output = output

	// 'in' default
	.replace(/^(?:i|in(?:\s(0)*1)*)\s$/, 'in 1 month')
	.replace(/^in\s(0*[1-9]{1})\s*m\s$/, 'in $1 months')
	.replace(/^in\s([0-9]{1})\s$/, 'in $1 months')
	.replace(/^in\s([0-9]{2})\s$/, 'in $1 weeks')
	.replace(/^in\s([0-9]{3})\s$/, 'in $1 days')
	.replace(/^in\s([0-9]{4})\s$/, 'in $1 hours')
	.replace(/^in\s([0-9]{5})\s$/, 'in $1 minutes')

	// number default
	.replace(/^(?:1)\s$/, 'in 1 month')
	.replace(/^(0*[1-9]{1}\s*)m\s$/, 'in $1months')
	.replace(/^([0-9]{1})\s$/, 'in $1 months')
	.replace(/^([0-9]{2})\s$/, 'in $1 weeks')
	.replace(/^([0-9]{3})\s$/, 'in $1 days')

	// time measurements
	.replace(/^(in\s)*([0-9]+\s*)(?:hr|hrs|h|ho|hou)\s/, '$1$2hours')
	.replace(/^(in\s)*([0-9]+\s*)(?:mi|min|mins|minu|minut)\s/, '$1$2minutes')
	.replace(/^(in\s)*([0-9]+\s*)(?:s|se|sec|secs|seco|secon)\s/, '$1$2seconds')
	.replace(/^(in\s)*([0-9]+\s*)(?:d|da)\s/, '$1$2days')
	.replace(/^(in\s)*([0-9]+\s*)(?:w|we|wee)\s/, '$1$2weeks')
	.replace(/^(in\s)*([0-9]+\s*)(?:m|mo|mon|mont)\s/, '$1$2months')
	.replace(/^(in\s)*([0-9]+\s*)(?:y|yr|yrs|ye|yea)\s/, '$1$2years')

	// next
	.replace(/^(?:ne|nex)\s$/, 'next')

	// next what
	.replace(/(next\s)(?:w|we|wee)\s/, '$1week')
	.replace(/(next\s)(?:mont)\s/, '$1month')
	.replace(/(next\s)(?:y|yr|yrs|ye|yea)\s/, '$1year')

	// next default
	.replace(/^next\s*$/, 'next week')

	// relative days
	.replace(/^(?:t|to|tod|toda)\s$/, 'today')
	.replace(/^(?:t|to|ton|toni|tonig|tonigh)\s$/, 'tonight')
	.replace(/^(?:tom|tomo|tomor|tomorr|tomorro)\s$/, 'tomorrow')
	.replace(/^(?:y|ye|yes|yest|yeste|yester|yesterd|yesterda)\s$/, 'yesterday')

	// weekdays
	.replace(/^(next\s)*(?:s|su|sun|sund|sunda)\s$/, '$1sunday')
	.replace(/^(next\s)*(?:m|mo|mon|mond|monda)\s$/, '$1monday')
	.replace(/^(next\s)*(?:t|tu|tue|tues|tuesd|tuesda)\s$/, '$1tuesday')
	.replace(/^(next\s)*(?:w|we|wed|wedn|wedne|wednes|wednesd|wednesda|wedns|wednsd|wednsda|wednsday)\s$/, '$1wednesday')
	.replace(/^(next\s)*(?:th|thu|thur|thurs|thursd|thursda)\s$/, '$1thursday')
	.replace(/^(next\s)*(?:f|fr|fri|frid|frida)\s$/, '$1friday')
	.replace(/^(next\s)*(?:sa|sat|satu|satur|saturd|saturda)\s$/, '$1saturday')

	// months names
	.replace(/^(?:j|ja|jan|janu|janua|januar)\s$/, 'january')
	.replace(/^(?:f|fe|feb|febr|febru|februa|februar)\s$/, 'february')
	.replace(/^(?:m|ma|mar|marc)\s$/, 'march')
	.replace(/^(?:a|ap|apr|apri)\s$/, 'april')
	.replace(/^(?:ju|jun)\s$/, 'june')
	.replace(/^(?:jul)\s$/, 'july')
	.replace(/^(?:a|au|aug|augu|augus)\s$/, 'august')
	.replace(/^(?:se|sep|sept|septe|septem|septemb|septembe)\s$/, 'september')
	.replace(/^(?:o|oc|oct|octo|octob|octobe)\s$/, 'october')
	.replace(/^(?:n|no|nov|nove|novem|novemb|novembe)\s$/, 'november')
	.replace(/^(?:d|de|dec|dece|decem|decemb|decembe)\s$/, 'december')

	// month space
	.replace(/^(january|february|march|april|may|june|july|august|september|november|december)\s$/, '$1 01')

	// year
	.replace(/\s(201)\s$/, ' 2017')
	.replace(/\s(202)\s$/, ' 2020')

	// relative day space
	.replace(/^(today)\s(?:a|at)\s$/, '$1 at 12 am')
	.replace(/^(today|tomorrow)\s(?:a|at)\s$/, '$1 at 7 pm')
	.replace(/^(today|tomorrow)\s(?:a|at)\s([0-9])\s$/, '$1 at $2 pm')

	// characterizing words
	.replace(/\s(?:at)\s([0-9]+)\s$/, ' at $1 am')
	.replace(/\s(?:at)\s([0-9]+)(?:\s*a)\s*$/, ' at $1 am')
	.replace(/\s(?:at)\s([0-9]+)(?:\s*p)\s*$/, ' at $1 pm')
	.replace(/\s(?:a|at)\s$/, ' at 7 am')
	.replace(/\s(?:f|fr|fro|from|from |from n|from no)\s$/, ' from now')
	.replace(/\s(?:ag)\s$/, ' ago')

	// day times
	.replace(/\s(?:m|mo|mor|morn|morni|mornin)\s$/, ' morning')
	.replace(/\s(?:n|no|noo)\s$/, ' noon')
	.replace(/\s(?:a|af|aft|afte|after|aftern|afterno|afternoo)\s$/, ' afternoon')
	.replace(/\s(?:e|ev|eve|even|eveni|evenin)\s$/, ' evening')
	.replace(/\s(?:n|ni|nig|nigh)\s$/, ' night')

	// handle singular
	.replace(/(0*1)([\sa-z]+)s$/, '$1$2')

	// more fixes
	.trim()
	.toLowerCase()

	return output
}

fixTimeInput = function(input) {
	var typeahead = getTypeahead(input)

	fixed = typeahead
	.replace(/morning/, '7 am')
	.replace(/noon/, '12 pm')
	.replace(/afternoon/, '4 pm')
	.replace(/evening/, '6 pm')
	.replace(/tonight/, 'today at 9 pm')
	.replace(/night/, '9 pm')

	return {
		fixed: fixed,
		typeahead: typeahead
	}
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
	fixed = fixTimeInput(input),
	parsed = parseTime(input)

	if (fixed.fixed == '') {
		return {
			error: 'when does it end?',
			success: false
		}
	}

	if (!parsed) {

		return {
			error: info,
			success: false
		}
	} else {

		var range = isValidRange(fixed.fixed, parentEnd)

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

			if (range == 'soon') {

				return {
					error: 'time is too soon',
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

		var typeahead

		if (fixed.typeahead.indexOf(input.toLowerCase()) > -1) {

			typeahead = fixed.typeahead
			.substr(
				fixed.typeahead.indexOf(input.toLowerCase()) + input.length
			)
		} else {
			typeahead = ''
		}

		if (typeahead == '') {

			if (/in [0-9]+$/.test(input)) {
				var parsedInt = parseInt(input.replace('in ', ''))

				if (!isNaN(parsedInt) && parsedInt == 1) {
					typeahead = ' month'
				} else {
					typeahead = ' months'
				}
			}
		}

		return {
			error: false,
			success: Date.create(parsed).relative(),
			typeahead: typeahead
		}
	}
}

parseTime = function(input) {

	input = fixTimeInput(input).fixed

	if (Date.create(input) == 'Invalid Date') {
		input = input + ' from now'
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

	if (time.isBefore(Date.create().addMinutes(5))) {
		return 'soon'
	}

	return true
}

randomChars = function() {
  return Math.random().toString(36).substr(2, 5)
}

generateId = function() {
	return Date.create() + '-' + randomChars()
}

PouchDB.sync('games', remote, {
	live: true,
	retry: true
})
