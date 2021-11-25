
const { St, GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;
const Workspace = imports.ui.workspace;

let _settings;

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

var CustomWorkspace = class {

    constructor() {

    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');

        _settings.connect('changed::hide-background', (settings) => {
            _show_or_hide_workspace_background();
        });
        _show_or_hide_workspace_background();
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
    }

}

// TODO Can't update stage views actor <unnamed>[<Gjs_Always-Show-Titles-In-Overview_gmail_com_workspace_WorkspaceBackground>:0x36d5af3563f8] is on because it needs an allocation.
var EmptyWorkspaceBackground = GObject.registerClass(
class WorkspaceBackground extends St.Widget {
    _init()  {
        super._init();
    }
});

