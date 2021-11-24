
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;

const ObjectPrototype = Me.imports.utils.objectPrototype

let _objectPrototype;

let _settings;

let _nWorkspacesNotifyId;

/**
 * windowPreview._workspace._background is a Widget, so we can just hide it
 *
 * @param   {_workspacesViews} _workspacesViews instances of WorkspacesView
 * @returns {void}
 */
function _show_or_hide_background(workspacesDisplay) {
    print('workspacesDisplay: ' + workspacesDisplay);
    // workspacesDisplay._workspacesViews is undefined
    // if drag a window to the last workspace to create more workspaces
    const _workspacesView = workspacesDisplay._workspacesViews[0];
    for (const workspace of _workspacesView._workspaces) {
        const hide_background = _settings.get_boolean('hide-background');
        if (hide_background) {
            workspace._background.hide();
        } else {
            workspace._background.show();
        }
    }
}

var ASTIOWorkspace = class {

    constructor() {

    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        _objectPrototype = new ObjectPrototype.ObjectPrototype()

        WorkspacesView.WorkspacesDisplay.prototype._show_or_hide_background = _show_or_hide_background;

        _objectPrototype.injectOrOverrideFunction(WorkspacesView.WorkspacesDisplay.prototype, 'prepareToEnterOverview', true, function(){
            print("prepareToEnterOverview.... " + this._workspacesViews.length);
            let workspacesDisplay = this;

            this._show_or_hide_background(workspacesDisplay);

            let workspaceManager = global.workspace_manager;

            _nWorkspacesNotifyId =
                workspaceManager.connect('notify::n-workspaces',
                    this._show_or_hide_background.bind(workspacesDisplay));

            print('_nWorkspacesNotifyId -> ' + _nWorkspacesNotifyId);
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
            _objectPrototype.removeInjections(WorkspacesView.WorkspacesDisplay.prototype);
            _objectPrototype = null;    
        }

        if (_nWorkspacesNotifyId) {
            let workspaceManager = global.workspace_manager;
            workspaceManager.disconnect(_nWorkspacesNotifyId);
        }
        
    }

} 