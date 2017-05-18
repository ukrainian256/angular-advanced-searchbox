/*!
 * angular-advanced-searchbox
 * https://github.com/dnauck/angular-advanced-searchbox
 * Copyright (c) 2016 Nauck IT KG http://www.nauck-it.de/
 * Author: Daniel Nauck <d.nauck(at)nauck-it.de>
 * License: MIT
 */

(function() {

'use strict';

angular.module('angular-advanced-searchbox', [])
    .directive('nitAdvancedSearchbox', function() {
        return {
            restrict: 'E',
            scope: {
                model: '=ngModel',
                parameters: '=',
                parametersLabel: '@',
                parametersDisplayLimit: '=?',
                placeholder: '@',
                searchThrottleTime: '=?'
            },
            replace: true,
            templateUrl: function(element, attr) {
                return attr.templateUrl || 'angular-advanced-searchbox.html';
            },
            controller: [
                '$scope', '$attrs', '$element', '$timeout', '$filter', 'setFocusFor',
                function ($scope, $attrs, $element, $timeout, $filter, setFocusFor) {

                    $scope.status = {
                        isopen: false
                    };
                    $scope.parameters = $scope.parameters || [];
                    $scope.filteredArr = $scope.parameters;
                    $scope.parametersLabel = $scope.parametersLabel || 'Parameter Suggestions';
                    $scope.parametersDisplayLimit = $scope.parametersDisplayLimit || 8;
                    $scope.placeholder = $scope.placeholder || 'Search ...';
                    $scope.searchThrottleTime = $scope.searchThrottleTime || 750;
                    $scope.searchParams = [];
                    $scope.searchQuery = '';
                    $scope.setFocusFor = setFocusFor;
                    $scope.isSpacebarKey = false;
                    var searchThrottleTimer;
                    var changeBuffer = [];

                    $scope.showMenu = function($event) {
                        if ($event) {
                            $event.stopPropagation();
                        }
                        $scope.status.isopen = true;
                    };
                    $scope.hideMenu = function($event) {
                        if ($event) {
                            $event.stopPropagation();
                        }
                        $scope.status.isopen = false;
                    };

                    $scope.$watch('model', function (newValue, oldValue) {

                        console.log('newValue: ', newValue);
                        console.log('oldValue: ', oldValue);

                        if (angular.equals(newValue, oldValue)) {
                            return;
                        }

                        var iM,
                            a = $scope.model;
                        for (iM = 0; iM < a.length; iM++) {
                            console.log('$scope.$watch: ', a[iM]);
                        }

                        /*
                        angular.forEach($scope.model, function (value, key) {

                            console.log('value: ', value);
                            console.log('key: ', key);

                            if (key === 'query' && $scope.searchQuery !== value) {
                                $scope.searchQuery = value;
                            } else {
                                var paramTemplate = $filter('filter')($scope.parameters, function (param) { return param.key === key; })[0];
                                var searchParams = $filter('filter')($scope.searchParams, function (param) { return param.key === key; });

                                console.log('paramTemplate: ', paramTemplate);
                                console.log('searchParams: ', searchParams);

                                if (paramTemplate !== undefined) {
                                    if (paramTemplate.allowMultiple) {
                                        // ensure array data structure
                                        if (!angular.isArray(value)) {
                                            value = [value];
                                        }

                                        // for each value in the value array: check for adding a new parameter or update it's value
                                        value.forEach(function(val, valIndex) {
                                            if (searchParams.some(function (param) { return param.index === valIndex; })) {
                                                var param = searchParams.filter(function (param) {return param.index === valIndex; });
                                                if (param[0].value !== val) {
                                                    param[0].value = val;
                                                }
                                            } else {
                                                $scope.addSearchParam(paramTemplate, val, false);
                                            }
                                        });

                                        // check if there're more search parameters active then values and remove them
                                        if (value.length < searchParams.length) {
                                            for (var i = value.length; i < searchParams.length; i++) {
                                                $scope.removeSearchParam($scope.searchParams.indexOf(searchParams[i]));
                                            }
                                        }
                                    } else {
                                        if (searchParams.length === 0) {
                                            // add param if missing
                                            $scope.addSearchParam(paramTemplate, value, false);
                                        } else {
                                            // update value of parameter if not equal
                                            if (searchParams[0].value !== value) {
                                                searchParams[0].value = value;
                                            }
                                        }
                                    }
                                }
                            }
                        });

                        */


                        // delete not existing search parameters from internal state array
                        /*
                        for (var i = $scope.searchParams.length - 1; i >= 0; i--) {
                            var value = $scope.searchParams[i];
                            if (!$scope.model.hasOwnProperty(value.key)) {
                                var index = $scope.searchParams.map(function(e) { return e.key; }).indexOf(value.key);
                                $scope.removeSearchParam(index);
                            }
                        }
                        */

                    }, true); // END WATCH MODEL

                    $scope.searchParamValueChanged = function (param) {
                        updateModel('change', param.key, param.index, param.value);
                    };

                    $scope.searchQueryChanged = function (query) {
                        updateModel('change', 'query', 0, query);
                    };

                    $scope.enterEditMode = function(e, index) {

                        console.log('Running enterEditMode, e, index: ', e, index);

                        if (e !== undefined) {
                            e.stopPropagation();
                        }

                        if (index === undefined) {
                            return;
                        }

                        var searchParam = $scope.searchParams[index];
                        searchParam.editMode = true;
                        console.log('enterEditMode searchParam: ', searchParam);
                        setFocusFor('searchParam:' + searchParam.key);

                        $scope.$emit('advanced-searchbox:enteredEditMode', searchParam);
                    };

                    /**
                     * Fix to prevent ignoring of the Click-Selection of a typeahead Element
                     **/
                    $scope.maybeLeaveEditMode = function (e, index) {
                        if ($scope.isSpacebarKey === true) {
                            e.preventDefault();
                            return;
                        }
                        else if (e.relatedTarget !== null && e.relatedTarget.parentElement.id.indexOf("typeahead") !== -1) {
                            return false;
                        } else {
                            return $scope.leaveEditMode(e, index);
                        }
                    };

                    $scope.leaveEditMode = function(e, index) {

                        $scope.status.isopen = true;

                        if (index === undefined) {
                            return;
                        }

                        var searchParam = $scope.searchParams[index];
                        searchParam.editMode = false;

                        $scope.$emit('advanced-searchbox:leavedEditMode', searchParam);

                        // remove empty search params
                        if (!searchParam.value) {
                            $scope.removeSearchParam(index);
                        }

                    };

                    // QUERYMODE
                    $scope.searchQueryTypeaheadOnSelect = function (item, model, label) {
                        console.log('Running $scope.searchQueryTypeaheadOnSelect: ', item, model, label);
                        $scope.addSearchParam(item);
                        $scope.searchQuery = '';
                        updateModel('delete', 'query', 0);
                    };

                    // EDITMODE
                    $scope.searchParamTypeaheadOnSelect = function (suggestedValue, searchParam) {
                        searchParam.value = suggestedValue;
                        $scope.searchParamValueChanged(searchParam);
                    };

                    $scope.isUnusedParameter = function (value, index) {
                        // @TODO Refactor if needed, else delete
                        // var myFilterTest = $filter('filter')($scope.searchParams, function (param) {
                        //     return param.key === value.key && !param.allowMultiple;
                        // }).length === 0;
                        // return myFilterTest;
                        return true;
                    };

                    $scope.canAddParameter = function () {
                      var availableParameters = $scope.parameters.length;
                        for (var i = 0; i < $scope.parameters.length; i++) {
                            if (!$scope.parameters[i].allowMultiple) {
                                for ( var j = 0; j < $scope.searchParams.length; j++) {
                                  if ($scope.parameters[i].key === $scope.searchParams[j].key) {
                                    availableParameters -= 1;
                                    break;
                                  }
                                }
                            }
                        }
                        return availableParameters > 0;
                    };

                    $scope.addSearchParam = function (searchParam, value, enterEditModel) {

                        console.log('Running addSearchParam - searchParam, value, enterEditModel: ', searchParam, value, enterEditModel);

                        if (enterEditModel === undefined) {
                            enterEditModel = true;
                        }

                        // if (!$scope.isUnusedParameter(searchParam)) {
                        //     return;
                        // }

                        var internalIndex = $scope.model.length;

                        var newIndex =
                            $scope.searchParams.push(
                                {
                                    key: searchParam.key,
                                    name: searchParam.name,
                                    type: searchParam.type || 'text',
                                    placeholder: searchParam.placeholder,
                                    allowMultiple: searchParam.allowMultiple || false,
                                    suggestedValues: searchParam.suggestedValues || [],
                                    suggestedToString: searchParam.suggestedToString || '',
                                    restrictToSuggestedValues: searchParam.restrictToSuggestedValues || false,
                                    index: internalIndex,
                                    value: value || ''
                                }
                            ) - 1;

                        updateModel('add', searchParam.key, internalIndex, value);

                        if (enterEditModel === true) {
                            $timeout(function() {
                                $scope.enterEditMode(undefined, newIndex);
                            }, 250);
                        }

                        $scope.$emit('advanced-searchbox:addedSearchParam', searchParam);
                    };

                    $scope.removeSearchParam = function (index) {

                        console.log('Running removeSearchParam: ', index);

                        if (index === undefined) {
                            return;
                        }

                        var searchParam = $scope.searchParams[index];
                        $scope.searchParams.splice(index, 1);

                        // reassign internal index
                        if (searchParam.allowMultiple) {
                            var paramsOfSameKey = $filter('filter')($scope.searchParams, function (param) { return param.key === searchParam.key; });

                            for (var i = 0; i < paramsOfSameKey.length; i++) {
                                paramsOfSameKey[i].index = i;
                            }
                        }

                        updateModel('delete', searchParam.key, searchParam.index);

                        $scope.$emit('advanced-searchbox:removedSearchParam', searchParam);
                    };

                    $scope.removeAll = function() {
                        $scope.searchParams.length = 0;
                        $scope.searchQuery = '';

                        $scope.model = [];

                        $scope.$emit('advanced-searchbox:removedAllSearchParam');
                    };

                    $scope.editPrevious = function(currentIndex) {
                        if (currentIndex !== undefined) {
                            $scope.leaveEditMode(undefined, currentIndex);
                        }

                        if (currentIndex > 0) {
                            $scope.enterEditMode(undefined, currentIndex - 1);
                        } else if ($scope.searchParams.length > 0) {
                            $scope.enterEditMode(undefined, $scope.searchParams.length - 1);
                        } else if ($scope.searchParams.length === 0) {
                            // no search parameter available anymore
                            setFocusFor('searchbox');
                        }
                    };

                    $scope.editNext = function(currentIndex) {
                        if (currentIndex === undefined) {
                            return;
                        }

                        $scope.leaveEditMode(undefined, currentIndex);

                        //TODO: check if index == array length - 1 -> what then?
                        if (currentIndex < $scope.searchParams.length - 1) {
                            $scope.enterEditMode(undefined, currentIndex + 1);
                        } else {
                            setFocusFor('searchbox');
                        }
                    };


                    // @TODO
                    $scope.keyup = function(e, searchParamIndex) {
                        console.log('DISPLAY $scope.keyup');

                        var searchVal = $scope.searchQuery;
                        var key = e.which || e.keyCode || e.charCode;

                        console.log('DISPLAY searchVal: ', searchVal);
                        console.log('DISPLAY $scope.searchQuery: ', $scope.searchQuery);

                         // 8 backspace
                         // 9 tab
                         // 13 enter
                         // 27 esc
                         // 46 delete

                        if (
                            key !== 8 &&
                            key !== 9 &&
                            key !== 13 &&
                            key !== 27 &&
                            key !== 46
                            ) {
                            searchVal = searchVal + String.fromCharCode(key).toLowerCase();
                            console.log('DISPLAY Mööp searchVal: ', searchVal);
                        }

                        if (searchVal == ' ') {  // space and field is empty, show menu
                            $scope.showMenu(e);
                            $timeout(function() {
                                $scope.searchQuery = '';
                            });
                            return;
                        }
                        if (searchVal === '') {
                            $scope.filteredArr = angular.copy($scope.parameters);
                            // $scope.$apply();
                            // $scope.$emit('textSearch', '', $scope.filter_keys);
                            // if ($scope.facetSelected && $scope.facetSelected.options === undefined) {
                            //     $scope.resetState();
                            // }
                            return;
                        }
                        if (key !== 8 || key !== 46) {
                            $scope.filterFacets(e, searchVal);
                        }

                    };


                    $scope.keydown = function(e, searchParamIndex) {

                        var handledKeys = [8, 9, 13, 32, 37, 39];

                        if (handledKeys.indexOf(e.which) === -1) {
                            return;
                        }

                        if (e.which == 32) { // spacebar
                            $scope.isSpacebarKey = true;
                            return;
                        }

                        var cursorPosition = getCurrentCaretPosition(e.target);

                        if (e.which == 8) { // backspace
                            if (cursorPosition === 0) {
                                e.preventDefault();
                                $scope.editPrevious(searchParamIndex);
                            }
                        } else if (e.which == 9) { // tab
                            if (e.shiftKey) {
                                e.preventDefault();
                                $scope.editPrevious(searchParamIndex);
                            } else {
                                e.preventDefault();
                                $scope.editNext(searchParamIndex);
                            }
                        } else if (e.which == 13) { // enter
                            $scope.editNext(searchParamIndex);
                        } else if (e.which == 37) { // left
                            if (cursorPosition === 0) {
                                $scope.editPrevious(searchParamIndex);
                            }
                        } else if (e.which == 39) { // right
                            if (cursorPosition === e.target.value.length) {
                                $scope.editNext(searchParamIndex);
                            }
                        }
                    };

                    $scope.isMatchLabel = function(label) {
                        return Array.isArray(label);
                    };

                    $scope.filterFacets = function($event, searchVal) {
                        var i, idx, label;
                        var filtered = [];
                        $scope.filteredArr = angular.copy($scope.parameters);
                        for (i = 0; i < $scope.filteredArr.length; i++) {
                            var facet = $scope.filteredArr[i];
                            idx = facet.name.toLowerCase().indexOf(searchVal);
                            if (idx > -1) {
                                label = [facet.name.substring(0, idx), facet.name.substring(idx, idx + searchVal.length), facet.name.substring(idx + searchVal.length)];
                                // var pushObj = {'name':facet.name, 'label':label, 'options':facet.options};
                                var pushObj = facet;
                                pushObj.label = label;
                                filtered.push(pushObj);
                                console.log('filtered: ', filtered);
                            }
                        }
                        if (filtered.length > 0) {
                            $scope.showMenu($event);
                            $timeout(function() {
                                $scope.filteredArr = filtered;
                            }, 0.1);
                        }
                        else {
                            // $scope.$emit('textSearch', searchVal, $scope.filter_keys);
                            $scope.hideMenu($event);
                        }

                    };


                    function restoreModel() {
                        console.log('Running restoreModel');

                        // @TODO
                        var iRM,
                            aRM = $scope.model;

                        for (iRM = 0; iRM < aRM.length; iRM++) {
                            console.log('restoreModel FOR loop: ', aRM[iRM]);
                        }

                        // @TODO
                        /*
                        angular.forEach($scope.model, function (value, key) {
                            if (key === 'query') {
                                $scope.searchQuery = value;
                            } else {
                                var searchParam = $filter('filter')($scope.parameters, function (param) { return param.key === key; })[0];
                                if (searchParam !== undefined) {
                                    $scope.addSearchParam(searchParam, value, false);
                                }
                            }
                        });
                        */
                    }

                    if ($scope.model === undefined) {
                        // Is set if User forgot to define ngModel
                        $scope.model = [];
                    } else {
                        // Is invoked if the model is defined = empty or not empty
                        restoreModel();
                    }

                    function updateModel(command, key, index, value) {

                        console.log('Running updateModel command, key, index, value: ', command, key, index, value);

                        if (searchThrottleTimer) {
                            $timeout.cancel(searchThrottleTimer);
                        }

                        // remove all previous entries to the same search key that was not handled yet
                        changeBuffer = $filter('filter')(changeBuffer, function (change) { return change.key !== key && change.index !== index; });
                        // add new change to list
                        changeBuffer.push({
                            command: command,
                            key: key,
                            index: index,
                            value: value
                        });

                        searchThrottleTimer = $timeout(function () {
                            console.log('searchThrottleTimer: ', searchThrottleTimer);
                            console.log('changeBuffer: ', JSON.stringify(changeBuffer));

                            angular.forEach(changeBuffer, function (change) {
                                console.log('changeBuffer change: ', change);
                                var searchParam = $filter('filter')($scope.parameters, function (param) { return param.key === key; })[0];

                                console.log('searchThrottleTimer searchParam: ', searchParam);

                                if (searchParam && searchParam.allowMultiple) {

                                    console.log('Running searchParam.allowMultiple change: ', change);
                                    // $scope.model.push(change);
                                    delete change.command;
                                    $scope.model.splice(change.index, 1, change);

                                    /*
                                    if (!angular.isArray($scope.model[change.key])) {
                                        $scope.model[change.key] = [];
                                    }

                                    if (change.command === 'delete') {
                                        $scope.model[change.key].splice(change.index, 1);
                                        if ($scope.model[change.key].length === 0) {
                                            delete $scope.model[change.key];
                                        }
                                    } else {
                                        $scope.model[change.key][change.index] = change.value;
                                    }
                                    */
                                } else {
                                    if (change.command === 'delete') {
                                        delete $scope.model[change.key];
                                    }
                                    else {
                                        $scope.model[change.key] = change.value;
                                    }
                                }
                            });

                            changeBuffer.length = 0;

                            $scope.$emit('advanced-searchbox:modelUpdated', $scope.model);

                        }, $scope.searchThrottleTime);
                    }

                    function getCurrentCaretPosition(input) {
                        console.log('Running getCurrentCaretPosition');
                        if (!input) {
                            return 0;
                        }

                        try {
                            // Firefox & co
                            if (typeof input.selectionStart === 'number') {
                                return input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;
                            } else if (document.selection) {// IE
                                input.focus();
                                var selection = document.selection.createRange();
                                var selectionLength = document.selection.createRange().text.length;
                                selection.moveStart('character', -input.value.length);
                                return selection.text.length - selectionLength;
                            }
                        } catch(err) {
                            // selectionStart is not supported by HTML 5 input type, so just ignore it
                        }

                        return 0;
                    }
                }
            ]
        };
    })
    .directive('setFocusOn', [
        function() {
            return {
                restrict: 'A',
                link: function($scope, $element, $attrs) {
                    return $scope.$on('advanced-searchbox:setFocusOn', function(e, id) {
                        // console.log('setFocusOn e: ', e);
                        console.log('setFocusOn id: ', id);
                        if ($scope.isSpacebarKey === true) {
                            $scope.isSpacebarKey = false;
                            e.preventDefault();
                            return;
                        }
                        if (id === $attrs.setFocusOn) {
                            return $element[0].focus();
                        }
                    });
                }
            };
        }
    ])
    .factory('setFocusFor', [ '$rootScope', '$timeout', function($rootScope, $timeout) {
            return function(id) {
                return $timeout(function() {
                    // console.log('Running setFocusFor id: ', id);
                    return $rootScope.$broadcast('advanced-searchbox:setFocusOn', id);
                });
            };
        }
    ])
    .directive('nitAutoSizeInput', [ '$timeout', function($timeout) {
            return {
                restrict: 'A',
                scope: {
                    model: '=ngModel'
                },
                link: function($scope, $element, $attrs) {
                    var supportedInputTypes = ['text', 'search', 'tel', 'url', 'email', 'password', 'number'];


                    var container = angular.element('<div style="position: fixed; top: -9999px; left: 0px;"></div>');
                    var shadow = angular.element('<span style="white-space:pre;"></span>');

                    var maxWidth = $element.css('maxWidth') === 'none' ? $element.parent().innerWidth() : $element.css('maxWidth');
                    $element.css('maxWidth', maxWidth);

                    angular.forEach([
                        'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
                        'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
                        'boxSizing', 'borderLeftWidth', 'borderRightWidth', 'borderLeftStyle', 'borderRightStyle',
                        'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight'
                    ], function(css) {
                        shadow.css(css, $element.css(css));
                    });

                    angular.element('body').append(container.append(shadow));

                    function resize() {
                        $timeout(function() {
                            if (supportedInputTypes.indexOf($element[0].type || 'text') === -1) {
                                return;
                            }

                            shadow.text($element.val() || $element.attr('placeholder'));
                            $element.css('width', shadow.outerWidth() + 10);
                        });
                    }

                    resize();

                    if ($scope.model) {
                        $scope.$watch('model', function() { resize(); });
                    } else {
                        $element.on('keypress keyup keydown focus input propertychange change', function() { resize(); });
                    }
                }
            };
        }
    ])
    .filter('toString', function() {
        return function(input, customToString) {
            customToString = customToString || String;
            var returnValue = customToString(input);
            return returnValue;
        };
    });
})();
