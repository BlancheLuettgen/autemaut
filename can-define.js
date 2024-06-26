"use strict";
"format cjs";


var event = require("can-event");
var eventLifecycle = require("can-event/lifecycle/lifecycle");
var canBatch = require("can-event/batch/batch");

var compute = require("can-compute");
var ObserveInfo = require("can-observe-info");

var canEach = require("can-util/js/each/each");
var isEmptyObject = require("can-util/js/is-empty-object/is-empty-object");
var assign = require("can-util/js/assign/assign");
var dev = require("can-util/js/dev/dev");
var CID = require("can-util/js/cid/cid");
var isPlainObject = require("can-util/js/is-plain-object/is-plain-object");
var isArray = require("can-util/js/is-array/is-array");
var types = require("can-util/js/types/types");

var behaviors, eventsProto, getPropDefineBehavior, define,
	make, makeDefinition, replaceWith, getDefinitionsAndMethods,
	isDefineType, getDefinitionOrMethod;

module.exports = define = function(objPrototype, defines) {
	// default property definitions on _data
	var dataInitializers = {},
		// computed property definitions on _computed
		computedInitializers = {};

	var result = getDefinitionsAndMethods(defines);

	// Goes through each property definition and creates
	// a `getter` and `setter` function for `Object.defineProperty`.
	canEach(result.definitions, function(definition, property){
		define.property(objPrototype, property, definition, dataInitializers, computedInitializers);
	});

	// Places a `_data` on the prototype that when first called replaces itself
	// with a `_data` object local to the instance.  It also defines getters
	// for any value that has a default value.
	replaceWith(objPrototype, "_data", function() {
		var map = this;
		var data = {};
		for (var prop in dataInitializers) {
			replaceWith(data, prop, dataInitializers[prop].bind(map), true);
		}
		return data;
	});

	// Places a `_computed` on the prototype that when first called replaces itself
	// with a `_computed` object local to the instance.  It also defines getters
	// that will create the property's compute when read.
	replaceWith(objPrototype, "_computed", function() {
		var map = this;
		var data = {};
		for (var prop in computedInitializers) {
			replaceWith(data, prop, computedInitializers[prop].bind(map));
		}
		return data;
	});


	// Add necessary event methods to this object.
	for (var prop in eventsProto) {
		Object.defineProperty(objPrototype, prop, {
			enumerable: false,
			value: eventsProto[prop],
			configurable: true,
			writable: true
		});
	}


	return result;
};

define.property = function(objPrototype, prop, definition, dataInitializers, computedInitializers) {

	var type = definition.type;
	delete definition.type;

	// Special case definitions that have only `type: "*"`.
	if (type && isEmptyObject(definition) && type === define.types["*"]) {
		definition.type = type;
		Object.defineProperty(objPrototype, prop, {
			get: make.get.data(prop),
			set: make.set.events(prop, make.get.data(prop), make.set.data(prop), make.eventType.data(prop)),
			enumerable: true
		});
		return;
	}
	definition.type = type;

	// Where the value is stored.  If there is a `get` the source of the value
	// will be a compute in `this._computed[prop]`.  If not, the source of the
	// value will be in `this._data[prop]`.
	var dataProperty = definition.get ? "computed" : "data",

		// simple functions that all read/get/set to the right place.
		// - reader - reads the value but does not observe.
		// - getter - reads the value and notifies observers.
		// - setter - sets the value.
		reader = make.read[dataProperty](prop),
		getter = make.get[dataProperty](prop),
		setter = make.set[dataProperty](prop),
		getInitialValue;


	// Determine the type converter
	var typeConvert = function(val) {
		return val;
	};

	if (definition.Type) {
		typeConvert = make.set.Type(prop, definition.Type, typeConvert);
	}
	if (type) {
		typeConvert = make.set.type(prop, type, typeConvert);
	}

	// Determine a function that will provide the initial property value.
	if ((definition.value !== undefined || definition.Value !== undefined)) {
		getInitialValue = make.get.defaultValue(prop, definition, typeConvert);
	}
	// If property has a getter, create the compute that stores its data.
	if (definition.get) {
		computedInitializers[prop] = make.compute(prop, definition.get, getInitialValue);
	}
	// If the property isn't a getter, but has an initial value, setup a
	// default value on `this._data[prop]`.
	else if (getInitialValue) {
		dataInitializers[prop] = getInitialValue;
	}


	// Define setter behavior.

	// If there's a `get` and `set`, make the setter get the `lastSetValue` on the
	// `get`'s compute.
	if (definition.get && definition.set) {
		setter = make.set.setter(prop, definition.set, make.read.lastSet(prop), setter, true);
	}
	// If there's a `set` and no `get`,
	else if (definition.set) {
		// make a set that produces events.
		setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop));
		// Add `set` functionality to the setter.
		setter = make.set.setter(prop, definition.set, reader, setter, false);
	}
	// If there's niether `set` or `get`,
	else if (!definition.get) {
		// make a set that produces events.
		setter = make.set.events(prop, reader, setter, make.eventType[dataProperty](prop));
	}

	// Add type behavior to the setter.
	if (definition.Type) {
		setter = make.set.Type(prop, definition.Type, setter);
	}
	if (type) {
		setter = make.set.type(prop, type, setter);
	}
	// Define the property.
	Object.defineProperty(objPrototype, prop, {
		get: getter,
		set: setter,
		enumerable: "serialize" in definition ? !!definition.serialize : !definition.get
	});
};


