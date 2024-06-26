@function can-define/map/map.extend extend
@parent can-define/map/map.static

@description Create a custom map type

@signature `can.DefineMap.extend([name,] [static,] prototype)`

Extends can.DefineMap, or constructor functions derived from can.DefineMap,
to create a new constructor function.

```js
var Person = can.DefineMap.extend(
  "Person",
  {seal: true},
  {
    first: "string",
    last: {type: "string"},
    fullName: {
      get: function(){
        return this.first+" "+this.last;
      }
    },
    age: {value: 0},
  });

var me = new Person({first: "Justin", last: "Meyer"})
me.fullName //-> "Justin Meyer"
me.age      //-> 0
```

  @param {String} [name] Provides an optional name for this type that will
  show up nicely in debuggers.

  @param {Object} [static] Static properties that are set directly on the
  constructor function.

  @param {Object<String,Function|String|can-define.types|can-define.types.propDefinition>} prototype A definition of the properties or methods on this type.

  If the property definition is a __plain function__, it's considered a method.

  ```js
  var Person = DefineMap.extend({
    sayHi: function(){ console.log("hi"); }
  });

  var me = new Person();
  me.sayHi();
  ```

  If the property definition is a __string__, it's considered a `type` setting to be looked up in [can-define.types can.define.types].

  ```js
  var Person = DefineMap.extend({
    age: 'number',
    isCool: 'boolean',
    hobbies: 'observable'
  });

  var me = new Person({age: '33', isCool: 'false', hobbies: ['js','bball']});
  me.age    //-> 33
  me.isCool //-> false
  me.hobbies instanceof DefineList //-> true
  ```


  If the property definition is a Constructor function, it's considered a `Type` setting.

  ```js
  var Address = DefineMap.extend({
    zip: 'number'
  });
  var Person = DefineMap.extend({
    address: Address
  });

  var me = new Person({address: {zip: '60048'}});
  me.address.zip //-> 60048
  ```

  If the property is an __object__, it's considered to be a [can-define.types.propDefinition].

  ```js
  var Person = DefineMap.extend({
    fullName: {
      get: function() {
        return this.first+" "+this.last;
      },
      set: function(newVal) {
        var parts = newVal.split(" ");
        this.first = parts[0];
        this.last = parts[1];
      }
    },
    // slick way of creating an 'inline' type.
    address: {
      Type: {
        zip: "number"
      }
    }
  });

  var me = new Person({fullName: "Rami Myer", address: {zip: '60048'}});
  me.first       //-> "Rami"
  me.address.zip //-> 60048
  ```

@return {can-define/map/map} A DefineMap constructor function.
