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

import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as WindowPreview from 'resource:///org/gnome/shell/ui/windowPreview.js';

import {CustomWorkspace} from './workspace.js';
import * as ObjectPrototype from './utils/objectPrototype.js';


let _alwaysShowWindowClosebuttons = true;

let _settings = null;
let customWorkspace;
let _objectPrototype; 
let windowTracker;
let _idleId;

let allUpdateWindowPreviewFlagMask = 0;
const updateWindowPreviewFlags = {
    ICON_SHOW_OR_HIDE_WHEN_FULLSCREEN:          1 << 0,
    ICON_SHOW_OR_HIDE_FOR_VIDEO_PLAYER:         1 << 1,
    TITLE_MOVE_TO_BOTTOM_WHEN_FULLSCREEN:       1 << 2,
    TITLE_MOVE_TO_BOTTOM_FOR_VIDEO_PLAYER:      1 << 3,
}

Object.values(updateWindowPreviewFlags).forEach(flag => {
    allUpdateWindowPreviewFlagMask = allUpdateWindowPreviewFlagMask | flag;
})


function _initializeObject(extensionObject) {
    _settings = extensionObject.getSettings(
        'org.gnome.shell.extensions.always-show-titles-in-overview');

    customWorkspace = new CustomWorkspace(extensionObject);
    customWorkspace.enable();

    _objectPrototype = new ObjectPrototype.ObjectPrototype();

    windowTracker = Shell.WindowTracker.get_default();
}

function _hideOrMove(windowPreview, flags) {
    const window_is_fullscreen = windowPreview.metaWindow.is_fullscreen()
    if (window_is_fullscreen) {
        if (flags & updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_WHEN_FULLSCREEN) {
            windowPreview._icon.hide();
        }
        _moveTitleToBottom(windowPreview, flags & updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_WHEN_FULLSCREEN);
        return;
    }

    if (flags & (updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_FOR_VIDEO_PLAYER 
                | updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_FOR_VIDEO_PLAYER)) {
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
                    if (flags & updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_FOR_VIDEO_PLAYER) {
                        windowPreview._icon.hide();
                    }
                    _moveTitleToBottom(windowPreview, flags & updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_FOR_VIDEO_PLAYER);
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
                        if (flags & updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_FOR_VIDEO_PLAYER) {
                            windowPreview._icon.hide();
                        }
                        _moveTitleToBottom(windowPreview, flags & updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_FOR_VIDEO_PLAYER);
                        return;
                    }
                }
            }
        }
    }
}

function _moveTitleToBottom(windowPreview, move) {
    if (move) {
        const titleConstraints = windowPreview._title.get_constraints();
        for (const constraint of titleConstraints) {
            if (constraint instanceof Clutter.AlignConstraint) {
                const align_axis = constraint.align_axis;
                if (align_axis === Clutter.AlignAxis.Y_AXIS) {
                    // 0(top), 0.5(middle), 1(bottom)
                    constraint.set_factor(1);
                }
            }
        }
    }
}

function _updatePosition(windowPreview, constraints, position, offset) {
    let factor = 1;
    if (position === 'Center') {
        factor = 0.5
    }

    for (const constraint of constraints) {
        if (constraint instanceof Clutter.AlignConstraint) {
            const align_axis = constraint.align_axis;
            if (align_axis === Clutter.AlignAxis.Y_AXIS) {
                // 0(top), 0.5(middle), 1(bottom)
                constraint.set_factor(factor);
            }
        }

        // Change to coordinate to Clutter.BindCoordinate.Y
        // And set offset to make the icon be up a bit
        // And only when the icon is on the bottom needs to do this code block
        if (offset) {
            if (!constraint instanceof Clutter.BindConstraint) {
                continue;
            }
            const coordinate = constraint.coordinate
            // Note that `windowPreview._title` does not have `Clutter.BindCoordinate.POSITION` constraint, but it has `Clutter.BindCoordinate.Y` constraint, as well as `windowPreview._icon`
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
                constraint.set_offset(offset());

                windowPreview._title.ensure_style();
                windowPreview._icon.ensure_style();
            });
        }
    }
}

