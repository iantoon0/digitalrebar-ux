/*
node controller
*/
(function(){
    angular.module('app').controller('NodeCtrl', function($scope, debounce) {
        
        $scope.$emit('title', 'Nodes'); // shows up on the top toolbar

        var nodes = this;
        this.selected = []
        this.order = 'name'

        // converts the _nodes object that rootScope has into an array
        this.getNodes = function() {
        	var nodes = []
        	for(var id in $scope._nodes) {
        		nodes.push($scope._nodes[id])
        	}
        	return nodes
        }

        this.deleteSelected = function() {
        	for(var i in nodes.selected) {
        		var node = nodes.selected[i]

        		if(node.admin) {
        			console.log("Can't delete admin node !"+node.id)
        			continue;
        		}

        		console.log("Deleting node "+node.id)

        		// the api call uses REST DELETE on /nodes/id to remove a node 
        		$scope.callApi('/api/v2/nodes/'+node.id, {method: 'DELETE'}).
        			success(function(){
        				console.log("Node deleted")
        				
        				debounce($scope.getDeployments, 500, false);
        			})
        	}

        	// remove the selected items
        	nodes.selected = []
        }

    });

})();