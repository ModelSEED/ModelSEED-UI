/*
 * jobs.js
 * Angular.js module for dealing with job state
 *
 * Authors:
 * 		https://github.com/nconrad
 *
*/

angular.module('Jobs', [])
.service('Jobs', ['$http', '$rootScope', '$timeout', 'Dialogs',
function($http, $rootScope, $timeout, Dialogs) {
    var self = this;

    this.jobs = null;
    this.jobsHash = null;

    var queuedJobs = [],
        runningJobs = [],
        completedJobs = [],
        activeIds = [];     // activeIds are queued or running job ids

    var period = 4000;      // time to wait after response

    var polling = false;    // decide when to poll (not used yet)
    var poller;             // poll handle


    this.getStatus = function() {
        return {
            allJobs: self.jobs,
            queuedCount: queuedJobs.length,
            runningCount: runningJobs.length,
            completedCount: completedJobs.length
        }
    }

    this.getActiveCount = function() {
        return activeIDs.length;
    }

    // method to add job id to list of active Jobs
    // eliminates race conditions
    this.markJobAsActive = function(jobId) {
        if ( activeIds.indexOf(jobID) !== -1) {
            activeIds.push(jobId);
            return true;
        }
        return false;
    }

    this.getActiveJobIds = function() {
        var activeJobs = queuedJobs.concat(runningJobs);

        var jobIds = [];
        for (var i=0; i<activeJobs.length; i++) {
            jobIds.push(activeJobs[i].id);
        }
        return jobIds;
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

    // this function kicks off polling
    function poll() {
        updateJobs().then(function(jobs) {
            // tell app that there was a JobUpdate
            $rootScope.$broadcast('Event.JobUpdate');

            // poll again
            $timeout(poll, period);
        })
    }

    // organizes jobs by queued, running, completed, and activeIDs
    function groupJobs() {
        queuedJobs = [],
        runningJobs = [],
        completedJobs = [],
        activeIds = [];

        for (var i=0; i<self.jobs.length; i++) {
            var job = self.jobs[i];

            if (job.status === 'queued') {
                queuedJobs.push(job);
                activeIds.push(job.id);
            } else if (job.status === 'in-progress') {
                runningJobs.push(job);
                activeIds.push(job.id);
            } else if (job.status === 'completed') {
                completedJobs.push(job);
            }
        }
    }


    function updateJobs(jobIds) {
        return $http.rpc('ms', 'CheckJobs', {})
            .then(function(jobsHash) {
                console.log('updating jobs', jobsHash)

                // if active jobs have change emit event
                for (var i=0; i<activeIds.length; i++) {
                    var id = activeIds[i];
                    var oldStatus = self.jobsHash[id].status;
                    var newStatus = jobsHash[id].status;

                    if (newStatus !== oldStatus) {
                        $rootScope.$broadcast('Event.JobStatusChange', {
                            jobId: id,
                            before: oldStatus,
                            after: newStatus
                        });

                        if (newStatus === 'completed') {
                            var params = jobsHash[id].parameters,
                                command = params.command;
                                args = params.arguments;

                            if (command === 'ModelReconstruction')
                                Dialogs.showComplete('Reconstruction complete', args.genome);
                            else if (command === 'FluxBalanceAnalysis')
                                Dialogs.showComplete('FBA complete', args.model.split('/').pop());
                            else if (command === 'GapfillModel')
                                Dialogs.showComplete('Gapfill complete',  args.model.split('/').pop());
                        }
                    }
                }

                self.jobs = sanitizeJobs(jobsHash);
                self.jobsHash = jobsHash;
                groupJobs();
                console.log('active IDs', activeIds)
            })
    }

    function sanitizeJobs(jobDict) {
        var jobs = [];
        for (var id in jobDict) {
            jobDict[id].timestamp = Date.parse(jobDict[id].start_time)
            jobs.push(jobDict[id]);
        }
        return jobs;
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
