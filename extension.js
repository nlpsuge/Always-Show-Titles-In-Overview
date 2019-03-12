// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const Workspace = imports.ui.workspace;
const Tweener = imports.ui.tweener;

let windowOverlayInjections;
let showTitleFullName = false;

function resetState() {
    windowOverlayInjections = {};
}

function injectToFunction(objectPrototype, functionName, injectedFunction) {
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

    return originalFunction;
}

// override original functions
function overrideFunction(objectPrototype, functionName, injectedFunction) {
    let originalFunction = objectPrototype[functionName];

    objectPrototype[functionName] = function() {
        let returnValue;

        let injectedReturnValue = injectedFunction.apply(this, arguments);
        if (returnValue === undefined) {
            returnValue = injectedReturnValue;
        }

        return returnValue;
    }

    return originalFunction;
}

function removeInjection(objectPrototype, injection, functionName) {
    if (injection[functionName] === undefined) {
        delete objectPrototype[functionName];
    } else {
        objectPrototype[functionName] = injection[functionName];
    }
}

function enable() {
    resetState();

    // Disable hover behaviour
    windowOverlayInjections['show'] = overrideFunction(Workspace.WindowOverlay.prototype, 'show', function() {
        this._hidden = true;
    });

    // Disable hover behaviour
    windowOverlayInjections['_animateInvisible'] = overrideFunction(Workspace.WindowOverlay.prototype, '_animateInvisible', function () {
        [this.closeButton, this.border, this.title].forEach(a => {
            a.opacity = 0;
            Tweener.addTween(a,
                { opacity: 255,
                    transition: 'easeInQuad' });
        });
    });

    windowOverlayInjections['_animateVisible'] = overrideFunction(Workspace.WindowOverlay.prototype, '_animateVisible', function () {
        
    });

    windowOverlayInjections['relayout'] = injectToFunction(Workspace.WindowOverlay.prototype, 'relayout', function(animate) {
        // Always show close button
        if (this._windowCanClose())
            this.closeButton.show();

        let title = this.title;
        // Always show titles
        title.show();
            
        // -- Code comes from https://extensions.gnome.org/extension/1378/overview-titles-shrink/ --+
        // It works! Maybe 'this._windowClone.slot' means 'Get the positions of each Window?'
        let [cloneX, cloneY, cloneWidth, cloneHeight] = this._windowClone.slot;
        // -- Code comes from https://extensions.gnome.org/extension/1378/overview-titles-shrink/ --+

        // -- Code comes from https://extensions.gnome.org/extension/529/windows-overview-tooltips/ --+
        let titleWidth = title.width;
        //I need this to be able to know it's preferred size
        title.set_size(-1, -1);
        let [titleMinWidth, titleNatWidth] = title.get_preferred_width(-1);
        //I need this so that the animation go smooth
        title.width = titleWidth;

        if (showTitleFullName){
            titleWidth = titleNatWidth;
        }else{
            titleWidth = Math.max(titleMinWidth, Math.min(titleNatWidth, cloneWidth));
        }

        let titleX = Math.round(cloneX + (cloneWidth - titleWidth) / 2);
        Tweener.addTween(title,{
            x: titleX,
            width: titleWidth,
            time: 0.1,
            transition: 'easeOutQuad',
        });
        // -- Code comes from https://extensions.gnome.org/extension/529/windows-overview-tooltips/ --+
    });
}

function disable() {
    for (let functionName in windowOverlayInjections) {
        removeInjection(Workspace.WindowOverlay.prototype, windowOverlayInjections, functionName);
    }
    
    resetState();
}

function init() {
    // do nothing
}


/* 3.0 API backward compatibility */
function main() {
    init();
    enable();
} 
