'use strict';

const { Clutter, St, GObject, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;
const Workspace = imports.ui.workspace;

const ObjectPrototype = Me.imports.utils.objectPrototype;

const WINDOW_OVERLAY_FADE_TIME = 200;
let _settings;
let _objectPrototype;
let _appsGridShownId;
let _idleId;
let _allWindows;

function _showHideWorkspaceBackground(workspaceBackground) {
    const hide_background = _settings.get_boolean('hide-background');
    if (hide_background) {
        workspaceBackground.hide();
    } else {
        workspaceBackground.show();
    }
}

function _animateFromOverview(windowPreview, animate) {
    const metaWorkspace = windowPreview._workspace.metaWorkspace;
    // Seems that if metaWorkspace is null, the current workspace is active?
    // See: workspace.Workspace#_isMyWindow() and workspacesView.SecondaryMonitorDisplay#_updateWorkspacesView()
    if (metaWorkspace !== null && !metaWorkspace.active) {
        return;
    }

    // Hide title and button gradually even if metaWorkspace is null

    const toHide = [windowPreview._title, windowPreview._closeButton];
    toHide.forEach(a => {
        a.opacity = 255;
        a.ease({
            opacity: 0,
            duration: animate ? WINDOW_OVERLAY_FADE_TIME : 0,
            mode: Clutter.AnimationMode.EASE_OUT_EXPO
        });
    });
}

// TODO　better to hide the titles and close buttons before entering the app grid,
// otherwise the titles and close buttons on windows are very noticeable. 
function _removeWindowDecorations() {
    _appsGridShownId = Main.overview.dash.showAppsButton.connect('notify::checked', () => {
        if (Main.overview.dash.showAppsButton.checked) {
            _allWindows = [];
            // Have to do this when the event loop is idle and to wait the underlying higher priority operations are completed
            _idleId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
                // monitors
                const workspacesViews = Main.overview._overview._controls._workspacesDisplay._workspacesViews;
                if (workspacesViews && workspacesViews.length) {
                    workspacesViews.forEach(wv => {
                        const workspaces = wv._workspaces;
                        // It's possible no workspace view bars on the second monitor
                        if (workspaces && workspaces.length) {
                            workspaces.forEach(workspace => {
                                const windows = workspace._windows;
                                if (windows.length) {
                                    windows.forEach(windowPreview => {
                                        windowPreview._closeButton._originalVisibleAWSM = windowPreview._closeButton.visible;
                                        windowPreview._title._originalVisibleAWSM = windowPreview._title.visible;
                                        windowPreview._closeButton.hide();
                                        windowPreview._title.hide();
                                        _allWindows.push(windowPreview);
                                    });
                                }
                            });
                        }
                    });
                }
                return GLib.SOURCE_REMOVE;
            });
        } else {
            _restoreWindowsVisible();
        }
    });
}

function _restoreWindowsVisible() {
    if (_allWindows && _allWindows.length) {
        _allWindows.forEach(windowPreview => {
            windowPreview._closeButton.visible = windowPreview._closeButton._originalVisibleAWSM;
            windowPreview._title.visible = windowPreview._title._originalVisibleAWSM;
        });
        _allWindows = null;
    }
}

var CustomWorkspace = class {

    constructor() {
        _removeWindowDecorations();
    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        _objectPrototype = new ObjectPrototype.ObjectPrototype();

        // Since other extensions (eg, dash-to-panel) could use Workspace.WorkspaceBackground, I can't just remove it any more.
        // Hide the Workspace.WorkspaceBackground after be initialized
        _objectPrototype.injectOrOverrideFunction(Workspace.WorkspaceBackground.prototype, '_init', true, function() {
            _showHideWorkspaceBackground(this);
        });

        _objectPrototype.injectOrOverrideFunction(Workspace.Workspace.prototype, 'prepareToLeaveOverview', true, function() {
            for (let i = 0; i < this._windows.length; i++) {
                const windowPreview = this._windows[i];
                _animateFromOverview(windowPreview, true);
            }
        });
    }

    // Destroy the created object
    disable() { 
        if (_settings) {
            // GObject.Object.run_dispose(): Releases all references to other objects.
            _settings.run_dispose();
            _settings = null;
        }

        if (_objectPrototype) {
            _objectPrototype.removeInjections(Workspace.WorkspaceBackground.prototype);
            _objectPrototype.removeInjections(Workspace.Workspace.prototype);
            _objectPrototype = null;
        }

        if (_appsGridShownId) {
            Main.overview.dash.showAppsButton.disconnect(_appsGridShownId);
            _appsGridShownId = null;
        }

        if (_idleId) {
            GLib.source_remove(_idleId);
            _idleId = null;
        }

        _restoreWindowsVisible();
    }

}
