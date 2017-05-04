var config = require('./config/config.json');
var express = require("express");
var request = require("request");
var cheerio = require('cheerio');
var schedule = require('node-schedule');
var lineByLineReader = require('line-by-line');
var fs = require('fs');
var http = require('http');
var ciscospark = require('ciscospark');
var moment = require('moment');
var app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

var server = http.createServer(app);

var io = require('socket.io').listen(server);

var roomIDRoomfinder = config.roomAdminID;
var botIdRoomfinder = config.roomBotID;

io.sockets.on('connection', function(socket) {
    /*setInterval(function() {
        getMessagesRoomSpark(socket);
    }, 20000);*/

    /*socket.on('sendMessage', function(message) {
        ciscospark.messages.create({
                text: message,
                roomId: roomIDRoomfinder
            })
            .then(function() {
                getMessagesRoomSpark(socket);
            });
    });*/

    socket.on('sendAlert', function(message) {
        ciscospark.messages.create({
                text: message,
                roomId: roomIDRoomfinder
            })
            .then(function() {
                socket.emit('alertSpark', 'OK');
            });
    });
});

server.listen('8080');
console.log("Running at Port 8080");

schedule.scheduleJob('00 * * * *', function() {
    console.log('script running');
    runScriptUpdatingLogs();
});

runScriptUpdatingLogs();

/*function getMessagesRoomSpark(socket) {
    var messagesSpark = new Array();
    var compteur = 0;

    ciscospark.messages.list({
            roomId: roomIDRoomfinder
        })
        .then(function(messages) {
            for (var i = 0; i < messages.items.length; ++i) {
                (function(i) {
                    ciscospark.people.get(messages.items[i].personId).then(function(user) {
                        var dateMessage = moment(messages.items[i].created);
                        dateMessage = dateConverter(dateMessage) + ' ' + timeConverter(dateMessage);

                        messagesSpark[i] = {
                            'displayName': user.displayName,
                            'avatar': user.avatar,
                            'message': messages.items[i].text,
                            'files': messages.items[i].files,
                            'date': dateMessage
                        };

                        if (compteur == (messages.items.length - 1)) {
                            messagesSpark.reverse();
                            socket.emit('messageSpark', messagesSpark);
                            socket.broadcast.emit('messageSpark', messagesSpark);
                        }
                        else {
                            ++compteur;
                        }
                    });
                })(i);
            }
        });
}*/

function runScriptUpdatingLogs() {
    var r = request.get('http://www.guismo.fr.eu.org/roomfinder-logs/', {
        'auth': {
            'user': 'roomfinder',
            'pass': 'logquery',
            'sendImmediately': false
        }
    });

    r.on('response', function(res) {
        var body = '';
        
        r.on('data', function(chunk) {
            body += chunk;
        });
        
        r.on('end', function() {
            var $ = cheerio.load(body);
            var links = $('a'); //jquery get all hyperlinks
            var total = links.length;
            var compteur = 1;

            if (links.length == 0) {
                console.log('Il y a un problème avec le site hébergeant les logs');
                return;
            }

            $(links).each(function(i, link) {
                if ($(link).attr('href') != '../') {

                    var r2 = request.get('http://www.guismo.fr.eu.org/roomfinder-logs/' + $(link).attr('href'), {
                        'auth': {
                            'user': 'roomfinder',
                            'pass': 'logquery',
                            'sendImmediately': false
                        }
                    });

                    r2.on('response', function(res) {
                        res.pipe(fs.createWriteStream('logs/' + decodeURIComponent($(link).attr('href'))));

                        if (compteur === total - 1) {
                            parseRoomfinderLogs();
                        }
                        else {
                            ++compteur;
                        }
                    });

                    r2.on('error', function(err) {
                        console.log('error 2 : ' + err);
                    });
                }
            });
        });
    });

    r.on('error', function(err) {
        console.log('error 1 : ' + err);
    });
}


