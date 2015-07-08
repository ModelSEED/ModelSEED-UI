
/*
 *  UI Tools
 *
 *  Module for various UI helpers
 *
*/

angular.module('uiTools', [])
.service('uiTools', function() {
    var self = this;

    var msecPerMinute = 1000 * 60,
        msecPerHour = msecPerMinute * 60,
        msecPerDay = msecPerHour * 24,
        dayOfWeek = {0: 'Sun', 1: 'Mon', 2:'Tues',3:'Wed',
                     4:'Thurs', 5:'Fri', 6: 'Sat'},
        months = {0: 'Jan', 1: 'Feb', 2: 'March', 3: 'April', 4: 'May',
                  5:'June', 6: 'July', 7: 'Aug', 8: 'Sept', 9: 'Oct',
                  10: 'Nov', 11: 'Dec'};
                  
    this.relativeTime = function(timestamp) {
        var date = new Date()

        var interval =  date.getTime() - timestamp;

        var days = Math.floor(interval / msecPerDay );
        interval = interval - (days * msecPerDay);

        var hours = Math.floor(interval / msecPerHour);
        interval = interval - (hours * msecPerHour);

        var minutes = Math.floor(interval / msecPerMinute);
        interval = interval - (minutes * msecPerMinute);

        var seconds = Math.floor(interval / 1000);

        if (days == 0 && hours == 0 && minutes == 0) {
            return seconds + " secs ago";
        } else if (days == 0 && hours == 0) {
            if (minutes == 1) return "1 min ago";
            return  minutes + " mins ago";
        } else if (days == 0) {
            if (hours == 1) return "1 hour ago";
            return hours + " hours ago"
        } else if (days == 1) {
            var d = new Date(timestamp);
            var t = d.toLocaleTimeString().split(':');
            return 'yesterday at ' + t[0]+':'+t[1]+' '+t[2].split(' ')[1]; //check
        } else if (days < 7) {
            var d = new Date(timestamp);
            var day = dayOfWeek[d.getDay()]
            var t = d.toLocaleTimeString().split(':');
            return day + " at " + t[0]+':'+t[1]+' '+t[2].split(' ')[1]; //check
        } else  {
            var d = new Date(timestamp);
            return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); //check
        }
    }

    // interesting solution from http://stackoverflow.com/questions
    // /15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
    this.readableSize = function(bytes) {
       var units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
       if (bytes == 0) return '0 Bytes';
       var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
       return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + units[i];
    };

    this.trim = function(name, num) {
        if (!name) return;

        if (name.length <= num) return name;
        else return name.slice(0, num)+'...';
    }

});
