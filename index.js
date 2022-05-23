console.log('Starting Netclaw API. Please wait...');

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

var mysql = require('mysql');
var unirest = require('unirest');

var dbUser = "netclaw";
var dbPassword = "N3tcl@w123";
var dbHost = "netclaw-dev-db.mysql.database.azure.com";

var userAuthorised;

var ports = [80, 8080, 443];

// Database connection
var con = mysql.createConnection({
	host: dbHost,
	user: dbUser,
	password: dbPassword,
	database: "netclaw-dev"
});

con.connect(function(err) {
	if (err) {console.log(err)}
	
}); console.log('Successfully connected to db.');

ports.forEach(function(port) {

	// Middleware
	app.use(cors());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());


	///////////// --------- Requests ---------- //////////////

	function makeRequest(command, machine) {

		// Get the machine's node URL
		con.query("SELECT nodeURL, nodePort FROM machines WHERE id = '" + machine + "'", function (err, result, fields) {
			if (err) {console.log(err)}

			var nodeURL = result[0].nodeURL;
			var nodePort = result[0].nodePort;

			// Make the request
			console.log('sending request...');

			var nodeReq = unirest('POST', `http://${nodeURL}:${nodePort}/api`)
			.headers({
			'Content-Type': 'application/json'
			})
			.send(JSON.stringify({
			"command": command
			}))
			.end(function (res) { 
			if (res.error) throw new Error(res.error); 
			console.log(res.raw_body);
			});
		
		});
	}

	///////////// Api Call //////////////

	app.post('/api', function(req, res) {

		command = req.body.command;
		machineID = req.body.machine;
		nickname = req.body.user;
		requestTime = new Date().toLocaleTimeString();

		console.log(`${requestTime} - ${nickname} - ${machineID} - ${command}`);

		try {
			// Check if user is currently in the currentlyplaying table
			con.query(`SELECT * FROM currentlyplaying WHERE machineID = '${machineID}'`, function (err, result) {
				if (err) throw err;
				if (result.length > 0) {
					dbNickname = result[0].userNickname;
					console.log(`${nickname} is currently playing on ${machineID}`);
					if (dbNickname == nickname) {
						console.log('user is authorised');
						userAuthorised = true;
					}
					else {
						console.log('user is not authorised');
						userAuthorised = false;
					}
				}
			});

		} catch (error) {
			res.json({ code: "Error 99A" });
		}

		if (userAuthorised == true) {
			// Send the request
			makeRequest(command, machineID);
			res.json({ code: "Success" });
		}
		else if (userAuthorised == false) {
			res.json({ code: "Unauthorised" });
		}
		else {
			res.json({ code: "Error 111A" });
		}

	});
		


	app.get('/', function(req, res) {
		res.send("Hello, World!");
	});

	app.get('/api/ping', function(req, res) {
		res.send("pong!");
	});

	app.post('/api/check', function(req, res) {
		console.log('API Checked! sending back 400.');
		res.status(400);
	});

	app.listen(port);

	console.log(`Everything is OK. API is up and listening on port 80 and 8080.`);

});