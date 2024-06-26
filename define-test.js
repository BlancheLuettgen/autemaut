var QUnit = require("steal-qunit");
var compute = require("can-compute");
var define = require("can-define");
var stache = require("can-stache");
var CanList = require("can-list");
var canBatch = require("can-event/batch/batch");

var isArray = require("can-util/js/is-array/is-array");

QUnit.module("can-define");

QUnit.test("basics on a prototype", 5, function() {

	var Person = function(first, last) {
		this.first = first;
		this.last = last;
	};
	define(Person.prototype, {
		first: "*",
		last: "*",
		fullName: {
			get: function() {
				return this.first + " " + this.last;
			}
		}
	});

	var p = new Person("Mohamed", "Cherif");

	p.bind("fullName", function(ev, newVal, oldVal) {
		QUnit.equal(oldVal, "Mohamed Cherif");
		QUnit.equal(newVal, "Justin Meyer");
	});

	equal(p.fullName, "Mohamed Cherif", "fullName initialized right");

	p.bind("first", function(el, newVal, oldVal) {
		QUnit.equal(newVal, "Justin", "first new value");
		QUnit.equal(oldVal, "Mohamed", "first old value");
	});

	canBatch.start();
	p.first = "Justin";
	p.last = "Meyer";
	canBatch.stop();

});

QUnit.test('basics set', 2, function() {
	var Defined = function(prop) {
		this.prop = prop;
	};

	define(Defined.prototype, {
		prop: {
			set: function(newVal) {
				return "foo" + newVal;
			}
		}
	});

	var def = new Defined();
	def.prop = "bar";


	QUnit.equal(def.prop, "foobar", "setter works");

	var DefinedCB = function(prop) {
		this.prop = prop;
	};

	define(DefinedCB.prototype, {
		prop: {
			set: function(newVal, setter) {
				setter("foo" + newVal);
			}
		}
	});

	var defCallback = new DefinedCB();
	defCallback.prop = "bar";
	QUnit.equal(defCallback.prop, "foobar", "setter callback works");

});

QUnit.test("basic type", function() {

	QUnit.expect(6);

	var Typer = function(arrayWithAddedItem, listWithAddedItem) {
		this.arrayWithAddedItem = arrayWithAddedItem;
		this.listWithAddedItem = listWithAddedItem;
	};

	define(Typer.prototype, {
		arrayWithAddedItem: {
			type: function(value) {
				if (value && value.push) {
					value.push("item");
				}
				return value;
			}
		},
		listWithAddedItem: {
			type: function(value) {
				if (value && value.push) {
					value.push("item");
				}
				return value;
			},
			Type: CanList
		}
	});




	var t = new Typer();
	deepEqual(Object.keys(t), [], "no keys");

	var array = [];
	t.arrayWithAddedItem = array;

	deepEqual(array, ["item"], "updated array");
	QUnit.equal(t.arrayWithAddedItem, array, "leave value as array");

	t.listWithAddedItem = [];

	QUnit.ok(t.listWithAddedItem instanceof CanList, "convert to CanList");
	QUnit.equal(t.listWithAddedItem[0], "item", "has item in it");

	compute(function() {
		return t.listWithAddedItem.attr("length");
	}).addEventListener("change", function(ev, newVal) {
		QUnit.equal(newVal, 2, "got a length change");
	});

	t.listWithAddedItem.push("another item");

});

QUnit.test("basic Type", function() {
	var Foo = function(name) {
		this.name = name;
	};
	Foo.prototype.getName = function() {
		return this.name;
	};

	var Typer = function(foo) {
		this.foo = foo;
	};

	define(Typer.prototype, {
		foo: {
			Type: Foo
		}
	});

	var t = new Typer("Justin");
	QUnit.equal(t.foo.getName(), "Justin", "correctly created an instance");

	var brian = new Foo("brian");

	t.foo = brian;

	QUnit.equal(t.foo, brian, "same instances");

});

