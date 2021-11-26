
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

function _show_or_hide_workspace_background() {
    const hide_background = _settings.get_boolean('hide-background');
    if (hide_background) {
        Workspace.OriginalWorkspaceBackground = Workspace.WorkspaceBackground;
        Workspace.WorkspaceBackground = EmptyWorkspaceBackground;
    } else {
        if (Workspace.OriginalWorkspaceBackground) {
            Workspace.WorkspaceBackground = Workspace.OriginalWorkspaceBackground;
        }
    }
}

function _animateFromOverview(windowPreview, animate) {
    if (!windowPreview._workspace.metaWorkspace.active) {
        return;
    }
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

var CustomWorkspace = class {

    constructor() {

    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        _objectPrototype = new ObjectPrototype.ObjectPrototype();

        _settings.connect('changed::hide-background', (settings) => {
            _show_or_hide_workspace_background();
        });
        _show_or_hide_workspace_background();

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

        if (Workspace.OriginalWorkspaceBackground) {
            Workspace.WorkspaceBackground = Workspace.OriginalWorkspaceBackground;
            Workspace.OriginalWorkspaceBackground = null;
        }

        if (_objectPrototype) {
            _objectPrototype.removeInjections(Workspace.Workspace.prototype);
            _objectPrototype = null;
        }
    }

}

// TODO Can't update stage views actor <unnamed>[<Gjs_Always-Show-Titles-In-Overview_gmail_com_workspace_WorkspaceBackground>:0x36d5af3563f8] is on because it needs an allocation.
var EmptyWorkspaceBackground = GObject.registerClass(
class WorkspaceBackground extends St.Widget {
    _init()  {
        super._init();
    }
});

