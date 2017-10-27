
angular.module('ms-tour', [])
.controller('Tour',
['$scope', '$state', 'Auth', '$timeout', '$mdDialog', '$http', 'Dialogs', 'WS',
function($s, $state, Auth, $timeout, $dialog, $http, Dialogs, WS) {
    var intro;

    var DEMO_FILE_NAME = 'reconstruct demo';

    var options = {
        showStepNumbers: false,
        exitOnOverlayClick: false,
        skipLabel: 'Exit',
        //overlayOpacity: .5
        steps: [{
                // step 1
                element: '#tour-1',
                intro: 'You\'ll see the ModelSEED website is organized \
                      by common concepts, such as "Biochemsitry", "Media", "Models", etc. \
                      Let\'s start with the Biochemistry',
                position: 'bottom-middle-aligned'
            }, {
                // step 2
                element: function() {
                    hideOverlay();

                    var ele = document.querySelector('.query-input');
                    var $scope = angular.element(ele).scope();
                    $scope.$apply(function() { $scope.query = 'glucose'; });
                    return document.querySelector('.query-input');
                },
                intro: 'Reference data in ModelSEED is stored in a powerful search\
                        engine, allowing for quick searches/filtering.  Try yourself.',
                position: 'right'
            }, {
                // step 3
                element: function() {
                    $timeout(function() { $state.go('app.RefModels'); })
                    showOverlay();
                    return document.querySelector('#tour-2');
                },
                intro: 'Under genomes we can view or reconstruct from over <i>33k</i> public genomes, \
                        as well as reconstruct from your previously annotated genomes',
                position: 'bottom-middle-aligned'
            }, {
                // step 4
                element: function() {
                    showNextBtn(); // for backbutton
                    hideOverlay();

                    var ele = document.querySelector('.query-input'),
                        $scope = angular.element(ele).scope();
                    $scope.$apply(function() {
                        $scope.query = 'Escherichia coli K-12 ER3413';
                    });
                    return ele;
                },
                intro: "Let's search for and create a model for <i>Escherichia coli K-12 ER3413</i>",
                position: 'right'
            }, {
                // step 5
                element: function() {
                    hideNextBtn()

                    var ele = angular.element(document.querySelector('tbody tr'))[0];
                    angular.element(ele).bind('click', function() {
                        angular.element(this).unbind('click');
                        $timeout(function() {
                            intro.nextStep();
                        })
                    })

                    return ele;
                },
                intro: "Let's click the radio button to select this genome. Clicking the link \
                        will allow you to view genome (from its origin).",
            }, {
                // step 6
                element: function() {
                    hideNextBtn()

                    var btn = angular.element(document.querySelector('button.md-primary'))[0];
                    var $scope = angular.element(btn).scope()

                    $scope.reconstruct = function() {
                        mockDialog(function() {
                            // when dialog animation is done, go to next step
                            intro.nextStep()
                        })
                    }

                    return btn;
                },
                intro: "Simply click the reconstruct button",
                position: 'bottom-middle-aligned'
            }, {
                // step 7
                element: function() {
                    showNextBtn()
                    var ele = document.querySelector('md-dialog');
                    return ele;
                },
                intro: "In the reconstruct dialog we can select a public media formulation.\
                        You can also select own media forumulation or by clicking \"search my media\".\
                        Custom media forumations can be made under \"Media\" in the main toolbar, which we won't cover\
                        in this tutorial<br>\
                        Click next to reconstruct on complete media (the default)."
            }, {
                // step 8
                element: function() {
                    var ele = document.querySelector('.md-actions .md-button');
                    angular.element(ele).bind('click', function() {
                        intro.nextStep();
                    })
                    return ele;
                },
                intro: "Click me!",
                position: 'left'
            }, {
                // step 9
                element: function() {
                    return document.querySelector('#tour-3');;
                },
                intro: 'Once your model is done reconstructing, it will show up in the "Models" view. \
                    Here you will find a list of all your reconstructed models, along with \
                    associated fba, gapfilling, and media data.  You\'ll notice that the model \
                    has been gapfilled on complete media and that FBA has been already been ran once \
                    on complete media.<br>Let\'s take a closer look...',
                position: 'bottom-middle-aligned'
            }, {
                // step 9
                element: function() {
                    return document.querySelector('.my-model')[0];
                },
                intro: "Here we see a link to the model. And various options related to the model, \
                        such as run FBA, Gapfill, Delete, and download.",
                position: 'bottom-middle-aligned'
            }]
        }


    $s.startTour = function() {
        if (!Auth.user) {
            mustLogin();
            return
        }

        intro = introJs();
        intro.setOptions(options)

        //$state.go('app.biochem')
        $state.go('app.RefModels')
        .then(function() {
            $timeout(function() {
                intro.goToStep(3).start();
            })
        })
    }

    function hideNextBtn() {
        var btn = document.querySelector('.introjs-nextbutton');
        angular.element(btn).css('display', 'none')
    }

    function showNextBtn() {
        var btn = document.querySelector('.introjs-nextbutton');
        angular.element(btn).css('display', 'inline-block')
    }

    function hideOverlay() {
        angular.element(document.querySelector('.introjs-overlay'))
               .css('opacity', 0);
    }

    function showOverlay() {
        angular.element(document.querySelector('.introjs-overlay'))
               .css('opacity', 0.8);
    }

    function mockDialog(onShowComplete) {
        var item = {
                contigs: 1,
                genome_id: "83333.84",
                name: "Escherichia coli K-12 ER3413",
                species: "Escherichia coli"
            }

        reconstruct(item, onShowComplete)
    }

    function reconstruct(item, onShowComplete) {
        $dialog.show({
            templateUrl: 'app/views/dialogs/reconstruct.html',
            //targetEvent: ev,
            clickOutsideToClose: true,
            onComplete: function() {
                onShowComplete()
            },
            controller: ['$scope', '$http',
            function($scope, $http) {
                $scope.item = item;
                $scope.form = {genome: item.path};

                $scope.reconstruct = function(){
                    // go to step 9 regarless of what crazy thing the user does
                    intro.goToStep(9);
                    Dialogs.showToast('Reconstructing', item.name)

                    var src = '/nconrad/home/models/511145.12_model',
                        dest = '/'+Auth.user+'/home/models/'+DEMO_FILE_NAME;
                    $http.rpc('ms', 'copy_model', {
                            model: src,
                            copy_genome: 0,
                            destination: dest
                        }).then(function() {
                            return WS.mv(dest+'511145.12_model', dest);
                        }).then(function() {
                            return WS.mv(dest+'.511145.12_model', '/'+Auth.user+'/home/models/.'+DEMO_FILE_NAME);
                        }).then(function() {
                            Dialogs.showComplete('Reconstruct complete', item.name);
                            intro.nextStep();
                        })

                    $state.go('app.myModels')
                    $dialog.hide();
                }

                $scope.cancel = function(){
                    $dialog.hide();
                }
            }]
        })
    }

    var mustLoginSteps = {
        showStepNumbers: false,
        showBullets: false,
        steps: [
            {
                element: function() {
                    angular.element(document.querySelector('#step1')).on('click', function() {

                    })
                    return document.querySelector('#login');
                },
                intro: "Sorry, you must login before taking a tour.",
                position: 'bottom-middle-aligned'
            }]
        }

    function mustLogin() {
        var intro = introJs();
        intro.setOptions(mustLoginSteps)
        intro.start();
    }

}])
