const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const cors = require('cors');
const got = require('got');
const Bottleneck = require("bottleneck");
var mysql = require('mysql');
var userIsAuthorised;
const dbPassword = process.env['dbPassword']
const dbUser = process.env['dbUser']
const dbHost = process.env['dbHost']

var goUsers = [];

// SQL Connection & Error check
var con = mysql.createConnection({
	host: dbHost,
	user: dbUser,
	password: dbPassword,
	database: "NetClaw"
});

con.connect(function(err) {
	if (err) throw err;
});

function makeRequest(fullNodeURL, command) {
	// Make the web reqest to the node
	got.get(`${fullNodeURL}:8888/${command}`, { responseType: 'text' })
		.then(res => {
			console.log(`Request Sent! Response from server:`);
		})
		.catch(err => {
			//console.log('Error: ', err.message);
		});
}

function moveClaw(nodeURL, direction) {
	// On a joystick / keyb button press, move the claw
	const limiter = new Bottleneck({
		minTime: 1000,
		reservoir: 3,
		strategy: Bottleneck.strategy.OVERFLOW // When the function is spammed for whatever reason, only 5 requests are executed per 200ms.
	}); // Limit requests to once every 200ms
	limiter.schedule(() => makeRequest(nodeURL, direction))
		.then((result) => {
		});

}
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// API calls 
app.post('/api', function(req, res) {

	//function apiAsync() {
	reqMove = req.body.direction;
	reqMachineID = req.body.machineID;
	reqUsername = req.body.userID;
	reqTime = new Date().toLocaleTimeString();

	console.log("API Incoming =>", "command -", reqMove, "machine -", reqMachineID, "user_username -", reqUsername, ` @ ${reqTime}`);

	con.query('SELECT `requestURL` FROM `machinestats` WHERE `id` = ' + reqMachineID, function(err, result) {
		if (err) throw err;
		if (result) {
			console.log('Machine url = ' + (result[0].requestURL));
			machineNodeURL = result[0].requestURL;
		}
		else {
			// Machine
			res.json({ code: "Error" });
		}

	});

	con.query('SELECT * FROM `newqueue` WHERE `playing` = 1 AND `uuid` = ' + reqUsername, function(err, result) {
		if (err) throw err;
		if (result.length > 0) {
			//console.log('Player is authorised');
			userIsAuthorised = true;
			checkUserAuth();
		}
		else if (result.length == 0) {
			//console.log('Player is not authorised');
			userIsAuthorised = false;
		}
		else {
		}

	});

	function checkUserAuth() {

		if (reqMove == "goReset" && goUsers[goUsers.length - 1] == reqUsername) {
			// Reset the user's go
			goUsers.push('reset');
			console.log(goUsers);
		}
		else {
			// Any other command
		}

		if (reqMove == "go" && goUsers[goUsers.length - 1] == reqUsername) {
			console.log('User already pressed go');
			userIsAuthorised = false;
			console.log(goUsers);
		}
		else if (reqMove == "go") {
			console.log("'go' authorised");
			console.log(goUsers);
			goUsers.push(reqUsername);
			console.log(goUsers);
		}
		else {
			// any other command
		}

		if (userIsAuthorised == true) {
			// Send the request to the machine!
			moveClaw(machineNodeURL, reqMove);
			res.json({ code: "Success" });
		}
		else if (userIsAuthorised == false) {
			res.json({ code: "Unauthorised" });
		}
		else {
			res.json({ code: "Error" });
		}
	}

});

app.get('/api/ping', function(req, res) {
	res.send("pong!");
});

app.post('/apiCheck', function(req, res) {
	console.log('API Checked! sending back 400.');
	res.status(400);
});

app.listen(80);