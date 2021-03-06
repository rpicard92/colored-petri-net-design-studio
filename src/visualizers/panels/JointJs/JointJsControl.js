/*globals define, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Sun Dec 02 2018 07:53:57 GMT-0600 (Central Standard Time).
 */

define(['js/Constants'
], function (CONSTANTS) {

    'use strict';

    var JointJsControl;

    JointJsControl = function (options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;
        
        // Declared the network here -RP
        this._network = null;

        // Declared the screen positions here -RP
        this._screenPositions = null;

        // Declared the screen positions here -RP
        this._lastPlacePosition = null;

        // Declared the screen positions here -RP
        this._lastTransitionPosition = null;

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
    };

    JointJsControl.prototype._initWidgetEventHandlers = function () {
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    JointJsControl.prototype.selectedObjectChanged = function (nodeId) {
        var self = this,
            staticNetwork = {
                places: {
                    'start': {position: {x: 100, y: 100}, tokens: {red: 1, blue: 3, yellow: 6}},
                    'stop': {position: {x: 300, y: 100}, tokens: {red: 1, blue: 3, yellow: 6}}
                },
                transitions: {'go': {position: {x: 200, y: 50}, input: {red: 1, blue: 1, yellow: 0}, output: {red: 2}}},
                connections: [{from: 'start', to: 'go'}, {from: 'go', to: 'stop'}]
            };

        /* If the network has been loaded by the simulation
            plugins using the
        */
        if (this._network != null){
            this._widget.initNetwork(staticNetwork);
        } else {
            // Default to example -RP
            this._widget.initNetwork(staticNetwork);
        }
    };

    /* This function should be called by our simulation plugins
        and it should set the network JSON object -RP
    */
    JointJsControl.prototype.updateNetwork = function (jsonObject) {
        this._network = JSON.parse(jsonObject);
    }

    /* This function should be called by our simulation plugins
        and it should set the network JSON object -RP
    */
   JointJsControl.prototype.createNetwork = function (nodeId) {  
    var networkDict = {
        places:[],
        transitions:[],
        connections:[]
    }
    var client = new GME.classes.Client(GME.gmeConfig);
    var node = client.getNode(nodeId);
    var childrenIds = node.getChildrenIds();
    childrenIds.forEach(function (childId) {
        var childNode = client.getNode(childId);
        var childNodeName = childNode.getAttribute('name');
        var childMetaType = childNode.getMetaType(childNode);
        var childMetaTypeName = childMetaType.getAttribute('name');
        if(childMetaTypeName == 'Place'){
            var childNodeTokens = childNode.getAttribute('tokens');
            networkDict[places].append({childNodeName:{position: this.getNewPosition('Place'), childNodeTokens}});
        } else if(childMetaTypeName == 'Transition'){
            var childNodeTokens = childNode.getAttribute('tokens');
            // Transitions have thresholds, not inputs and outputs.... need to fix this!!!
            networkDict[transitions].append({childNodeName:{position: this.getNewPosition('Transition'), input: childNodeTokens, output: {red: 2}}});
        } else if (childMetaTypeName == 'PlaceToTransition'){
            var childNodeTokens = childNode.getAttribute('tokens');
            // Arcs have weights and capacities.... need to fix this!!!
            networkDict[transitions].append([{from: 'start', to: 'go'}, {from: 'go', to: 'stop'}]);
        } else if (childMetaTypeName == 'TransitionToPlace'){
            // Arcs have weights and capacities.... need to fix this!!!
            networkDict[transitions].append([{from: 'start', to: 'go'}, {from: 'go', to: 'stop'}]);
        }
    })

    /* This function gets new screen positions for components that must be drawn -RP
    */
    JointJsControl.prototype.getNewPosition = function (componentType) {  
        if(this._lastPlacePosition == null){
            this._lastPlacePosition = new Object();
            this._lastPlacePosition['x'] = 100;
            this._lastPlacePosition['y'] = 100;
        }
        if(this._lastTransitionPosition == null){
            this._lastTransitionPosition = new Object();
            this._lastTransitionPosition['x'] = 200;
            this._lastTransitionPosition['y'] = 50;
        }
        if(this._lastScreenPositions == null){
            if(componentType == 'Place'){
                this._lastPlacePosition = new Object();
                this._lastScreenPositions = {x:this._lastPlacePosition['x'], y:this._lastPlacePosition['y']};
            } else if(componentType == 'Transition') {
                this._lastPlacePosition = new Object();
                this._lastScreenPositions = {x:this._lastPlacePosition['x'], y:this._lastPlacePosition['y']};
            }
        } else {
            this._lastPlacePosition = this._lastPlacePosition + 100;
            this._lastScreenPositions = {x:this._lastScreenPositions['x'], y:this._lastPlacePosition['y']};
        }
    }


}

    /* * * * * * * * Node Event Handling * * * * * * * */
    JointJsControl.prototype._eventCallback = function (events) {
    };

    JointJsControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    JointJsControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    JointJsControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    JointJsControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    JointJsControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerSuppressVisualizerFromNode(true);
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId);
            WebGMEGlobal.State.registerSuppressVisualizerFromNode(false);
        }
    };

    JointJsControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    JointJsControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    JointJsControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    JointJsControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    JointJsControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        this.$btnStepBackward = toolBar.addButton({
            title: 'Step Backward',
            icon: 'gylphicon glyphicon-step-backward',
            clickFn: function (/*data*/) {
                self._widget.stepBackward();
            }
        });
        this._toolbarItems.push(this.$btnStepBackward);

        this.$btnResetSimulation = toolBar.addButton({
            title: 'Reset Simulation',
            icon: 'gylphicon glyphicon-step-backward',
            clickFn: function (/*data*/) {
                self._widget.resetTrace();
            }
        });
        this._toolbarItems.push(this.$btnResetSimulation);

        this.$btnStepForward = toolBar.addButton({
            title: 'Step Forward',
            icon: 'gylphicon glyphicon-step-forward',
            clickFn: function (/*data*/) {
                self._widget.stepForward();
            }
        });

        this._toolbarInitialized = true;
    };

    return JointJsControl;
});
