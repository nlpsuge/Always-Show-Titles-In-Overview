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

    // Hide border immediately when going to other thumbnails in Overview
    windowOverlayInjections['_onHideChrome'] = injectToFunction(Workspace.WindowOverlay.prototype, '_onHideChrome', function() {
        this.border.hide();
    });

    // Hide close button, border, title immediately when leaving Overview
    windowOverlayInjections['hide'] = injectToFunction(Workspace.WindowOverlay.prototype, 'hide', function () {
        this.closeButton.hide();
        this.border.hide();
        this.title.hide();
    });

    // Do not hide close button, title any more
    windowOverlayInjections['_animateInvisible'] = injectToFunction(Workspace.WindowOverlay.prototype, '_animateInvisible', function () {
        [this.closeButton, this.title].forEach(a => {
            a.opacity = 0;
            a.ease({
                opacity: 255,
                duration: DEFAULT_DURATION,
                mode: Clutter.AnimationMode.EASE_IN_QUAD,
            });
        });
    });

    windowOverlayInjections['_animateVisible'] = injectToFunction(Workspace.WindowOverlay.prototype, '_animateVisible', function () {
        // reset opacity to 255 of title and close button to prevent them to flutter
        Tweener.removeTweens(this.title);
        this.title.opacity = 255;
        Tweener.removeTweens(this.closeButton);
        this.closeButton.opacity = 255;
    });

    windowOverlayInjections['hideOverlay'] = injectToFunction(Workspace.WindowOverlay.prototype, 'hideOverlay', function() {
        this.border.hide();
        if (this._windowCanClose())
            this.closeButton.show();
        this.title.show();
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

        // Clutter.Actor.get_preferred_width() will return the fixed width if
        // one is set, so we need to reset the width by calling set_width(-1),
        // to forward the call down to StLabel.
        // We also need to save and restore the current width, otherwise the
        // animation starts from the wrong point.
        title.set_size(-1, -1);
        let [titleMinWidth, titleNatWidth] = title.get_preferred_width(-1);

        //I need this so that the animation go smooth
        title.width = titleWidth;

        if (SHOW_TITLE_FULLNAME){
            titleWidth = titleNatWidth;
        }else{
            titleWidth = Math.max(titleMinWidth, Math.min(titleNatWidth, this._maxTitleWidth, cloneWidth, this.border.width));
        }

        let titleX = Math.round(cloneX + (cloneWidth - titleWidth) / 2);
        title.ease({
            x: titleX,
            width: titleWidth,
            opacity: 255,
            duration: DEFAULT_DURATION,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
        })
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
