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
const { Clutter, St, Graphene } = imports.gi;

let windowOverlayInjections;

var SHOW_TITLE_FULLNAME = false;

var WINDOW_OVERLAY_FADE_TIME = 200;

var WINDOW_SCALE_TIME = 200;
var WINDOW_ACTIVE_SIZE_INC = 5; // in each direction

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

    // Always show titles and close buttons
    windowOverlayInjections['_init'] = injectToFunction(WindowPreview.WindowPreview.prototype, '_init', function(animate) {
        const toShow = this._windowCanClose()
            ? [this._title, this._closeButton]
            : [this._title];

        toShow.forEach(a => {
            a.show();
        });

        // this._icon.hide()
        print('============');
        print("this._title -> " + this._title);
        print("this._icon -> " + this._icon);
        print("title text -> " + this._title.text);
        const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
        print("scaleFactor -> " + scaleFactor);
        print("offset -> " + this._title.offset);

        print('this._title.translation_y -> ' + this._title.translation_y);
        print('this._title.translation_x -> ' + this._title.translation_x);
        print('this._title.y -> ' + this._title.y);
        print('this._title.x -> ' + this._title.x);
        print('this._title.scale_x -> ' + this._title.scale_x);
        print('this._title.scale_y -> ' + this._title.scale_y);

        const previewScale = this.window_container.scale_x;
        const [previewWidth, previewHeight, ...others] =
            this.window_container.allocation.get_size();

        const heightIncrease = Math.floor(previewHeight * (previewScale - 1) / 2);
        const widthIncrease = Math.floor(previewWidth * (previewScale - 1) / 2);

        print('previewScale -> ' + previewScale);

        print('previewWidth -> ' + previewWidth);
        print('previewHeight -> ' + previewHeight);
        print('others -> ' + others);

        const [width, height] =
            this.window_container.allocation.get_size();

        print('this.window_container.allocation.width -> ' + width);
        print('this.window_container.allocation.height -> ' + height);

        print('this.windowCenter.x -> ' + this.windowCenter.x);
        print('this.windowCenter.y -> ' + this.windowCenter.y);  

        const [width1, height1] = this.window_container.get_size();
        print('this.window_container.get_size.width -> ' + width1);
        print('this.window_container.get_size.height -> ' + height1);

        print('this.window_container.width -> ' + this.window_container.width);
        print('this.window_container.height -> ' + this.window_container.height);

        print('this.window_container.x -> ' + this.window_container.x);
        print('this.window_container.y -> ' + this.window_container.y);

        const [, closeButtonHeight] = this._closeButton.get_preferred_height(-1);
        print('closeButtonHeight -> ' + closeButtonHeight);

        const [min_width_p, min_height_p, natural_width_p, natural_height_p] 
            = this.window_container.get_preferred_size();
        print('min_width_p -> ' + min_width_p);
        print('min_height_p -> ' + min_height_p);
        print('natural_width_p -> ' + natural_width_p);
        print('natural_height_p -> ' + natural_height_p);
        
        print('this.metaWindow -> ' + this.metaWindow);
        print('this.metaWindow.x -> ' + this.metaWindow.x);
        print('this.metaWindow.y -> ' + this.metaWindow.y);
        print('this.metaWindow.height -> ' + this.metaWindow.height);

        print('this._closeButton.height -> ' + this._closeButton.height);
        print('this._title.height -> ' + this._title.height);
        print('this._icon.height -> ' + this._icon.height);
        print('this._closeButton.height - this._title.height -> ' + (this._closeButton.height - this._title.height));

        print('this._closeButton.get_preferred_height(-1) -> ' + this._closeButton.get_preferred_height(-1));
        print('this._title.height -> ' + this._title.height);
        print('this._icon.get_preferred_height(-1) -> ' + this._icon.get_preferred_height(-1));
        print('this._closeButton.get_preferred_height(-1) - this._title.height -> ' + (this._closeButton.get_preferred_height(-1) - this._title.height));

        const icon_constraints = this._icon.get_constraints();
        for (const constraint of icon_constraints) {
            if (constraint instanceof Clutter.AlignConstraint) {
                const align_axis = constraint.align_axis;
                if (align_axis === Clutter.AlignAxis.Y_AXIS) {
                    constraint.set_factor(0.5);
                }
            }
        }

        // const title_constraints = this._title.get_constraints();
        // for (const constraint of title_constraints) {
        //     if (constraint instanceof Clutter.AlignConstraint) {
        //         constraint.set_pivot_point(new Graphene.Point({ x: -1, y: -19 }))
        //     }
        // }

        // this._title.set({
        //     // x: scale,
        //     y: this._title.x / 0.2,
        // });
        this._title.set({
            translation_y: -this._title.height * 2
        });

    });

    // No need to show or hide tittles and close buttons
    windowOverlayInjections['showOverlay'] = overrideFunction(WindowPreview.WindowPreview.prototype, 'showOverlay', function(animate) {
        if (!this._overlayEnabled)
            return;

        print("_overlayShown -> " + this._overlayShown)

        if (this._overlayShown)
            return;

        this._overlayShown = true;
        this._restack();

        // If we're supposed to animate and an animation in our direction
        // is already happening, let that one continue
        const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 255)
            return;

        const [width, height] = this.window_container.get_size();
        const { scaleFactor } = St.ThemeContext.get_for_stage(global.stage);
        const activeExtraSize = WINDOW_ACTIVE_SIZE_INC * 2 * scaleFactor;
        const origSize = Math.max(width, height);
        const scale = (origSize + activeExtraSize) / origSize;

        this.window_container.ease({
            scale_x: scale,
            scale_y: scale,
            duration: animate ? WINDOW_SCALE_TIME : 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        this.emit('show-chrome');
    });

    // No need to show or hide tittles and close buttons
    windowOverlayInjections['hideOverlay'] = overrideFunction(WindowPreview.WindowPreview.prototype, 'hideOverlay', function(animate) {
        if (!this._overlayShown)
            return;

        this._overlayShown = false;
        this._restack();

        // If we're supposed to animate and an animation in our direction
        // is already happening, let that one continue
        const ongoingTransition = this._title.get_transition('opacity');
        if (animate &&
            ongoingTransition &&
            ongoingTransition.get_interval().peek_final_value() === 0)
            return;

        this.window_container.ease({
            scale_x: 1,
            scale_y: 1,
            duration: animate ? WINDOW_SCALE_TIME : 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
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
