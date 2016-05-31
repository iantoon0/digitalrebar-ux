/*
deployments controller
*/
(function(){
    angular.module('app').controller('DeploymentsCtrl', function($mdMedia, $mdDialog, $scope, $http, debounce, $timeout, $routeParams, api) {
        $scope.$emit('title', 'Deployments'); // shows up on the top toolbar

        var deployments = this;

        // when a node is clicked, this dialog appears (see nodedialog.tmpl.html)
        this.showNodeDialog = function(ev, node) {
            $scope.node = node;
            var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
            $mdDialog.show({
                controller: 'DialogController',
                controllerAs: 'ctrl',
                templateUrl: 'nodedialog.tmpl.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                locals: {
                    node: $scope.node
                },
                clickOutsideToClose: true,
                fullscreen: useFullScreen
            })
        };

        $scope.expand = {}

        if($routeParams.id)
            $scope.expand[$routeParams.id] = true;

        // called when a deployment is clicked
        this.toggleExpand = function(deployment) {
            $scope.expand[deployment.id] = !$scope.expand[deployment.id];
        }


        // makes a map of node simpleState => number of nodes with that simpleState
        this.getNodeCounts = function(deployment, override) {
            var result = [0, 0, 0, 0];

            for(var i in $scope._nodes) {
                var node = $scope._nodes[i];
                if (node.deployment_id == deployment.id && !node.system) 
                    result[node.simpleState] ++;
            }
            return result
        }

        this.opts = { // sparkline options
            sliceColors: [
                "#8BC34A", // ready
                "#F44336", // error
                "#03A9F4", // todo
                "#616161" // off
            ],
            tooltipFormat: '{{value}}',
            disableTooltips: true,
            disableHighlight: true,
            borderWidth: 2,
            borderColor: '#fff',
            width: '2em',
            height: '2em',
        };

        this.deploymentPie = {}

        // creates the pie chart data for all the deployments
        this.createPieChartData = function() {
            $timeout(function(){
                for(var id in $scope._deployments) {
                    deployments.deploymentPie[id] = deployments.getNodeCounts($scope._deployments[id]);
                }
            }, 500)
        }

        this.deploymentStatus = {}

        // creates the node role status data for all the deployments
        // takes a sum of the all the node roles and all the errors
        this.createStatusBarData = function() {
            $scope.$evalAsync(function(){
                for(var id in $scope._deployments) {
                    var deployment = $scope._deployments[id];
                    deployments.deploymentStatus[id] = {error: 0, total: 0}
                    for(var roleId in deployment.node_roles) {
                        var state = deployment.node_roles[roleId].state;
                        if(state == -1)
                            deployments.deploymentStatus[id].error ++

                        deployments.deploymentStatus[id].total ++; 
                    }
                }
            })
        }

        // creates a confirmation dialog before deleting the deployment
        $scope.deleteDeployment = function(event, id){
            $scope.confirm(event, {
                title: "Delete Deployment",
                message: "Are you sure you want to delete deployment "+$scope._deployments[id].name+"?",
                yesCallback: function() {
                    api("/api/v2/deployments/"+id,{method: "DELETE"}).
                    success(function(){
                        api.remove("deployment", id)
                    }).
                    error(function(){
                        api.toast("Error Deleting Deployment", true)
                    })
                }
            })
        }

        // puts deployment into proposed status
        $scope.proposeDeployment = function(id) {
            api("/api/v2/deployments/"+id+"/propose",{method: "PUT"}).
            success(api.addDeployment).
            error(function(err){
                api.toast("Error Proposing Deployment "+$scope._deployments[id].name+" - "+err.message)
            })
        }

        // puts deployment into committed status
        $scope.commitDeployment = function(id) {
            api("/api/v2/deployments/"+id+"/commit",{method: "PUT"}).
            success(api.addDeployment).
            error(function(){
                api.toast("Error Committing Deployment "+$scope._deployments[id].name+" - "+err.message)
            })
        }

        // creates an array of unused roles for a specified deployment
        $scope.getRoles = function(deployment_id) {
            var roles = []
            var active = []
            for(var id in $scope._deployment_roles){
                var deployment_role = $scope._deployment_roles[id]
                if(deployment_role.deployment_id == deployment_id) {
                    active.push(deployment_role.role_id+"")
                }
            }
            for(var id in $scope._roles) {
                if(active.indexOf(id) == -1) {
                    roles.push($scope._roles[id])
                }
            }
            return roles;
        }

        // adds a role to the deployment
        $scope.addRole = function(role_id, id) {
            api("/api/v2/deployment_roles/", {
                method: "POST",
                data: {
                    deployment_id: id,
                    add_role: {
                        role_id: role_id
                    }
                }
            }).success(api.addDeploymentRole).
            error(function(err){
                api.toast("Error Adding Deployment Role - "+err.message)
            })
        }

        // callbacks for when nodes and noderoles finish
        // the pie charts require the nodes to exist
        $scope.$on('nodesDone', deployments.createPieChartData)
        $scope.$on('node_rolesDone', deployments.createStatusBarData)

        // if we have nodes, we don't have to wait for the callback
        if(Object.keys($scope._nodes).length)
            this.createPieChartData();

        if(Object.keys($scope._node_roles).length)
            this.createStatusBarData();
        

    });

})();