QUnit.test("type converters", function() {

	var Typer = function(date, string, number, bool, htmlbool, leaveAlone) {
		this.date = date,
			this.string = string,
			this.number = number,
			this.bool = bool,
			this.htmlbool = htmlbool,
			this.leaveAlone = leaveAlone
	};

	define(Typer.prototype, {
		date: {
			type: 'date'
		},
		string: {
			type: 'string'
		},
		number: {
			type: 'number'
		},
		bool: {
			type: 'boolean'
		},
		htmlbool: {
			type: 'htmlbool'
		},
		leaveAlone: {
			type: '*'
		},
	});

	var obj = {};

	var t = new Typer(
		1395896701516,
		5,
		'5',
		'false',
		"",
		obj
	);

	QUnit.ok(t.date instanceof Date, "converted to date");

	QUnit.equal(t.string, '5', "converted to string");

	QUnit.equal(t.number, 5, "converted to number");

	QUnit.equal(t.bool, false, "converted to boolean");

	QUnit.equal(t.htmlbool, true, "converted to htmlbool");

	QUnit.equal(t.leaveAlone, obj, "left as object");

	t.number = '15';

	QUnit.ok(t.number === 15, "converted to number");

});

QUnit.test("basics value", function() {

	var Typer = function(prop) {
		if (prop !== undefined) {
			this.prop = prop;
		}
	};

	define(Typer.prototype, {
		prop: {
			value: 'foo'
		}
	});
	var t = new Typer();

	QUnit.equal(t.prop, "foo", "value is used as default value");

	var Typer2 = function(prop) {
		if (prop !== undefined) {
			this.prop = prop;
		}
	};

	define(Typer2.prototype, {
		prop: {
			value: function() {
				return [];
			},
			type: "*"
		}
	});

	var t1 = new Typer2(),
		t2 = new Typer2();

	QUnit.ok(t1.prop !== t2.prop, "different array instances");
	QUnit.ok(isArray(t1.prop), "its an array");


});

test("basics Value", function() {

	var Typer = function(prop) {
		//this.prop = prop;
	};
	define(Typer.prototype, {

		prop: {
			Value: Array,
			type: "*"
		}

	});

	var t1 = new Typer(),
		t2 = new Typer();
	QUnit.ok(t1.prop !== t2.prop, "different array instances");
	QUnit.ok(isArray(t1.prop), "its an array");


});

test("setter with no arguments and returns undefined does the default behavior, the setter is for side effects only", function() {
	var Typer = function(prop) {
		//this.prop = prop;
	};
	define(Typer.prototype, {

		prop: {
			set: function() {
				this.foo = "bar";
			}
		},
		foo: "*"

	});

	var t = new Typer();

	t.prop = false;

	deepEqual(t.props(), {
		foo: "bar",
		prop: false
	}, "got the right props");

});

test("type happens before the set", 2, function() {

	var Typer = function() {};
	define(Typer.prototype, {

		prop: {
			type: "number",
			set: function(newValue) {
				equal(typeof newValue, "number", "got a number");
				return newValue + 1;
			}
		}

	});

	var map = new Typer();
	map.prop = "5";

	equal(map.prop, 6, "number");
});


test("getter and setter work", function() {
	expect(5);

	var Paginate = define.Constructor({
		limit: "*",
		offset: "*",
		page: {
			set: function(newVal) {
				this.offset = (parseInt(newVal) - 1) * this.limit;
			},
			get: function() {
				return Math.floor(this.offset / this.limit) + 1;
			}
		}
	});

	var p = new Paginate({
		limit: 10,
		offset: 20
	});

	equal(p.page, 3, "page get right");

	p.bind("page", function(ev, newValue, oldValue) {
		equal(newValue, 2, "got new value event");
		equal(oldValue, 3, "got old value event");
	});


	p.page = 2;

	equal(p.page, 2, "page set right");

	equal(p.offset, 10, "page offset set");

});

test("getter with initial value", function() {

	var comp = compute(1);

	var Grabber = define.Constructor({
		vals: {
			type: "*",
			Value: Array,
			get: function(current, setVal) {
				if (setVal) {
					current.push(comp());
				}
				return current;
			}
		}
	});

	var g = new Grabber();
	// This assertion doesn't mean much.  It's mostly testing
	// that there were no errors.
	equal(g.vals.length, 0, "zero items in array");

});

