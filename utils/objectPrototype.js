/* exported ObjectPrototype */

var ObjectPrototype = class ObjectPrototype {
    
    constructor() {
        this.injections = {};
    }

    injectOrOverrideFunction(objectPrototype, functionName, injected, targetFunction) {
        let originalFunction = objectPrototype[functionName];
    
        objectPrototype[functionName] = function() {
            let returnValue;
            print(this);
            print(arguments);
    
            if (injected && originalFunction !== undefined) {
                returnValue = originalFunction.apply(this, arguments);
            }
    
            let injectedReturnValue = targetFunction.apply(this, arguments);
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
