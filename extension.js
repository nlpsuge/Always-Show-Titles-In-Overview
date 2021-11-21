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
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Workspace = Me.imports.workspace;

const Main = imports.ui.main;
const Overview = imports.ui.overview;

let windowOverlayInjections;

var WINDOW_SCALE_TIME = 200;

let _settings = null;

let _ASTIOWorkspace;

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

function _update_app_icon_position(windowPreview) {
    const app_icon_position = _settings.get_string('app-icon-position');
    let icon_factor = 1;
    if (app_icon_position === 'Center') {
        icon_factor = 0.5
    }

    const icon_constraints = windowPreview._icon.get_constraints();
    for (const constraint of icon_constraints) {
        if (constraint instanceof Clutter.AlignConstraint) {
            const align_axis = constraint.align_axis;
            if (align_axis === Clutter.AlignAxis.Y_AXIS) {
                // 0(top), 0.5(middle), 1(bottom)
                constraint.set_factor(icon_factor);
            }
        }

        // Change to coordinate to Clutter.BindCoordinate.Y
        // And set offset to make the icon be up a bit
        // And only when the icon is on the bottom needs to do this code block
        if (app_icon_position === 'Bottom') {
            if (!constraint instanceof Clutter.BindConstraint) {
                continue;
            }
            const coordinate = constraint.coordinate
            if (coordinate !== Clutter.BindCoordinate.POSITION) {
                continue;
            }

            // Change icon's constraint in notify::realized,
            // to fix 'st_widget_get_theme_node called on the widget [0x5g869999 StLabel.window-caption ("a title name")] which is not in the stage.'
            windowPreview.connect('notify::realized', () => {
                if (!windowPreview.realized) {
                    return;
                }

                constraint.set_coordinate(Clutter.BindCoordinate.Y);
                constraint.set_offset(-windowPreview._title.height / 2);

                windowPreview._title.ensure_style();
                windowPreview._icon.ensure_style();
            });
        }
    }
}

function _show_or_hide_app_icon(windowPreview) {
    // show or hide all app icons
    const show_app_icon =  _settings.get_boolean('show-app-icon');
    if (!show_app_icon) {
        windowPreview._icon.hide();
        return;
    }

    // show or hide some app icons
    const do_not_show_app_icon_when_fullscreen = _settings.get_boolean('do-not-show-app-icon-when-fullscreen');
    if (do_not_show_app_icon_when_fullscreen) {
        const window_is_fullscreen = windowPreview.metaWindow.is_fullscreen()
        if (window_is_fullscreen) {
            windowPreview._icon.hide();
        }
    }

    _update_app_icon_position(windowPreview);
}

function enable() {
    _settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.always-show-titles-in-overview');

    _ASTIOWorkspace = new Workspace.ASTIOWorkspace();
    _ASTIOWorkspace.enable();
    
    resetState();

    // WindowPreview._init () is called N times if there are N windows when avtive the Overview
    // Always show titles and close buttons
    windowOverlayInjections['_init'] = injectToFunction(WindowPreview.WindowPreview.prototype, '_init', function(animate) {
        const toShow = this._windowCanClose()
            ? [this._title, this._closeButton]
            : [this._title];

        toShow.forEach(a => {
            a.show();
        });

        // titles

        // Remove title offset to avoid being covered by another window
        const title_constraints = this._title.get_constraints();
        for (const constraint of title_constraints) {
            if (constraint instanceof Clutter.BindConstraint) {
                const coordinate = constraint.coordinate
                if (coordinate === Clutter.BindCoordinate.Y) {
                    constraint.set_offset(0)
                }
            }
        }

        _show_or_hide_app_icon(this);
    });

    windowOverlayInjections['_adjustOverlayOffsets'] = injectToFunction(WindowPreview.WindowPreview.prototype, '_adjustOverlayOffsets', function() {
        // nothing

    });

    // No need to show or hide tittles and close buttons
    windowOverlayInjections['showOverlay'] = overrideFunction(WindowPreview.WindowPreview.prototype, 'showOverlay', function(animate) {
        // Main.overview.controls is undefined
        const overview_chilren = Main.layoutManager.overviewGroup.get_children();
        for (const child of overview_chilren) {
            if (child instanceof Overview.OverviewActor) {
                const controls = child.controls;
                const _workspacesDisplay = controls._workspacesDisplay;
                const _workspacesViews = _workspacesDisplay._workspacesViews;
                for (const _workspacesView of _workspacesViews) {
                    print('ui_overview_OverviewActor.controls._workspacesDisplay._workspacesViews._workspacesView: ' + _workspacesView);
                    print('_workspaces._workspaces: ' + _workspacesView._workspaces);
                    print('_workspaces._workspaces.length: ' + _workspacesView._workspaces.length);

                    for (workspace of _workspacesView._workspaces) {
                        print('_workspacesView._workspaces._workspace: ' + workspace);
                        // _show_or_hide_background();
                        const hide_background = _settings.get_boolean('hide-background');
                        if (hide_background) {
                            workspace._background.hide();
                        } else {
                            workspace._background.show();
                        }
                    }

                    break;
                }

            }
        }



        if (!this._overlayEnabled)
            return;

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
        const window_active_size_inc = _settings.get_int('window-active-size-inc');
        const activeExtraSize = window_active_size_inc * 2 * scaleFactor;
        const origSize = Math.max(width, height);
        const scale = (origSize + activeExtraSize) / origSize;

        // Trigger _adjustOverlayOffsets() via notify::scale-x
        this.window_container.ease({
            scale_x: scale,
            scale_y: scale,
            duration: animate ? WINDOW_SCALE_TIME : 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });

        // this.originalTitleHeight = this._title.height + (-this._title.translation_y)
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

    // Destroy the created object
    if (_settings) {
        // GObject.Object.run_dispose(): Releases all references to other objects.
        _settings.run_dispose();
        _settings = null;
    }

    if (_ASTIOWorkspace) {
        _ASTIOWorkspace.disable();
        _ASTIOWorkspace = null;
    }
}

function init() {
    // do nothing
}
