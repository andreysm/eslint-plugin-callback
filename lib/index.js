/**
 * @fileoverview Check callbacks are called
 * @author biga
 */
"use strict";

//------------------------------------------------------------------------------
// Plugin Definition
//------------------------------------------------------------------------------

var verbose = false;

// import all rules in lib/rules
module.exports.rules = {
	"callback": function(context) {
		
		var funcInfoStack = [];
		var segmentInfoMap = {};
		var checkedCalls = {};
		
		function last(arr) {
			if (arr.length === 0) {
				return null;
			}
			return arr[arr.length - 1];
		}
		
		function SetPathCalled(codePath, node) {
			if (verbose) { console.log("SetPathCalled", codePath.id, node.loc.start, node.type); }
			codePath.currentSegments.forEach(function(segment) {
				var info = segmentInfoMap[segment.id];
				if (!info) {
					if (verbose) { console.log("SetPathCalled: no segment info!", codePath.id, node.loc.start, node.type); }
					return;
				}
				if (verbose) { console.log("SetPathCalled: segment", segment.id); }
				if (info.cbCalledLast) {
					context.report({
						message: "Callback `{{cbName}}' is already called here: line: {{line}}, column: {{column}}",
						data: {cbName: last(funcInfoStack).cbName, line: info.cbCalledLast.line, column: info.cbCalledLast.column},
						node: node,
					});
				} else {
					info.cbCalledLast = node.loc.start;
				}
				info.cbCalledAll = true;
			});
		}
		
		return {
			"onCodePathStart": function(codePath, node) {
				if (verbose) { console.log("onCodePathStart", codePath.id, node.loc.start, node.type); }
				
				var cb_name = null;
				if (node.type.indexOf("Function") !== -1) {
					for (var i in node.params) { // Check if the function has 'callback' parameter.
						var arg = node.params[i];
						if (arg.type === "Identifier") {
							if (arg.name.match(/^_?(callback)_?$/i)) {
								if (cb_name) {
									context.report({
										message: "More than one callback in function params: {{cbName}} {{name}}",
										data: { cbName: cb_name, name: arg.name},
										node: node
									});
								}
								cb_name = arg.name;
							}
						}
						else if (arg.type === "RestElement") { // Это типа (...args)
							// ignore
						}
						else {
							context.report({
								message: "Unexpected param: {{arg_type}}",
								data: { arg_type: arg.type },
								node: node
							});
						}
					}
				}
				
				var parentCb = null;
				if (funcInfoStack.length > 0) {
					parentCb = last(funcInfoStack).cbName;
				}
				
				funcInfoStack.push({
					codePath: codePath,
					cbName: cb_name,
					hasCb: (cb_name !== null)
				});
				
				if (!cb_name && (node.type == "FunctionExpression" || node.type == "ArrowFunctionExpression") && funcInfoStack.length >= 2) {
					var hidden = context.getDeclaredVariables(node).some(function(v) {
						return v.name === parentCb;
					});
					if (!hidden) {
						last(funcInfoStack).cbName = parentCb;
						last(funcInfoStack).hasCb = false;
					}
				}
			},
			
			"onCodePathEnd": function(codePath, node) {
				if (verbose) { console.log("onCodePathEnd", codePath.id, node.loc.start, node.type); }
				
				var funcInfo = last(funcInfoStack);
				funcInfoStack.pop();
				
				// Checks `cb` was called in every paths.
				var failed_node = null;
				var cbCalled = codePath.finalSegments.every(function(segment) {
					var info = segmentInfoMap[segment.id];
					if (!info.cbCalledAll) {
						failed_node = info.end_node;
					}
					return info.cbCalledAll;
				});

				if (cbCalled && !funcInfo.hasCb) {
					if (funcInfo.codePath.upper && node.parent) {
						if (node.parent.type == "CallExpression") {
							var call_id = node.parent.start;
							if (!checkedCalls[call_id]) {
								checkedCalls[call_id] = true;
								SetPathCalled(funcInfo.codePath.upper, node);
							}
						}
					}
				}

				if (!cbCalled && funcInfo.hasCb) {
					context.report({
						message: "`{{cbName}}` should be called in every path.",
						data: { cbName: funcInfo.cbName },
						node: (failed_node || node)
					});
				}
			},

			// Manages state of code paths.
			"onCodePathSegmentStart": function(segment, node) {
				if (verbose) { console.log("onCodePathSegmentStart", segment.id, node.loc.start, node.type); }
				
				// Initialize state of this path.
				var info = segmentInfoMap[segment.id] = {
					cbCalledLast: false, // was ever called (to avoid calling callback twice)
					cbCalledAll: false // was called in every path
				};
				
				info.start_node = node;
				
				// If there are the previous paths, merges state.
				// Checks `cb` was called in every previous path.
				if (segment.prevSegments.length > 0) {
					if (node.type !== 'CatchClause') {
						var last = segment.prevSegments.find(function(segment) {
							var info = segmentInfoMap[segment.id];
							return info.cbCalledLast;
						});
						if (last) {
							info.cbCalledLast = segmentInfoMap[last.id].cbCalledLast;
						}
					}
					info.cbCalledAll = segment.prevSegments.every(function(prev) {
						if (verbose) { console.log(" ".repeat(v_indent), prev.id, "is prev for", segment.id); }
						var info = segmentInfoMap[prev.id];
						return info.cbCalledAll;
					});
				}
			},
			
			"onCodePathSegmentEnd": function(segment, node) {
				if (verbose) { console.log("onCodePathSegmentEnd", segment.id, node.loc.start, node.type); }
				
				var info = segmentInfoMap[segment.id];
				info.end_node = node;
			},

			// Checks reachable or not.
			"CallExpression": function(node) {
				var funcInfo = last(funcInfoStack);
				
				if (verbose) { console.log("CallExpression", node.loc.start, node.type); }
				
				// Ignores if `cb` doesn't exist.
				if (!funcInfo.cbName) {
					return;
				}

				// Sets marks that `cb` was called.
				var callee = node.callee;
				if (callee.type === "Identifier" && callee.name === funcInfo.cbName) {
					SetPathCalled(funcInfo.codePath, node);
					return;
				}
				node.arguments.some(function(arg) {
					if (arg.type === "Identifier" && arg.name === funcInfo.cbName) {
						SetPathCalled(funcInfo.codePath, node);
						return true;
					}
					if (arg.type === "FunctionExpression" || arg.type === "ArrowFunctionExpression") {
						//~
					}
				});
			}
		};
	},
};