// Makes a simple constructor function.
define.Constructor = function(defines) {
	var constructor = function(props) {
		define.setup.call(this, props);
	};
	define(constructor.prototype, defines);
	return constructor;
};

// A bunch of helper functions that are used to create various behaviors.
make = {
	// Returns a function that creates the `_computed` prop.
	compute: function(prop, get, defaultValue) {
		return function() {
			var map = this;
			return {
				compute: compute.async(defaultValue && defaultValue(), get, map),
				count: 0,
				handler: function(ev, newVal, oldVal) {
					canBatch.trigger.call(map, {
						type: prop,
						target: map
					}, [newVal, oldVal]);
				}
			};
		};
	},
	// Set related helpers.
	set: {
		data: function(prop) {
			return function(newVal) {
				this._data[prop] = newVal;
			};
		},
		computed: function(prop) {
			return function(val) {
				this._computed[prop].compute(val);
			};
		},
		events: function(prop, getCurrent, setData, eventType) {
			return function(newVal) {
				var current = getCurrent.call(this);
				if (newVal !== current) {
					setData.call(this, newVal);

					canBatch.trigger.call(this, {
						type: prop,
						target: this
					}, [newVal, current]);
				}
			};
		},
		setter: function(prop, setter, getCurrent, setEvents, hasGetter) {
			return function(value) {
				//!steal-remove-start
				var asyncTimer;
				//!steal-remove-end

				var self = this;

				// call the setter, if returned value is undefined,
				// this means the setter is async so we
				// do not call update property and return right away

				canBatch.start();
				var setterCalled = false,
					current = getCurrent.call(this),
					setValue = setter.call(this, value, function(value) {
						setEvents.call(self, value);

						setterCalled = true;
						//!steal-remove-start
						clearTimeout(asyncTimer);
						//!steal-remove-end
					}, current);

				if (setterCalled) {
					canBatch.stop();
				} else {
					if (hasGetter) {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							if (current !== setValue) {
								setEvents.call(this, setValue);
							}
							canBatch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							canBatch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we have a getter, and undefined was returned,
							// we should assume this is setting the getters properties
							// and we shouldn't do anything.
							canBatch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, dev.warnTimeout);
							//!steal-remove-end
							canBatch.stop();
							return;
						}
					} else {
						// we got a return value
						if (setValue !== undefined) {
							// if the current `set` value is returned, don't set
							// because current might be the `lastSetVal` of the internal compute.
							setEvents.call(this, setValue);
							canBatch.stop();
						}
						// this is a side effect, it didn't take a value
						// so use the original set value
						else if (setter.length === 0) {
							setEvents.call(this, value);
							canBatch.stop();
							return;
						}
						// it took a value
						else if (setter.length === 1) {
							// if we don't have a getter, we should probably be setting the
							// value to undefined
							setEvents.call(this, undefined);
							canBatch.stop();
						}
						// we are expecting something
						else {
							//!steal-remove-start
							asyncTimer = setTimeout(function() {
								dev.warn('can/map/setter.js: Setter "' + prop + '" did not return a value or call the setter callback.');
							}, dev.warnTimeout);
							//!steal-remove-end
							canBatch.stop();
							return;
						}
					}


				}
			};
		},
		type: function(prop, type, set) {


			if (typeof type === "object") {

				var SubType = define.Constructor(type);

				return function(newValue) {
					if (newValue instanceof SubType) {
						return set.call(this, newValue);
					} else {
						return set.call(this, new SubType(newValue));
					}
				};

			} else {
				return function(newValue) {
					return set.call(this, type.call(this, newValue, prop));
				};
			}
		},
		Type: function(prop, Type, set) {
			// `type`: {foo: "string"}
			if (typeof Type === "object") {
				Type = define.constructor(Type);
			}
			return function(newValue) {
				if (newValue instanceof Type) {
					return set.call(this, newValue);
				} else {
					return set.call(this, new Type(newValue));
				}
			};
		}
	},
	// Helpes that indicate what the event type should be.  These probably aren't needed.
	eventType: {
		data: function(prop) {
			return function(newVal, oldVal) {
				return oldVal !== undefined || this._data.hasOwnProperty(prop) ? "set" : "add";
			};
		},
		computed: function() {
			return function() {
				return "set";
			};
		}
	},
	// Helpers that read the data in a non-observable way.
	read: {
		data: function(prop) {
			return function() {
				return this._data[prop];
			};
		},
		computed: function(prop) {
			// might want to protect this
			return function() {
				return this._computed[prop].compute();
			};
		},
		lastSet: function(prop) {
			return function() {
				return this._computed[prop].compute.computeInstance.lastSetValue.get();
			};
		}
	},
	// Helpers that read the data in an observable way.
	get: {
		// uses the default value
		defaultValue: function(prop, definition, typeConvert) {
			return function() {
				var value = definition.value;
				if (value !== undefined) {
					if (typeof value === "function") {
						value = value.call(this);
					}
					return typeConvert(value);
				}
				var Value = definition.Value;
				if (Value) {
					return typeConvert(new Value());
				}
			};
		},
		data: function(prop) {
			return function() {
				ObserveInfo.observe(this, prop);
				return this._data[prop];
			};
		},
		computed: function(prop) {
			return function() {
				return this._computed[prop].compute();
			};
		}
	}
};

