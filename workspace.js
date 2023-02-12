'use strict';

const { Clutter, St, GObject } = imports.gi;
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
let _appsGridShownIds = new Set();

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

function _removeWindowDecorations(workspace) {
    let appsGridShownId = Main.overview.dash.showAppsButton.connect('notify::checked', () => {
        const windows = workspace._windows;
        if (windows.length) {
            windows.forEach(window => {
                window._closeButton.hide();
                window._title.hide();
            });
        }
        Main.overview.dash.showAppsButton.disconnect(appsGridShownId);
        _appsGridShownIds.delete(appsGridShownId);
    });
    _appsGridShownIds.add(appsGridShownId);
}

var CustomWorkspace = class {

    constructor() {

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

        _objectPrototype.injectOrOverrideFunction(Workspace.Workspace.prototype, '_init', true, function(metaWorkspace, monitorIndex, overviewAdjustment) {
            _removeWindowDecorations(this);
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

        if (_appsGridShownIds && _appsGridShownIds.size) {
            _appsGridShownIds.forEach(appsGridShownId => {
                Main.overview.dash.showAppsButton.disconnect(appsGridShownId);
            });
            _appsGridShownIds.clear();
            _appsGridShownIds = null;
        }
    }

}
