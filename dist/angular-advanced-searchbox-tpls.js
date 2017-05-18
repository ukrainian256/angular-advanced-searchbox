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
                    $scope.model = $scope.model || [];
                    $scope.parameters = $scope.parameters || [];
                    $scope.filteredArr = [];
                    $scope.parametersLabel = $scope.parametersLabel || 'Search Suggestions';
                    $scope.parametersDisplayLimit = $scope.parametersDisplayLimit || 8;
                    $scope.placeholder = $scope.placeholder || 'Search ...';
                    $scope.searchThrottleTime = $scope.searchThrottleTime || 250;
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

                    /*
                    $scope.$watch('model', function (newValue, oldValue) {

                        if (angular.equals(newValue, oldValue)) {
                            return;
                        }

                    }, true); // END WATCH MODEL
                    */

                    $scope.resetFilteredArr = function() {
                        $scope.filteredArr = angular.copy($scope.parameters);
                    };

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
                        console.log('Running $scope.searchQueryTypeaheadOnSelect DELETE: ', item, model, label);
                        $scope.addSearchParam(item);
                        $scope.searchQuery = '';
                        $scope.resetFilteredArr();
                        updateModel('delete', 'query', 0);
                    };

                    // EDITMODE
                    $scope.searchParamTypeaheadOnSelect = function (suggestedValue, searchParam) {
                        console.log('searchParamTypeaheadOnSelect - suggestedValue, searchParam: ', suggestedValue, searchParam);
                        searchParam.value = suggestedValue;
                        $scope.searchParamValueChanged(searchParam);
                    };

                    $scope.addSearchParam = function (searchParam, value, enterEditModel) {

                        console.log('Running addSearchParam - searchParam, value, enterEditModel: ', searchParam, value, enterEditModel);

                        if (enterEditModel === undefined) {
                            enterEditModel = true;
                        }

                        var internalIndex = $scope.model.length;

                        var newIndex =
                            $scope.searchParams.push(
                                {
                                    key: searchParam.key,
                                    name: searchParam.name,
                                    type: searchParam.type || 'text',
                                    placeholder: searchParam.placeholder,
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

                    // @TODO
                    $scope.keyup = function(e, searchParamIndex) {

                        var searchVal = $scope.searchQuery;
                        var key = e.which || e.keyCode || e.charCode;

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
                            // searchVal = searchVal + String.fromCharCode(key).toLowerCase();
                            searchVal = searchVal.toLowerCase();
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

                            angular.forEach(changeBuffer, function (change) {

                                var searchParam = $filter('filter')($scope.parameters, function (param) { return param.key === key; })[0];

                                // console.log('DISPLAY changeBuffer change: ', change);
                                // console.log('changeBuffer searchParam: ', searchParam);

                                if (change.key === 'query' && change.command === 'change') {
                                    // console.log('changeBuffer change.key: ', change.key);
                                }
                                else if (change.key === 'query' && change.command === 'delete') {
                                    var queryIndex2 = $scope.model.map(function(o) {
                                        return o.key;
                                    });
                                    var queryIndex = queryIndex2.indexOf(change.key);
                                    // console.log('changeBuffer change.key: ', change.key);
                                    // console.log('changeBuffer queryIndex2: ', queryIndex2);
                                    // console.log('changeBuffer queryIndex: ', queryIndex);
                                    if (queryIndex > -1) {
                                        $scope.model.splice(queryIndex, 1);
                                    }
                                    $scope.searchQuery = '';
                                    return;
                                }
                                else if (change.command === 'delete') {
                                    var index2 = $scope.model.map(function(o) {
                                        return o.index;
                                    });
                                    var index = index2.indexOf(change.index);
                                    // console.log('changeBuffer change.index: ', change.index);
                                    // console.log('changeBuffer index2: ', index2);
                                    // console.log('changeBuffer index: ', index);
                                    if (index > -1) {
                                        $scope.model.splice(index, 1);
                                    }
                                }
                                else if (change.value === undefined || change.value === '') {
                                    // $timeout.cancel(searchThrottleTimer);
                                    return;
                                }
                                else {
                                    delete change.command;
                                    $scope.model.splice(change.index, 1, change);
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

angular.module('angular-advanced-searchbox').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('angular-advanced-searchbox.html',
    "<div class=advancedSearchBox ng-class={active:focus} ng-init=\"focus = false\" ng-click=\"!focus ? setFocusFor('searchbox') : null\"><span ng-show=\"searchParams.length < 1 && searchQuery.length === 0\" class=\"search-icon glyphicon glyphicon-search\"></span> <a ng-href=\"\" ng-show=\"searchParams.length > 0 || searchQuery.length > 0\" ng-click=removeAll() role=button><span class=\"remove-all-icon glyphicon glyphicon-trash\"></span></a><div class=\"searchBox clearfix\"><div class=search-parameter ng-repeat=\"searchParam in searchParams\"><a ng-href=\"\" ng-click=removeSearchParam($index) role=button>&times;</a><div class=key ng-show=\"searchParam.type !== 'operator'\" data-key={{searchParam.key}} data-type={{searchParam.type}} ng-click=\"enterEditMode($event, $index)\">{{searchParam.name}}:</div><div class=value><span ng-show=!searchParam.editMode ng-click=\"enterEditMode($event, $index)\">{{searchParam.value | toString:searchParam.suggestedToString}}</span> <input name=value type={{searchParam.type}} nit-auto-size-input set-focus-on=\"{{'searchParam:' + searchParam.key}}\" ng-keydown=\"keydown($event, $index)\" ng-blur=\"maybeLeaveEditMode($event, $index)\" ng-show=searchParam.editMode ng-change=\"searchParam.restrictToSuggestedValues !== true ? searchParamValueChanged(searchParam) : null\" ng-model=searchParam.value uib-typeahead=\"suggestedValue as suggestedValue.name for suggestedValue in searchParam.suggestedValues | filter:$viewValue\" typeahead-min-length=0 typeahead-on-select=\"searchParamTypeaheadOnSelect($item, searchParam)\" typeahead-editable=\"searchParam.restrictToSuggestedValues !== true\" typeahead-select-on-exact=true typeahead-select-on-blur=\"searchParam.restrictToSuggestedValues !== true ? false : true\" placeholder={{searchParam.placeholder}} ng-click=\"enterEditMode($event, $index)\" ng-trim=\"false\"></div></div><div class=search-entry uib-dropdown is-open=status.isopen><input autocomplete=off uib-dropdown-toggle name=searchbox class=search-parameter-input nit-auto-size-input set-focus-on=searchbox ng-keydown=keydown($event) ng-keyup=keyup($event) placeholder={{placeholder}} ng-focus=\"focus = true\" ng-blur=\"focus = false\" xxx-uib-typeahead=\"parameter as parameter.name for parameter in parameters | filter:isUnusedParameter | filter:{name:$viewValue} | limitTo:parametersDisplayLimit\" xxx-typeahead-on-select=\"searchQueryTypeaheadOnSelect($item, $model, $label)\" ng-change=searchQueryChanged(searchQuery) ng-model=\"searchQuery\"><ul class=dropdown-menu uib-dropdown-menu role=menu><li><a href=\"\" ng-click=\"\" class=\"btn btn-primary\" style=\"margin-left: 4px; margin-right: 4px; color: #fff; margin-bottom: 4px\"><i class=\"glyphicon glyphicon-search\"></i> Search</a></li><li ng-repeat=\"parameter in filteredArr\" xxx-ng-show=!facetSelected><a ng-click=searchQueryTypeaheadOnSelect(parameter) ng-show=!isMatchLabel(parameter.label)>{{ parameter.name }}</a> <a ng-click=searchQueryTypeaheadOnSelect(parameter) ng-show=isMatchLabel(parameter.label)>{{ parameter.label[0] }}<span class=match>{{ parameter.label[1] }}</span>{{ parameter.label[2] }}</a></li><li class=hide ng-repeat=\"parameter in filteredArr\" xxx-ng-show=facetSelected><a ng-click=\"optionClicked($index, $event, parameter)\" ng-show=!isMatchLabel(parameter)>{{ parameter.name }}</a> <a ng-click=\"optionClicked($index, $event, option.key)\" ng-show=isMatchLabel(option.label)>{{ parameter.label[0] }}<span class=match>{{ parameter.label[1] }}</span>{{ parameter.label[2] }}</a></li><li class=divider></li><li><a href=\"\">Reset filters</a></li></ul></div></div><div class=\"search-parameter-suggestions clearfix\" xxx-ng-show=\"parameters && focus\"><span class=title>{{parametersLabel}}:</span> <span class=search-parameter ng-repeat=\"param in parameters | filter:isUnusedParameter | limitTo:parametersDisplayLimit\" data-key={{param.key}} ng-mousedown=addSearchParam(param)>{{param.name}}</span></div><div class=\"small hide\"><strong>parameters:</strong> {{ parameters | json }}<br><strong>filteredArr</strong>: {{filteredArr | json }}<br><strong>searchQuery:</strong> {{searchQuery | json }}<br><strong>searchParams</strong><br>LENGTH: {{searchParams.length}}<br>CONTENT {{searchParams | json}}</div></div>"
  );

}]);