behaviors = ["get", "set", "value", "Value", "type", "Type", "serialize"];

// gets a behavior for a definition or from the defaultDefinition
getPropDefineBehavior = function(behaviorName, prop, def, defaultDefinition) {
	if(behaviorName in def) {
		return def[behaviorName];
	} else {
		return defaultDefinition[behaviorName];
	}
};
// makes a full definition, using the defaultDefinition
makeDefinition = function(prop, def, defaultDefinition) {
	var definition = {};
	behaviors.forEach(function(behavior) {
		var behaviorDef = getPropDefineBehavior(behavior, prop, def, defaultDefinition);
		if (behaviorDef !== undefined) {
			if(behavior === "type" && typeof behaviorDef === "string") {
				behaviorDef = define.types[behaviorDef];
			}
			definition[behavior] = behaviorDef;
		}
	});
	if( isEmptyObject(definition) ) {
		definition.type = define.types["*"];
	}
	return definition;
};



getDefinitionOrMethod = function(prop, value, defaultDefinition){
	var definition;
	if(typeof value === "string") {
		definition = {type: value};
	}
	else if(typeof value === "function") {
		if(types.isConstructor(value)) {
			definition = {Type: value};
		} else if(isDefineType(value)) {
			definition = {type: value};
		}
	} else if(isPlainObject(value)){
		definition = value;
	}
	if(definition) {
		return makeDefinition(prop, definition, defaultDefinition);
	} else {
		return value;
	}
};
getDefinitionsAndMethods = function(defines) {
	var definitions = {};
	var methods = {};
	// first lets get a default if it exists
	var defaults = defines["*"],
		defaultDefinition;
	if(defaults) {
		delete defines["*"];
		defaultDefinition = getDefinitionOrMethod("*", defaults, {});
	} else {
		defaultDefinition = {};
	}

	canEach(defines, function(value, prop) {
		if(prop === "constructor") {
			methods[prop] = value;
			return;
		} else {
			var result = getDefinitionOrMethod(prop, value, defaultDefinition);
			if(result && typeof result === "object") {
				definitions[prop] = result;
			} else {
				methods[prop] = result;
			}
		}
	});
	if(defaults) {
		defines["*"] = defaults;
	}
	return {definitions: definitions, methods: methods, defaultDefinition: defaultDefinition};
};

