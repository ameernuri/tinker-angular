var express = require('express');
var app = express();

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
	res.render('app.html');
});

var server = app.listen('3000', function() {
	console.log('Listening on port 3000')
});