function parseRoomfinderLogs() {
    var roomFinderJSON = '';

    fs.readFile('public/data/roomfinderData.json', 'utf8', function(err, data) {
        if (err) {
            return console.log(err);
        }

        roomFinderJSON = JSON.parse(data);
        var dates = roomFinderJSON.dates;

        var nbDates = Object.keys(dates).length;

        var compteur = 1;

        var stringLastDate = '';
        var lastDate = '';

        for (var date in dates) {
            if (compteur === nbDates) {
                stringLastDate = date;
                lastDate = dates[stringLastDate];
            }
            else {
                ++compteur;
            }
        }

        for (var hour in lastDate) {
            roomFinderJSON.infos.commands -= lastDate[hour].commands.dispo;

            roomFinderJSON.infos.commands -= lastDate[hour].commands.help;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.dir;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.inside;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.map;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.book;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.find;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.parking;
            roomFinderJSON.infos.commands -= lastDate[hour].commands.add;

            roomFinderJSON.infos.details_commands.dispo -= lastDate[hour].commands.dispo;
            roomFinderJSON.infos.details_commands.help -= lastDate[hour].commands.help;
            roomFinderJSON.infos.details_commands.dir -= lastDate[hour].commands.dir;
            roomFinderJSON.infos.details_commands.inside -= lastDate[hour].commands.inside;
            roomFinderJSON.infos.details_commands.map -= lastDate[hour].commands.map;
            roomFinderJSON.infos.details_commands.book -= lastDate[hour].commands.book;
            roomFinderJSON.infos.details_commands.find -= lastDate[hour].commands.find;
            roomFinderJSON.infos.details_commands.parking -= lastDate[hour].commands.parking;
            roomFinderJSON.infos.details_commands.add -= lastDate[hour].commands.add;

            for (var user in lastDate[hour].users) {
                roomFinderJSON.infos.details_users[user] -= lastDate[hour].users[user];
            }

            for (var room in lastDate[hour].rooms) {
                roomFinderJSON.infos.details_rooms[room] -= lastDate[hour].rooms[room];
            }

            for (var room in lastDate[hour].rooms_available) {
                roomFinderJSON.infos.details_rooms_available[room] -= lastDate[hour].rooms_available[room];
            }
        }

        roomFinderJSON.dates[stringLastDate] = undefined;

        /* compteur = 1;
          var stringLastTime = '';
          var nbHours = Object.keys(lastDate).length;

          for (var hour in lastDate) {
              if (compteur === nbHours) {
                  stringLastTime = date + ' ' + hour;
              }
              else {
                  ++compteur;
              }
          }*/

        fs.readdir('logs', function(err, filenames) {
            if (err) {
                console.log(err);
                return;
            }

            var cpt = 0;
            var dataUpdated = false;
            var commandDispoExecuted = false;
            var lastDate = '';
            var lastHour = '';

            for (var i = 0; i < filenames.length; ++i) {
                (function(i) {
                    var filename = filenames[i];

                    var lineReader = new lineByLineReader('logs/' + filename);

                    lineReader.on('error', function(err) {
                        console.log(err);
                        return;
                    });

                    lineReader.on('line', function(line) {
                        var stringLine = line.split(" ");

                        // stringLine[0] -> date
                        // stringLine[2] -> command

                        var currentDate = moment(stringLine[0], "YYYY-MM-DDTHH:mm:ss");
                        currentDate.add(1, 'h');
                        currentDate.startOf('hour');

                        if (currentDate.isValid()) {
                            var lastDateJSON = moment(stringLastDate, "YYYY-MM-DD HH:mm");

                            var isWorking = false;

                            var isCurrentDateGreater = currentDate > lastDateJSON;

                            if ((stringLastDate == '') || isCurrentDateGreater) {
                                isWorking = true;
                            }

                            if (isWorking) {
                                var splitFilename = filename.split(' ');
                                var splitFilenameUser = splitFilename[0];

                                var stringCurrentDate = dateConverter(currentDate);
                                var stringCurrentHour = timeConverter(currentDate);

                                var command = stringLine[2];
                                var commands = ['dispo', 'available', 'book', 'reserve', 'map', 'plan', 'inside', 'in', 'find', 'cherche', 'dir', 'parking', 'add', 'help', 'aide', '?'];

                                if (commands.indexOf(command) > -1) {
                                    switch (command) {
                                        case 'available':
                                            command = 'dispo';
                                            break;
                                        case 'reserve':
                                            command = 'book';
                                            break;
                                        case 'plan':
                                            command = 'map';
                                            break;
                                        case 'in':
                                            command = 'inside';
                                            break;
                                        case 'cherche':
                                            command = 'find';
                                            break;
                                        case 'aide':
                                            command = 'help';
                                            break;
                                        case '?':
                                            command = 'help';
                                            break;
                                    }

                                    dataUpdated = true;
                                    initializeCurrentDate(roomFinderJSON, stringCurrentDate, stringCurrentHour);

                                    pushDatesInRoomFinderJSON(roomFinderJSON, stringCurrentDate, stringCurrentHour, 'commands', command);
                                    pushInfosInRoomFinderJSON(roomFinderJSON, 'commands');
                                    pushInfosInRoomFinderJSON(roomFinderJSON, 'details_commands', command);

                                    pushDatesInRoomFinderJSON(roomFinderJSON, stringCurrentDate, stringCurrentHour, 'users', splitFilenameUser.toLowerCase());
                                    pushInfosInRoomFinderJSON(roomFinderJSON, 'details_users', splitFilenameUser.toLowerCase());

                                    if (command == 'book') {
                                        var room = stringLine[3];

                                        if (room.match(/[A-Z0-9]+-[0-9]-[A-Z]+/g)) {
                                            room = room.toUpperCase();
                                            pushDatesInRoomFinderJSON(roomFinderJSON, stringCurrentDate, stringCurrentHour, 'rooms', room);
                                            pushInfosInRoomFinderJSON(roomFinderJSON, 'details_rooms', room);
                                        }
                                    }
                                    else if (command == 'dispo') {
                                        commandDispoExecuted = true;
                                        lastDate = stringCurrentDate;
                                        lastHour = stringCurrentHour
                                    }
                                }
                            }
                        }
                        else if (commandDispoExecuted) {
                            var room = stringLine[1];
                            if (room != undefined) {
                                if (room.match(/[A-Z0-9]+-[0-9]-[A-Z]+/g)) {
                                    room = room.toUpperCase();

                                    pushDatesInRoomFinderJSON(roomFinderJSON, lastDate, lastHour, 'rooms_available', room);
                                    pushInfosInRoomFinderJSON(roomFinderJSON, 'details_rooms_available', room);
                                }
                            }
                            else {
                                commandDispoExecuted = false;
                            }
                        }
                    });

                    lineReader.on('end', function() {
                        if (cpt == filenames.length - 1) {
                            /*if (!dataUpdated) {
                                var date = moment();
                                date.add(2, 'h');
                                date.startOf('hour');

                                var stringDate = dateConverter(date);
                                var stringHour = timeConverter(date);

                                initializeCurrentDate(roomFinderJSON, stringDate, stringHour);
                            }*/
                            sortRoomFinderJSON(roomFinderJSON);
                        }
                        else {
                            cpt++;
                        }
                    });
                })(i);
            }
        });
    });
}

