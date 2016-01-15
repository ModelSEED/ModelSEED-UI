/*
 * jobs.js
 * Angular.js module for dealing with job state
 *
 * Authors:
 * 		https://github.com/nconrad
 *
*/

angular.module('Jobs', [])
.service('Jobs', ['MS', '$rootScope', '$timeout',
function(MS, $rootScope, $timeout) {
    var self = this;

    this.jobs = null;

    var queuedJobs = [],
        runningJobs = [],
        completedJobs = [];

    var period = 4000;  // time to wait after response

    var polling = false; // decide when to poll (not used yet)
    var poller;         // poll handle

    this.getStatus = function() {
        return {
            allJobs: self.jobs,
            queuedCount: queuedJobs.length,
            runningCount: runningJobs.length,
            completedCount: completedJobs.length
        }
    }

    this.isPolling = function() {
        return polling;
    }

    // not used yet
    this.startPolling = function() {
        polling = true;
        poll();
    }

    // not used yet
    this.stopPolling = function() {
        polling = false;
        $timeout.cancel(poller);
    }

    // this starts polling
    function poll() {
        return MS.listMyJobs().then(function(jobs) {
            groupJobs(jobs);
            $rootScope.$broadcast('Event.JobUpdate');
            $timeout(poll, period);
            return status;
        })
    }

    function groupJobs(jobs) {
        self.jobs = null;

        queuedJobs = [],
        runningJobs = [],
        completedJobs = [];

        for (var i=0; i<jobs.length; i++) {
            var job = jobs[i];

            if (job.status === 'queued')
                queuedJobs.push(job);
            else if (job.status === 'in-progress')
                runningJobs.push(job);
            else if (job.status === 'completed')
                completedJobs.push(job);
        }
        self.jobs = jobs;
    }


    // background polling on start of application
    poll();
}]);


// Todo: optimize polling
// if queued or running jobs, keep polling those
// otherwise, quit
//var status = self.getStatus();
//if ( (status.queuedCount || status.runningCount) && polling) {
//    poller = $timeout(reload, 5000)
//} else {
//    $timeout.cancel(poller)
//}
