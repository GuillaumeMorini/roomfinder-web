$(function() {
    String.prototype.capitalizeFirstLetter = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    var socket = io.connect();

    /*socket.on('messageSpark', function(messages) {
        $('#chatbox').empty();

        for (var message in messages) {
            var file = (messages[message].files != undefined) ? '<a href="' + messages[message].files + '">Fichier à télécharger</a>' : '';
            
            $('#chatbox').append('<div class="media">' +
                '<div class="media-left">' +
                '<img class="media-object img-circle" src="' + messages[message].avatar + '" alt="" width="50" height="50">' +
                '</div>' +
                '<div class="media-body">' +
                '<h5 class="media-heading">' + messages[message].displayName + ' <small>' + messages[message].date + '</small></h5>' +
                '<p>' + messages[message].message.capitalizeFirstLetter() + '</p>' +
                file +
                '</div>' +
                '</div>');
        }

        var height = $('#chatbox')[0].scrollHeight;
        $('#chatbox').scrollTop(height);

        $("#submitMessage").button('reset');
    });*/

    socket.on('alertSpark', function(message) {
        $("#submitAlert").button('reset');

        if (message == 'OK') {
            new Noty({
                text: 'Alerte envoyée',
                layout: 'topRight',
                type: 'success',
                timeout: 3000,
                progressBar: true,
            }).show();
        }
    });

    $('#sendMessage').submit(function(event) {
        var message = $('#inputMessage').val();

        if (message != '') {
            socket.emit('sendMessage', message);

            $('#inputMessage').val('');

            $("#submitMessage").button('loading');
        }

        event.preventDefault();
    });

    $('#sendAlert').submit(function(event) {
        var message = $('#inputAlert').val();

        if (message != '') {
            socket.emit('sendAlert', message);

            $('#inputAlert').val('');

            $("#submitAlert").button('loading');
        }

        event.preventDefault();
    });

    setTimeout(function() {
        window.location.reload(1);
    }, 600000);

    var roomFinderData = '';

    $.getJSON('data/roomfinderData.json', function(data) {
        roomFinderData = data;
        $("#nb_users").append(roomFinderData.infos.users);
        $("#nb_commands").append(roomFinderData.infos.commands);

        createSelectRequest();
        barChart();
        scaleChart();
        bestRooms();
        topTenUsers();
        roomsAvailable();
    });

    $('[data-toggle="datepicker"]').datepicker({
        autoPick: true,
        format: 'yyyy-mm-dd',
        weekStart: 1
    });

    $('#selectRequest').change(function() {
        scaleChart();
    });

    function createSelectRequest() {
        var requests = ['All', 'Dispo', 'Help', 'Dir', 'Find', 'Book', 'Parking', 'Map', 'Inside', 'Add'];

        for (var request in requests) {
            $('#selectRequest').append('<option>' + requests[request] + '</option>');
        }
    }

    function barChart() {
        var details_commands = roomFinderData.infos.details_commands;

        var labelCommand = [];
        var valuesCommand = [];
        var dataChart = [];

        $.each(details_commands, function(command, valueCommand) {
            labelCommand.push(command);
            valuesCommand.push(valueCommand);
        });

        var finalLabelCommand = [];
        var length = labelCommand.length;

        for (var i = 0; i < length; i++) {
            var indexMaxValue = indexOfMax(valuesCommand);
            finalLabelCommand.push(labelCommand[indexMaxValue]);

            dataChart.push([labelCommand[indexMaxValue].capitalizeFirstLetter(), valuesCommand[indexMaxValue]]);

            labelCommand.splice(indexMaxValue, 1);
            valuesCommand.splice(indexMaxValue, 1);
        }

        Highcharts.chart('barChart', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Number Of Uses Of Each Request'
            },
            xAxis: {
                type: 'category',
                labels: {
                    rotation: -45,
                    style: {
                        fontSize: '13px',
                        fontFamily: 'Verdana, sans-serif'
                    }
                }
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Number of uses'
                }
            },
            legend: {
                enabled: false
            },
            tooltip: {
                pointFormat: 'Number of uses: <b>{point.y:.1f} </b>'
            },
            series: [{
                name: 'Requests',
                data: dataChart,
                dataLabels: {
                    enabled: true,
                    color: 'black',
                    align: 'center',
                    format: '{point.y}', // one decimal
                    y: 0, // 10 pixels down from the top
                    style: {
                        fontSize: '13px',
                        fontFamily: 'Verdana, sans-serif'
                    }
                }
            }]
        });

    }

    function scaleChart() {
        var request = $('#selectRequest').val();

        var dataChart = getDataOfEachRequest(request);

        Highcharts.stockChart('scaleChart', {
            title: {
                text: 'Number Of Uses Of A Request At Different Scales'
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Number of requests'
                }
            },
            rangeSelector: {
                buttons: [{
                    type: 'day',
                    count: 1,
                    text: '1d'
                }, {
                    type: 'week',
                    count: 1,
                    text: '1w'
                }, {
                    type: 'month',
                    count: 1,
                    text: '1m'
                }, {
                    type: 'all',
                    text: 'All'
                }],
                selected: 0 // all
            },
            plotOptions: {
                series: {
                    dataGrouping: {
                        approximation: 'sum'
                    }
                }
            },
            series: dataChart
        });
    }

    function indexOfMax(arr) {
        if (arr.length === 0) {
            return -1;
        }

        var max = arr[0];
        var maxIndex = 0;

        for (var i = 1; i < arr.length; i++) {
            if (arr[i] > max) {
                maxIndex = i;
                max = arr[i];
            }
        }

        return maxIndex;
    }

    function bestRooms() {
        var labelsChart = [];
        var dataChart = [];

        var details_rooms = roomFinderData.infos.details_rooms;

        $.each(details_rooms, function(room, valueRoom) {
            labelsChart.push(room);
            dataChart.push(valueRoom);
        });

        var length = dataChart.length;
        var bestRooms = [];

        for (var i = 0; i < length; i++) {
            var indexMaxValue = indexOfMax(dataChart);

            if (i == 0) {
                bestRooms.push({
                    name: labelsChart[indexMaxValue].capitalizeFirstLetter(),
                    y: dataChart[indexMaxValue],
                    sliced: true,
                    selected: true
                });
            }
            else {
                bestRooms.push({
                    name: labelsChart[indexMaxValue].capitalizeFirstLetter(),
                    y: dataChart[indexMaxValue]
                });
            }

            dataChart.splice(indexMaxValue, 1);
            labelsChart.splice(indexMaxValue, 1);

            if (bestRooms.length == 6) {
                break;
            }
        }

        bestRooms.reverse();

        Highcharts.chart('pieChartRoomRequest', {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie'
            },
            title: {
                text: '5 Most Requested Rooms'
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}<br>{point.percentage:.1f} %',
                        style: {
                            color: "black"
                        }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Requested',
                innerSize: '50%',
                data: bestRooms
            }]
        });
    }

    function roomsAvailable() {
        var details_rooms_available = roomFinderData.infos.details_rooms_available;

        var amphis = ['ILM-1-CHAGALL', 'ILM-1-GAUGUIN'];

        var labels = [];
        var percentages = [];
        var values = [];
        var dataChart = [];

        var numberFloors = [];
        var valueFloors = [];

        $.each(details_rooms_available, function(room, valueRoom) {
            var indexAmphis = amphis.indexOf(room);

            var splitRoom = room.split("-");
            var floor = splitRoom[1];
            var indexFloor = numberFloors.indexOf(floor);

            if (indexAmphis == -1) {
                var percentage = Math.round((valueRoom / roomFinderData.infos.rooms_available) * 100);

                labels.push(room);
                percentages.push(percentage);
                values.push(valueRoom);

                if (indexFloor > -1) {
                    valueFloors[indexFloor] += 1;
                }
                else {
                    numberFloors.push(floor);
                    valueFloors.push(1);
                }
            }
        });

        var finalLabel = [];
        var finalPercentage = [];
        var length = 6;

        for (var i = 0; i < length; i++) {
            var indexMaxValue = indexOfMax(percentages);

            var indexMaxFloor = indexOfMax(valueFloors);

            finalLabel.push(labels[indexMaxValue]);
            finalPercentage.push(percentages[indexMaxValue]);

            if (i == 0) {
                $('#topFloor').append(numberFloors[indexMaxFloor]);
            }

            dataChart.push(labels[indexMaxValue].capitalizeFirstLetter());

            percentages.splice(indexMaxValue, 1);
            labels.splice(indexMaxValue, 1);
            values.splice(indexMaxValue, 1);
        }

        for (var j = 0; j < length; j++) {
            $('#details_rooms_available').append("<tr>" +
                "<td>" + finalLabel[j].capitalizeFirstLetter() + "</td>" +
                "</tr>");
        }
    }

    function topTenUsers() {
        var admin = ['gmorini@cisco.com', 'rcronier@cisco.com', 'sarah@ciscofrance.com'];

        var labelsChart = [];
        var dataChart = [];

        var details_users = roomFinderData.infos.details_users;

        $.each(details_users, function(user, valueUser) {
            var indexAdmin = admin.indexOf(user);

            if (indexAdmin == -1) {
                var splitNameUser = user.split('@');
                
                labelsChart.push(splitNameUser[0]);
                dataChart.push(valueUser);
            }
        });

        var length = dataChart.length;
        var bestUsers = [];

        for (var i = 0; i < length; i++) {
            var indexMaxValue = indexOfMax(dataChart);

            if (i == 0) {
                bestUsers.push({
                    name: labelsChart[indexMaxValue].capitalizeFirstLetter(),
                    y: dataChart[indexMaxValue],
                    sliced: true,
                    selected: true
                });
            }
            else {
                bestUsers.push({
                    name: labelsChart[indexMaxValue].capitalizeFirstLetter(),
                    y: dataChart[indexMaxValue]
                });
            }

            dataChart.splice(indexMaxValue, 1);
            labelsChart.splice(indexMaxValue, 1);

            if (bestUsers.length == 11) {
                break;
            }
        }

        bestUsers.reverse();

        Highcharts.chart('pieChartBestUser', {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie'
            },
            title: {
                text: 'Top 10 Users'
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '{point.name}<br>{point.percentage:.1f} %',
                        style: {
                            color: "black"
                        }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Requested',
                innerSize: '50%',
                data: bestUsers
            }]
        });
    }

    String.prototype.capitalizeFirstLetter = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    function getDataOfEachRequest(request) {
        var dispoChart = [];
        var helpChart = [];
        var dirChart = [];
        var findChart = [];
        var bookChart = [];
        var parkingChart = [];
        var mapChart = [];
        var insideChart = [];
        var addChart = [];

        var dataChart = new Array();

        var dates = roomFinderData.dates;

        $.each(dates, function(date, valueDate) {
            $.each(valueDate, function(hour, valueHour) {
                var commands = valueHour.commands;

                var timeStamp = dateToTimestamp(date, hour);

                $.each(commands, function(command, valueCommand) {
                    switch (command) {
                        case 'dispo':
                            dispoChart.push([timeStamp, valueCommand]);
                            break;
                        case 'help':
                            helpChart.push([timeStamp, valueCommand]);
                            break;
                        case 'dir':
                            dirChart.push([timeStamp, valueCommand]);
                            break;
                        case 'find':
                            findChart.push([timeStamp, valueCommand]);
                            break;
                        case 'book':
                            bookChart.push([timeStamp, valueCommand]);
                            break;
                        case 'parking':
                            parkingChart.push([timeStamp, valueCommand]);
                            break;
                        case 'map':
                            mapChart.push([timeStamp, valueCommand]);
                            break;
                        case 'inside':
                            insideChart.push([timeStamp, valueCommand]);
                            break;
                        case 'add':
                            addChart.push([timeStamp, valueCommand]);
                            break;
                    }
                });
            });
        });

        if (request != 'All') {
            switch (request) {
                case 'Dispo':
                    dataChart.push({
                        data: dispoChart,
                        name: "Dispo"
                    });
                    break;
                case 'Help':
                    dataChart.push({
                        data: helpChart,
                        name: "Help"
                    });
                    break;
                case 'Dir':
                    dataChart.push({
                        data: dirChart,
                        name: "Dir"
                    });
                    break;
                case 'Find':
                    dataChart.push({
                        data: findChart,
                        name: "Find"
                    });
                    break;
                case 'Book':
                    dataChart.push({
                        data: bookChart,
                        name: "Book"
                    });
                    break;
                case 'Parking':
                    dataChart.push({
                        data: parkingChart,
                        name: "Parking"
                    });
                    break;
                case 'Map':
                    dataChart.push({
                        data: mapChart,
                        name: "Map"
                    });
                    break;
                case 'Inside':
                    dataChart.push({
                        data: insideChart,
                        name: "Inside"
                    });
                    break;
                case 'Add':
                    dataChart.push({
                        data: addChart,
                        name: "Add"
                    });
                    break;
            }
        }
        else {
            dataChart.push({
                data: dispoChart,
                name: "Dispo"
            });
            dataChart.push({
                data: helpChart,
                name: "Help"
            });
            dataChart.push({
                data: dirChart,
                name: "Dir"
            });
            dataChart.push({
                data: findChart,
                name: "Find"
            });
            dataChart.push({
                data: bookChart,
                name: "Book"
            });
            dataChart.push({
                data: parkingChart,
                name: "Parking"
            });
            dataChart.push({
                data: mapChart,
                name: "Map"
            });
            dataChart.push({
                data: insideChart,
                name: "Inside"
            });
            dataChart.push({
                data: addChart,
                name: "Add"
            });
        }

        return dataChart;
    }
});

function dateToTimestamp(date, hour) {
    var date = new Date(date + ' ' + hour);
    date.setHours(date.getHours() + 2);
    return date.getTime();
}
