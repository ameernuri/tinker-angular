var express = require('express')
var app = express()

app.engine('html', require('ejs').renderFile)
app.set('view engine', 'ejs')
app.use(express.static('public'))

var lessMiddleware = require('less-middleware')

app.use(lessMiddleware(__dirname + '/public'))
app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res) {
	res.render('index.html')
})

var port = 1234
var server = app.listen(process.env.PORT || port, function() {
	console.log('Listening on port ' + port)
})
