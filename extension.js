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
const St = imports.gi.St;
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

function removeInjection(objectPrototype, injection, functionName) {
    if (injection[functionName] === undefined) {
        delete objectPrototype[functionName];
    } else {
        objectPrototype[functionName] = injection[functionName];
    }
}

function enable() {
    resetState();
    
    windowOverlayInjections['_init'] = injectToFunction(Workspace.WindowOverlay.prototype, '_init', function(windowClone, parentActor) {
        // do nothing
    });
    
    windowOverlayInjections['hide'] = injectToFunction(Workspace.WindowOverlay.prototype, 'hide', function() {
        // do nothing
    });
    
    windowOverlayInjections['show'] = injectToFunction(Workspace.WindowOverlay.prototype, 'show', function() {
        // do nothing
    });
    
    windowOverlayInjections['_onShowChrome'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onShowChrome', function() {
        // do nothing
    });

    windowOverlayInjections['_onHideChrome'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onHideChrome', function() {
       // do nothing
    });
    
	// How to cancel hover behaviour?
    windowOverlayInjections['relayout'] = injectToFunction(Workspace.WindowOverlay.prototype, 'relayout', function(animate) {
        let title = this.title;
		// Always show titles
        title.show();
            
		// -- Code comes from https://extensions.gnome.org/extension/1378/overview-titles-shrink/ --+
		// This is work, maybe means 'Get the positions of each Window?'
		let [cloneX, cloneY, cloneWidth, cloneHeight] = this._windowClone.slot;
		// -- Code comes from https://extensions.gnome.org/extension/1378/overview-titles-shrink/ --+

		// -- Code comes from https://extensions.gnome.org/extension/529/windows-overview-tooltips/ --+
		let titleWidth = title.width;
		log('titleWidth is ' + titleWidth);
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
		log('titleX is ' + titleX);
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