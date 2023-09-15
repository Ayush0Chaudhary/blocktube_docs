
  // This function appears to be used for trapping property access and modification within a JavaScript object hierarchy.
  //
  // The primary purpose of this function is to trap (intercept) property access 
  // and modification within an object hierarchy specified by the `chain` argument.
  // `chain` specifies object hierarchy
  //
  // PIECE OF HORSE SHIT, SHIPPING FOR NOW
  //
  // Thanks to uBlock origin {comment by author}
  const defineProperty = function(chain, cValue, middleware = undefined) {
    let aborted = false;
    const mustAbort = function(v) {
      if ( aborted ) { return true; }
      aborted =
            (v !== undefined && v !== null) &&
            (cValue !== undefined && cValue !== null) &&
            (typeof v !== typeof cValue);
      return aborted;
    };
    // https://github.com/uBlockOrigin/uBlock-issues/issues/156
    //   Support multiple trappers for the same property.
    //
    // trapProp is used to trap a single property within an object.
    const trapProp = function(owner, prop, configurable, handler) {
      if ( handler.init(owner[prop]) === false ) { return; }
      const odesc = Object.getOwnPropertyDescriptor(owner, prop);
      let prevGetter, prevSetter;
      if ( odesc instanceof Object ) {
        if ( odesc.configurable === false ) { return; }
        if ( odesc.get instanceof Function ) {
          prevGetter = odesc.get;
        }
        if ( odesc.set instanceof Function ) {
          prevSetter = odesc.set;
        }
      }
      Object.defineProperty(owner, prop, {
        configurable,
        //When a property is accessed (get), the custom getter function is called.
        get() {
          if ( prevGetter !== undefined ) {
            prevGetter();
          }
          return handler.getter(); // cValue
        },
        // When a property is modified (set), the custom setter function is called.
        set(a) {
          if ( prevSetter !== undefined ) {
            prevSetter(a);
          }
          handler.setter(a);
        }
      });
    };

    // trapChain is used to recursively trap properties along a chain of properties (e.g., object1.object2.property).
    const trapChain = function(owner, chain) {
      const pos = chain.indexOf('.');
      if ( pos === -1 ) {
        trapProp(owner, chain, true, {
          v: undefined,
          init: function(v) {
            if ( mustAbort(v) ) { return false; }
            this.v = v;
            return true;
          },
          getter: function() {
            return cValue;
          },
          setter: function(a) {
            // Middleware is called when a property is set, allowing additional processing or validation of the new value.
            if (middleware instanceof Function) {
              cValue = a;
              middleware(a);
            } else {
              if ( mustAbort(a) === false ) { return; }
              cValue = a;
            }
          }
        });
        return;
      }
      const prop = chain.slice(0, pos);
      const v = owner[prop];
      chain = chain.slice(pos + 1);
      if ( v instanceof Object || typeof v === 'object' && v !== null ) {
        trapChain(v, chain);
        return;
      }
      trapProp(owner, prop, true, {
        v: undefined,
        init: function(v) {
          this.v = v;
          return true;
        },
        getter: function() {
          return this.v;
        },
        setter: function(a) {
          this.v = a;
          if ( a instanceof Object ) {
            trapChain(a, chain);
          }
        }
      });
    };
    trapChain(window, chain);
  }