replaceWith = function(obj, prop, cb, writable) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		get: function() {
			var value = cb.call(this, obj, prop);
			Object.defineProperty(this, prop, {
				value: value,
				writable: !!writable
			});
			return value;
		}
	});
};

eventsProto = assign({}, event);
assign(eventsProto, {
	_eventSetup: function() {},
	_eventTeardown: function() {},
	addEventListener: function(eventName, handler) {

		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding && computedBinding.compute) {
			if (!computedBinding.count) {
				computedBinding.count = 1;
				computedBinding.compute.addEventListener("change", computedBinding.handler);
			} else {
				computedBinding.count++;
			}

		}

		return eventLifecycle.addAndSetup.apply(this, arguments);
	},

	// ### unbind
	// Stops listening to an event.
	// If this is the last listener of a computed property,
	// stop forwarding events of the computed property to this map.
	removeEventListener: function(eventName, handler) {
		var computedBinding = this._computed && this._computed[eventName];
		if (computedBinding) {
			if (computedBinding.count === 1) {
				computedBinding.count = 0;
				computedBinding.compute.removeEventListener("change", computedBinding.handler);
			} else {
				computedBinding.count--;
			}

		}

		return eventLifecycle.removeAndTeardown.apply(this, arguments);

	},
	props: function() {
		var obj = {};
		for (var prop in this) {
			obj[prop] = this[prop];
		}
		return obj;
	}
});
eventsProto.on = eventsProto.bind = eventsProto.addEventListener;
eventsProto.off = eventsProto.unbind = eventsProto.removeEventListener;

delete eventsProto.one;

var defineConfigurableAndNotEnumerable = function(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		configurable: true,
		enumerable: false,
		writable: true,
		value: value
	});
};

define.setup = function(props, sealed) {
	defineConfigurableAndNotEnumerable(this, "_cid");
	defineConfigurableAndNotEnumerable(this, "__bindEvents", {});
	defineConfigurableAndNotEnumerable(this, "_bindings", 0);
	/* jshint -W030 */
	CID(this);
	assign(this, props);
	// only seal in dev mode for performance reasons.
	//!steal-remove-start
	this._data;
	this._computed;
	if(sealed !== false) {
		Object.seal(this);
	}
	//!steal-remove-end
};
define.replaceWith = replaceWith;
define.eventsProto = eventsProto;
define.defineConfigurableAndNotEnumerable = defineConfigurableAndNotEnumerable;
define.make = make;
define.getDefinitionOrMethod = getDefinitionOrMethod;

isDefineType = function(func){
	return func && func.canDefineType === true;
};

define.types = {
	'date': function(str) {
		var type = typeof str;
		if (type === 'string') {
			str = Date.parse(str);
			return isNaN(str) ? null : new Date(str);
		} else if (type === 'number') {
			return new Date(str);
		} else {
			return str;
		}
	},
	'number': function(val) {
		if (val == null) {
			return val;
		}
		return +(val);
	},
	'boolean': function(val) {
		if (val === 'false' || val === '0' || !val) {
			return false;
		}
		return true;
	},
	'stringOrObservable': function(newVal) {
		if(isArray(newVal)) {
			return new types.DefaultList(newVal);
		}
		else if(isPlainObject(newVal)) {
			return new types.DefaultMap(newVal);
		}
		else {
			return define.types.string(newVal);
		}
	},
	/**
	 * Implements HTML-style boolean logic for attribute strings, where
	 * any string, including "", is truthy.
	 */
	'htmlbool': function(val) {
		return typeof val === "string" || !!val;
	},
	'*': function(val) {
		return val;
	},
	'any': function(val) {
		return val;
	},
	'string': function(val) {
		if (val == null) {
			return val;
		}
		return '' + val;
	},

	'compute': {
		set: function(newValue, setVal, setErr, oldValue) {
			if (newValue.isComputed) {
				return newValue;
			}
			if (oldValue && oldValue.isComputed) {
				oldValue(newValue);
				return oldValue;
			}
			return newValue;
		},
		get: function(value) {
			return value && value.isComputed ? value() : value;
		}
	}
};