/*
test("value generator is not called if default passed", function () {
	var TestMap = define.Constructor({
		foo: {
			value: function () {
				throw '"foo"\'s value method should not be called.';
			}
		}
	});

	var tm = new TestMap({ foo: 'baz' });

	equal(tm.foo, 'baz');
});*/

test("Value generator can read other properties", function() {
	var Map = define.Constructor({
		letters: {
			value: "ABC"
		},
		numbers: {
			value: [1, 2, 3]
		},
		definedLetters: {
			value: 'DEF'
		},
		definedNumbers: {
			value: [4, 5, 6]
		},
		generatedLetters: {
			value: function() {
				return 'GHI';
			}
		},
		generatedNumbers: {
			value: function() {
				return new CanList([7, 8, 9]);
			}
		},

		// Get prototype defaults
		firstLetter: {
			value: function() {
				return this.letters.substr(0, 1);
			}
		},
		firstNumber: {
			value: function() {
				return this.numbers[0];
			}
		},

		// Get defined simple `value` defaults
		middleLetter: {
			value: function() {
				return this.definedLetters.substr(1, 1);
			}
		},
		middleNumber: {
			value: function() {
				return this.definedNumbers[1];
			}
		},

		// Get defined `value` function defaults
		lastLetter: {
			value: function() {
				return this.generatedLetters.substr(2, 1);
			}
		},
		lastNumber: {
			value: function() {
				return this.generatedNumbers[2];
			}
		}
	});

	var map = new Map();
	var prefix = 'Was able to read dependent value from ';

	equal(map.firstLetter, 'A',
		prefix + 'traditional can.Map style property definition');
	equal(map.firstNumber, 1,
		prefix + 'traditional can.Map style property definition');

	equal(map.middleLetter, 'E',
		prefix + 'define plugin style default property definition');
	equal(map.middleNumber, 5,
		prefix + 'define plugin style default property definition');

	equal(map.lastLetter, 'I',
		prefix + 'define plugin style generated default property definition');
	equal(map.lastNumber, 9,
		prefix + 'define plugin style generated default property definition');
});

test('default behaviors with "*" work for attributes', function() {
	expect(5);
	var DefaultMap = define.Constructor({
		'*': {
			type: 'number',
			set: function(newVal) {
				ok(true, 'set called');
				return newVal;
			}
		},
		someNumber: {
			value: '5'
		},
		number: {}
	});

	var map = new DefaultMap(),
		serializedMap;

	equal(map.someNumber, '5', 'default values are not type converted anymore');
	map.someNumber = '5';
	equal(map.someNumber, 5, 'on a set, they should be type converted');

	map.number = '10'; // Custom set should be called
	equal(map.number, 10, 'value of number should be converted to a number');

});


test("nested define", function() {
	var nailedIt = 'Nailed it';

	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();

	// values are correct
	equal(nested.test.name, nailedIt);
	equal(nested.examples.one.name, nailedIt);
	equal(nested.examples.two.deep.name, nailedIt);

	// objects are correctly instanced
	ok(nested.test instanceof Example);
	ok(nested.examples.one instanceof Example);
	ok(nested.examples.two.deep instanceof Example);
});

