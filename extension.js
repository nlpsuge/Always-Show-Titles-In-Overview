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

const WindowPreview = imports.ui.windowPreview;
const { Clutter } = imports.gi;

let windowOverlayInjections;

var SHOW_TITLE_FULLNAME = false;
var DEFAULT_DURATION = 0.1

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

    windowOverlayInjections['showOverlay'] = overrideFunction(WindowPreview.WindowPreview.prototype, 'showOverlay', function(animate) {
        if (!this._overlayEnabled) {
            return;
        }

        const ongoingTransition = this._border.get_transition('opacity');

        // If we're supposed to animate and an animation in our direction
        // is already happening, let that one continue
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 255) {
            return;
        }

        const toShow = [this._border];

        toShow.forEach(a => {
            a.opacity = 0;
            a.show();
            a.ease({
                opacity: 255,
                duration: animate ? WindowPreview.WINDOW_OVERLAY_FADE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });

        this.emit('show-chrome');
    });


    windowOverlayInjections['hideOverlay'] = overrideFunction(WindowPreview.WindowPreview.prototype, 'hideOverlay', function(animate) {
        const toShow = this._windowCanClose()
            ? [this._border, this._title, this._closeButton]
            : [this._border, this._title];

        toShow.forEach(a => {
            a.opacity = 0;
            a.show();
            a.ease({
                opacity: 255,
                duration: 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });

        [this._border].forEach(a => {
            a.opacity = 255;
            a.ease({
                opacity: 0,
                duration: 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                // onComplete: () => a.hide(),
            });
        });
    });


}

function disable() {
    for (let functionName in windowOverlayInjections) {
        removeInjection(WindowPreview.WindowPreview.prototype, windowOverlayInjections, functionName);
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
