@property {Boolean} can-define/map/map.seal seal

@parent can-define/map/map.static

@description Defines if instances of the map should be [sealed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) in development.

@option {Boolean} If `true`, in development, instances of this object will be [sealed](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal).  In  [strict mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) errors will be thrown when undefined properties are set.  This is the default
behavior of [can-define/map/map.extend extended DefineMaps]:

```js
"use strict";
var Person = can.DefineMap.extend({});
var me = new Person();
me.age = 33 //-> throws "TypeError: Can't add property age, object is not extensible"
```

If `false`, the object will not be sealed.  This is the default behavior of
unextended [can-define/map/map DefineMaps].  Use [can-define/map/map.prototype.get] and [can-define/map/map.prototype.set] to get and set values:

```js
var person = new can.DefineMap();
person.set("first","Justin");
person.set("last","Meyer");

person.get("first") //-> "Justin"
person.get("last") //-> "Meyer"
```

Set `seal` to `false` on objects that have an indeterminate number of properties:

```js
var Style = can.DefineMap.extend({
  seal: false
},{
  cssText: {
    get: function(){
      return _.map(this.get(), function(val, prop){
        return prop+": "+val;
      }).join(";")
    }
  }
});
var style = new Style();
style.set("color","green");
style.set("font","awesome");
style.cssText //-> "color:green; font: awesome;"
```
