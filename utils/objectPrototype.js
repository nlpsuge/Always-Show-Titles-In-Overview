/* exported ObjectPrototype */

var ObjectPrototype = class ObjectPrototype {
    
    constructor() {
        this.injections = {};
    }

    injectToFunction(objectPrototype, functionName, injectedFunction) {
        let originalFunction = objectPrototype[functionName];
    
        objectPrototype[functionName] = function() {
            let returnValue;
    
            if (originalFunction !== undefined) {
                returnValue = originalFunction.apply(this, arguments);
            }
    
            let injectedReturnValue = injectedFunction.apply(this, arguments);
            if (returnValue === undefined) {
                returnValue = injectedReturnValue;
            }
    
            return returnValue;
        }
    
        this.injections[functionName] = originalFunction;
        return originalFunction;
    }

    removeInjections(objectPrototype) {
        for (let functionName in this.injections) {
            if (this.injections[functionName] === undefined) {
                delete objectPrototype[functionName];
            } else {
                objectPrototype[functionName] = this.injections[functionName];
            }
        }
    }
}
