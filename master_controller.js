
var app = angular.module('myApp', ['ui.grid', 'ui.grid.edit', 'ui.grid.rowEdit', 'ui.grid.cellNav']);

app.controller('myCtrl', ['$scope', '$http', '$q', '$interval', '$window', function($scope, $http, $q, $interval, $window ) {

	$scope.gridOptions = {};

	$scope.myData2 = [];

	$scope.linkCellTemplate = '<div class="ui-grid-cell-contents">' +  
                       ' <a href="" ng-click="grid.appScope.editRow(grid, row)"> Open </a>' +
			'</div>';

        $scope.editRow = function(grid, row) {
              $window.open(row.entity["link"], '_blank');
        };

	$scope.gridOptions.columnDefs = [
		{ name: '_id', visible:false},
		{ name: 'fid', visible: false},
		{ name: 'ip', enableCellEdit: false, displayName: 'IP', width: "10%"},
		{ name: 'port', enableCellEdit: false, displayName: 'Port', width: "5%" },
                { name: 'counter', enableCellEdit: false, displayName: 'Cluster', width: "5%" },
                { name: 'ccount', enableCellEdit: false, displayName: 'Clients', width: "5%" },
                { name: 'mcount', enableCellEdit: false, displayName: 'Chats', width: "5%"},
		{ name: 'peerlist', enableCellEdit: false, displayName: 'Peers', width: "50%" },
                { name: 'uptime', enableCellEdit: false, displayName: 'Uptime', width: "15%" },
                { name: 'link', enableCellEdit: false, displayName: 'Link', width: "5%", cellTemplate: $scope.linkCellTemplate }
	];

	$scope.saveRow = function( rowEntity ) {
    	// create a fake promise - normally you'd use the promise returned by $http or $resource
	    var promise = $q.defer();
	    $scope.gridApi.rowEdit.setSavePromise( rowEntity, promise.promise );

      	   console.log(rowEntity);
	   var row = JSON.stringify(rowEntity);
	
		$http({
        		url: '/post',
		        method: "POST",
        		data: row,
		        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
	    	}).then(function(response) {
        		    console.log(response);
				promise.resolve();
		        }, 
        		function(response) { // optional
		            // failed
			console.log(response);
	        	}
    		);
	};

	$scope.gridOptions.onRegisterApi = function(gridApi){
		//set gridApi on scope
	    $scope.gridApi = gridApi;
	    gridApi.rowEdit.on.saveRow($scope, $scope.saveRow);
	
	};

	$scope.addnew = function(temp) {
		alert("add new: " + temp);
	};


	$scope.current_cursor = 0;
	$scope.page_size = 1;
	$scope.profile_count = 0;

	$scope.previous_page = function()
	{
		if ($scope.current_cursor == 0) {
			alert("First page");
			return;
		}
                $scope.current_cursor -= $scope.page_size;
		if ($scope.current_cursor < 0)
			$scope.current_cursor = 0;
		$scope.reload_page();
	}

	$scope.next_page = function() 
	{
		$scope.current_cursor += $scope.page_size;
		if (($scope.current_cursor + $scope.page_size) > $scope.profile_count) {
			alert("Last page");
		} else {
			$scope.reload_page();
		}
	}

	$scope.reload_page = function()
	{
                $http({
                        url: '/page',
                        method: "POST",
                        //data: {skip: $scope.current_cursor, limit: $scope.page_size, fid: "1B"},
                        data: {type: 'stats'},
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                }).then(function(response) {
                            //console.log(response.data);
                                $scope.myData2.splice(0, $scope.myData2.length)
                                for(i = 0; i < response.data.length; i++){
                                        $scope.myData2.push(response.data[i]);
                                }
                                $scope.gridOptions.data = $scope.myData2;
                        },
                        function(response) { // optional
                            // failed
                                console.log(response);
                        }
                );
	}

	$scope.start2 = function() {
		//$scope.gridOptions.data = $scope.myData2;
                $interval (function() {
                    $scope.reload_page();
                },1000);
		

		$http.get('/get')
		  .success(function(data) {
			console.log(data);
			$scope.profile_count = data.count;
		});
	};

}]);