function saveRoomFinderJSON(roomFinderJSON) {
    roomFinderJSON = JSON.stringify(roomFinderJSON);

    fs.writeFile('public/data/roomfinderData.json', roomFinderJSON, 'utf8', function(err) {
        if (err) {
            console.log('error : ' + err);
            return;
        }

        console.log('File saved : ' + new Date());
    });
}

function sortRoomFinderJSON(roomFinderJSON) {
    var dates = roomFinderJSON.dates;
    var tabDates = new Array();

    for (var date in dates) {
        tabDates.push([date, dates[date]]);
    }

    tabDates.sort(function(a, b) {
        return new Date(a[0]) - new Date(b[0]);
    });

    var newDates = {};

    for (var i = 0; i < tabDates.length; ++i) {
        newDates[tabDates[i][0]] = tabDates[i][1];
    }

    roomFinderJSON.dates = newDates;

    saveRoomFinderJSON(roomFinderJSON);
}

function pushDatesInRoomFinderJSON(roomFinderJSON, stringCurrentDate, stringCurrentHour, nameParameter, nameValue) {
    if (roomFinderJSON['dates'][stringCurrentDate] != undefined) {
        if (roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour] != undefined) {
            if (roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter] != undefined) {
                if (roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] != undefined) {
                    roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] += 1;
                }
                else {
                    roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = 1;
                }
            }
            else {
                roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter] = {};
                roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = 1;
            }
        }
        else {
            roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour] = {};
            roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter] = {};
            roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = {};
            roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = 1;
        }
    }
    else {
        roomFinderJSON['dates'][stringCurrentDate] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour][nameParameter][nameValue] = 1;
    }
}

function pushInfosInRoomFinderJSON(roomFinderJSON, nameFunction, nameValue) {
    if (nameValue != undefined) {
        if (roomFinderJSON['infos'][nameFunction][nameValue] != undefined) {
            roomFinderJSON['infos'][nameFunction][nameValue] += 1;
        }
        else {
            switch (nameFunction) {
                case 'details_rooms':
                    roomFinderJSON['infos']['rooms'] += 1;
                    break;
                case 'details_users':
                    roomFinderJSON['infos']['users'] += 1;
                    break;
                case 'details_rooms_available':
                    roomFinderJSON['infos']['rooms_available'] += 1;
                    break;
            }

            roomFinderJSON['infos'][nameFunction][nameValue] = 1;
        }
    }
    else {
        roomFinderJSON['infos'][nameFunction] += 1;
    }
}

function initializeCurrentDate(roomFinderJSON, stringCurrentDate, stringCurrentHour) {
    if (roomFinderJSON['dates'][stringCurrentDate] != undefined) {
        if (roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour] != undefined) {
            return;
        }
    }

    if (roomFinderJSON['dates'][stringCurrentDate] == undefined) {
        roomFinderJSON['dates'][stringCurrentDate] = {};
    }

    for (var i = 0; i <= 23; i++) {
        stringCurrentHour = addZero(i) + ":00";

        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['users'] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['rooms'] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['rooms_available'] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands'] = {};
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['dispo'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['book'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['map'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['inside'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['find'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['dir'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['parking'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['add'] = 0;
        roomFinderJSON['dates'][stringCurrentDate][stringCurrentHour]['commands']['help'] = 0;
    }
}

function dateConverter(date) {
    return date.format("YYYY-MM-DD");
}

function timeConverter(date) {
    return date.format("HH:mm");
}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}
