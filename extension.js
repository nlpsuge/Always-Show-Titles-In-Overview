'use strict';

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
const { Clutter, St, Graphene, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Workspace = Me.imports.workspace;
const ObjectPrototype = Me.imports.utils.objectPrototype;

let windowOverlayInjections;

var WINDOW_SCALE_TIME = 200;

let _settings = null;

let customWorkspace;

let _objectPrototype; 

let windowTracker;

function _initializeObject() {
    _settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.always-show-titles-in-overview');

    customWorkspace = new Workspace.CustomWorkspace();
    customWorkspace.enable();

    _objectPrototype = new ObjectPrototype.ObjectPrototype();

    windowTracker = Shell.WindowTracker.get_default();
}

function _updateAppIconPosition(windowPreview) {
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

function _showOrHideAppIcon(windowPreview) {
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
            return;
        }
    }

    const hide_icon_for_video_player = _settings.get_boolean('hide-icon-for-video-player');
    if (hide_icon_for_video_player) {
        const app = windowTracker.get_window_app(windowPreview.metaWindow);
        const app_info = app?.get_app_info();
        // app_info can be null if backed by a window (there's no .desktop file association)
        // See: shell_app_is_window_backed()
        let recheck = false;
        const categories = app_info?.get_categories();
        if (categories) {
            const categoriesArr = categories.split(';')
            for (const category of categoriesArr) {
                // Support Video and TV
                if (category === 'Video' || category === 'TV') {
                    windowPreview._icon.hide();
                    return;
                } 
                
                // Support Video and Audio
                if (category === 'Player') {
                    recheck = true;
                }
            }
        }

        if (recheck) {
            log('Rechecking whether ' + app_info?.get_name() + ' is a video player or not by checking mime type');
            const supported_types = app_info?.get_supported_types();
            if (supported_types) {
                for (const supported_type of supported_types) {
                    // Support Video
                    if (supported_type.startsWith('video/')) {
                        windowPreview._icon.hide();
                        return;
                    }
                }
            }
        }
    }

    _updateAppIconPosition(windowPreview);
}

function enable() {
    _initializeObject();

    // WindowPreview._init () is called N times if there are N windows when activate the Overview
    // Always show titles and close buttons
    _objectPrototype.injectOrOverrideFunction(WindowPreview.WindowPreview.prototype, '_init', true, function(animate) {
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

        _showOrHideAppIcon(this);
    });

    _objectPrototype.injectOrOverrideFunction(WindowPreview.WindowPreview.prototype, '_adjustOverlayOffsets', true, function() {
        // nothing

    });

    // No need to show or hide tittles and close buttons
    _objectPrototype.injectOrOverrideFunction(WindowPreview.WindowPreview.prototype, 'showOverlay', false, function(animate) {
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
    _objectPrototype.injectOrOverrideFunction(WindowPreview.WindowPreview.prototype, 'hideOverlay', false, function(animate) {
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
    // Destroy the created object
    if (_settings) {
        // GObject.Object.run_dispose(): Releases all references to other objects.
        _settings.run_dispose();
        _settings = null;
    }

    if (customWorkspace) {
        customWorkspace.disable();
        customWorkspace = null;
    }

    if (_objectPrototype) {
        _objectPrototype.removeInjections(WindowPreview.WindowPreview.prototype);
        _objectPrototype = null;
    }

    if (windowTracker) {
        windowTracker = null;
    }

}

function init() {
    // do nothing
}
