
angular.module('Regulons', [])
.controller('Regulons', ['$scope', '$http', function($scope, $http) {

    $scope.opts = {query: '', limit: 10, offset: 0, sort: {}};

    $scope.geneHeader = [{label: 'Annotation', key: 'Annotation'},
                         {label: 'BSU Number', key: 'BSU Number'},
                         {label: 'Conditioned rules', key: 'Conditioned rules'},
                         {label: 'Gene Name', key: 'Gene_Name'},
                         {label: 'Involved Metabolite(s)', key: 'Involved Metabolite(s)'},
                         {label: 'Metabolite(s) number', key: 'Metabolite(s) number'},
                         {label: 'Metabolite(s) sign', key: 'Metabolite(s) sign'},
                         {label: 'Operon', key: 'Operon'},
                         {label: 'Regulation sign', key: 'Regulation sign'},
                         {label: 'Regulator number', key: 'Regulator number'},
                         {label: 'Regulator(s) name', key: 'Regulator(s) name'},
                         {label: 'Regulatory mecanisms', key: 'Regulatory mecanisms'},
                         {label: 'Sigma factor', key: 'Sigma factor'},
                         {label: 'Sigma factor number', key: 'Sigma factor number'},
                         ];

                         /*
                         Annotation: "Annotation"
                         BSU Number: "BSU Number"
                         Conditioned rules: "Conditioned rules"
                         Gene_Name: "Gene_Name"
                         Involved Metabolite(s): "Involved Metabolite(s)"
                         Metabolite(s) number: "Metabolite(s) number"
                         Metabolite(s) sign: "Metabolite(s) sign"
                         Operon: "Operon"
                         Regulation sign: "Regulation sign"
                         Regulator number: "Regulator number"
                         Regulator(s) name: "Regulator(s) name"
                         Regulatory mecanisms: "Regulatory mecanisms"
                         Sigma factor: "Sigma factor"
                         Sigma factor number: "Sigma factor number"
                         */

    // fetch data
    $scope.loading = true;
    $http.get('data/regulons/genes.json')
         .then(function(data) {
             console.log('data', data)
            $scope.genes = data.data;
            $scope.loading = false;
         })

}])