test('Can make an attr alias a compute (#1470)', 9, function() {
	var computeValue = compute(1);

	var GetMap = define.Constructor({
		value: {
			set: function(newValue, setVal, oldValue) {
				//debugger;
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
	});

	var getMap = new GetMap();

	getMap.value = computeValue;

	equal(getMap.value, 1, "initial value read from compute");

	var bindCallbacks = 0;

	getMap.bind("value", function(ev, newVal, oldVal) {

		switch (bindCallbacks) {
			case 0:
				equal(newVal, 2, "0 - bind called with new val");
				equal(oldVal, 1, "0 - bind called with old val");
				break;
			case 1:
				equal(newVal, 3, "1 - bind called with new val");
				equal(oldVal, 2, "1 - bind called with old val");
				break;
			case 2:
				equal(newVal, 4, "2 - bind called with new val");
				equal(oldVal, 3, "2 - bind called with old val");
				break;
		}


		bindCallbacks++;
	});

	// Try updating the compute's value
	computeValue(2);

	// Try setting the value of the property
	getMap.value = 3;

	equal(getMap.value, 3, "read value is 3");
	equal(computeValue(), 3, "the compute value is 3");

	// Try setting to a new comptue
	var newComputeValue = compute(4);

	getMap.value = newComputeValue;

});

test('value and get (#1521)', function() {
	// problem here is that previously, can.Map would set `size:1` on
	// the map. This would effectively set the "lastSetValue".

	// in this new version, default values are not set.  They
	// are only present. later.
	// one option is that there's a "read-mode" for last-set.  Until it's
	// been set, it should get it's value from any default value?

	var MyMap = define.Constructor({
		data: {
			value: function() {
				return new CanList(['test']);
			}
		},
		size: {
			value: 1,
			get: function(val) {
				var list = this.data;
				var length = list.attr('length');
				return val + length;
			}
		}
	});

	var map = new MyMap({});
	equal(map.size, 2);
});


test("One event on getters (#1585)", function() {
	var Person = define.Constructor({
		name: "*",
		id: "number"
	});

	var AppState = define.Constructor({
		person: {
			get: function(lastSetValue, resolve) {
				if (lastSetValue) {
					return lastSetValue;
				} else if (this.personId) {
					resolve(new Person({
						name: "Jose",
						id: 5
					}));
				} else {
					return null;
				}
			},
			Type: Person
		},
		personId: "*"
	});

	var appState = new AppState();
	var personEvents = 0;
	appState.bind("person", function(ev, person) {
		personEvents++;
	});

	equal(appState.person, null, "no personId and no lastSetValue");

	appState.personId = 5;
	equal(appState.person.name, "Jose", "a personId, providing Jose");
	ok(appState.person instanceof Person, "got a person instance");

	appState.person = {
		name: "Julia"
	};
	ok(appState.person instanceof Person, "got a person instance");

	equal(personEvents, 2);
});

test('Can read a defined property with a set/get method (#1648)', function() {
	// Problem: "get" is not passed the correct "lastSetVal"
	// Problem: Cannot read the value of "foo"

	var Map = define.Constructor({
		foo: {
			value: '',
			set: function(setVal) {
				return setVal;
			},
			get: function(lastSetVal) {
				return lastSetVal;
			}
		}
	});

	var map = new Map();

	equal(map.foo, '', 'Calling .foo returned the correct value');

	map.foo = 'baz';

	equal(map.foo, 'baz', 'Calling .foo returned the correct value');
});


test('Can bind to a defined property with a set/get method (#1648)', 3, function() {
	// Problem: "get" is not called before and after the "set"
	// Problem: Function bound to "foo" is not called
	// Problem: Cannot read the value of "foo"

	var Map = define.Constructor({
		foo: {
			value: '',
			set: function(setVal) {
				return setVal;
			},
			get: function(lastSetVal) {
				return lastSetVal;
			}
		}
	});

	var map = new Map();

	map.bind('foo', function() {
		ok(true, 'Bound function is called');
	});

	equal(map.foo, '', 'Calling .attr(\'foo\') returned the correct value');

	map.foo = 'baz';

	equal(map.foo, 'baz', 'Calling .attr(\'foo\') returned the correct value');
});

test("type converters handle null and undefined in expected ways (1693)", function() {

	var Typer = define.Constructor({
		date: {
			type: 'date'
		},
		string: {
			type: 'string'
		},
		number: {
			type: 'number'
		},
		'boolean': {
			type: 'boolean'
		},
		htmlbool: {
			type: 'htmlbool'
		},
		leaveAlone: {
			type: '*'
		}
	});

	var t = new Typer({
		date: undefined,
		string: undefined,
		number: undefined,
		'boolean': undefined,
		htmlbool: undefined,
		leaveAlone: undefined
	});

	equal(t.date, undefined, "converted to date");

	equal(t.string, undefined, "converted to string");

	equal(t.number, undefined, "converted to number");

	equal(t.boolean, false, "converted to boolean");

	equal(t.htmlbool, false, "converted to htmlbool");

	equal(t.leaveAlone, undefined, "left as object");

	t = new Typer({
		date: null,
		string: null,
		number: null,
		'boolean': null,
		htmlbool: null,
		leaveAlone: null
	});

	equal(t.date, null, "converted to date");

	equal(t.string, null, "converted to string");

	equal(t.number, null, "converted to number");

	equal(t.boolean, false, "converted to boolean");

	equal(t.htmlbool, false, "converted to htmlbool");

	equal(t.leaveAlone, null, "left as object");

});

test('Initial value does not call getter', function() {
	expect(0);

	var Map = define.Constructor({
		count: {
			get: function(lastVal) {
				ok(false, 'Should not be called');
				return lastVal;
			}
		}
	});

	new Map({
		count: 100
	});
});

test("getters produce change events", function() {
	var Map = define.Constructor({
		count: {
			get: function(lastVal) {
				return lastVal;
			}
		}

	});

	var map = new Map();

	// map.bind("change", function(){
	//   ok(true, "change called");
	// });

	map.bind('count', function() {
		ok(true, "change called");
	});

	map.count = 22;
});

test("Asynchronous virtual properties cause extra recomputes (#1915)", function() {

	stop();

	var ran = false;

	var VM = define.Constructor({
		foo: {
			get: function(lastVal, setVal) {
				setTimeout(function() {
					if (setVal) {
						setVal(5);
					}
				}, 10);
			}
		},
		bar: {
			get: function() {
				var foo = this.foo;
				if (foo) {
					if (ran) {
						ok(false, 'Getter ran twice');
					}
					ran = true;
					return foo * 2;
				}
			}
		}
	});

	var vm = new VM();
	vm.bind('bar', function() {});

	setTimeout(function() {
		equal(vm.bar, 10);
		start();
	}, 200);

});

test("Stache with single property", function() {
	var Typer = define.Constructor({
		foo: {
			type: 'string'
		}
	});

	var template = stache('{{foo}}');
	var t = new Typer({
		foo: 'bar'
	});
	var frag = template(t);
	equal(frag.firstChild.nodeValue, 'bar');
	t.foo = "baz"
	equal(frag.firstChild.nodeValue, 'baz');
});

test("Stache with boolean property with {{#if}}", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	var template = stache('{{#if isEnabled}}Enabled{{/if}}');
	var frag = template(nested);
	equal(frag.firstChild.nodeValue, 'Enabled');
});

test("stache with double property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	template = stache('{{test.name}}')
	frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

test("Stache with one nested property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	template = stache('{{examples.one.name}}');
	frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

test("Stache with two nested property", function() {
	var nailedIt = 'Nailed it';
	var Example = define.Constructor({
		name: {
			value: nailedIt
		}
	});

	var NestedMap = define.Constructor({
		isEnabled: {
			value: true
		},
		test: {
			Value: Example
		},
		examples: {
			type: {
				one: {
					Value: Example
				},
				two: {
					type: {
						deep: {
							Value: Example
						}
					},
					Value: Object
				}
			},
			Value: Object
		}
	});

	var nested = new NestedMap();
	template = stache('{{examples.two.deep.name}}');
	frag = template(nested);
	equal(frag.firstChild.nodeValue, nailedIt);
});

QUnit.test('Default values cannot be set (#8)', function() {
	var Person = function() {};

	define(Person.prototype, {
		first: {
			type: 'string',
			value: 'Chris'
		},
		last: {
			type: 'string',
			value: 'Gomez'
		},
		fullName: {
			get: function() {
				return this.first + ' ' + this.last;
			}
		}
	});

	var p = new Person();

	QUnit.equal(p.fullName, 'Chris Gomez', 'Fullname is correct');
	p.first = 'Sara';
	QUnit.equal(p.fullName, 'Sara Gomez', 'Fullname is correct after update');
});


QUnit.test('default type is setable', function() {
	var Person = function() {};

	define(Person.prototype, {
		'*': 'string',
		first: {
			value: 1
		},
		last: {
			value: 2
		}
	});

	var p = new Person();

	QUnit.ok(p.first === '1', typeof p.first);
	QUnit.ok(p.last === '2', typeof p.last);
});