function _updateTitle(windowPreview) {
    const titleConstraints = windowPreview._title.get_constraints();
    const windowTitlePosition = _settings.get_string('window-title-position');
    _updatePosition(windowPreview, titleConstraints, windowTitlePosition, null);    
}

function _updateAppIcon(windowPreview) {
    // show or hide all app icons
    const show_app_icon =  _settings.get_boolean('show-app-icon');
    if (!show_app_icon) {
        windowPreview._icon.hide();
        return;
    }

    const iconConstraints = windowPreview._icon.get_constraints();
    const appIconPosition = _settings.get_string('app-icon-position');

    // Note: when `offset` is negative, the `_icon` moves upwards.
    let offset = () => -windowPreview._title.height / 2;
    _updatePosition(windowPreview, iconConstraints, appIconPosition, offset);
}

export default class AlwaysShowTitlesInOverview extends Extension {

    enable() {
        _initializeObject(this);

        // WindowPreview._init () is called N times if there are N windows when activate the Overview
        // Always show titles and close buttons
        _objectPrototype.injectOrOverrideFunction(WindowPreview.WindowPreview.prototype, '_init', true, function(animate) {
            
            if (this._windowCanClose() && _settings.get_boolean('always-show-window-closebuttons')) {
                this._closeButton.show();
            }

            this._title.show();

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

            _updateAppIcon(this);
            _updateTitle(this);

            let flags = null;
            const iconWhenFullscreen = _settings.get_boolean('do-not-show-app-icon-when-fullscreen');
            const iconForVideoPlayer = _settings.get_boolean('hide-icon-for-video-player');
            if (iconWhenFullscreen) flags |= updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_WHEN_FULLSCREEN;
            if (iconForVideoPlayer) flags |= updateWindowPreviewFlags.ICON_SHOW_OR_HIDE_FOR_VIDEO_PLAYER;
            const titleWhenFullscreen = _settings.get_boolean('move-window-title-to-bottom-when-fullscreen');
            const titleForVideoPlayer = _settings.get_boolean('move-window-title-to-bottom-for-video-player');
            if (titleWhenFullscreen) flags |= updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_WHEN_FULLSCREEN;
            if (titleForVideoPlayer) flags |= updateWindowPreviewFlags.TITLE_MOVE_TO_BOTTOM_FOR_VIDEO_PLAYER;
            _hideOrMove(this, flags);
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

            _alwaysShowWindowClosebuttons = _settings.get_boolean('always-show-window-closebuttons');
            if (!_alwaysShowWindowClosebuttons) {
                const toShow = this._windowCanClose() ? [this._closeButton] : [];

                toShow.forEach(a => {
                    a.opacity = 0;
                    a.show();
                    a.ease({
                        opacity: 255,
                        duration: animate ? WindowPreview.WINDOW_OVERLAY_FADE_TIME : 0,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                    });
                });
            }
            
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
                duration: animate ? WindowPreview.WINDOW_SCALE_TIME : 0,
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


            if (!_alwaysShowWindowClosebuttons) {
                [this._closeButton].forEach(a => {
                    a.opacity = 255;
                    a.ease({
                        opacity: 0,
                        duration: animate ? WindowPreview.WINDOW_OVERLAY_FADE_TIME : 0,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        onComplete: () => a.hide(),
                    });
                });   
            }
            
            this.window_container.ease({
                scale_x: 1,
                scale_y: 1,
                duration: animate ? WindowPreview.WINDOW_SCALE_TIME : 0,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });


    }

    disable() {
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

        if (_idleId) {
            GLib.source_remove(_idleId);
            _idleId = null;
        }

    }
}