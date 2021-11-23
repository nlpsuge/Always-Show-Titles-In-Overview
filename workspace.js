
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;

const ObjectPrototype = Me.imports.utils.objectPrototype

let _objectPrototype;

let _settings;

/**
 * windowPreview._workspace._background is a Widget, so we can just hide it
 *
 * @param   {workspaceView} workspaceView instance of WorkspacesView
 * @returns {void}
 */
function _show_or_hide_background(workspaceView) {
    const hide_background = _settings.get_boolean('hide-background');
    if (hide_background) {
        workspaceView._background.hide();
    } else {
        workspaceView._background.show();
    }
}

var ASTIOWorkspace = class {

    constructor() {

    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        _objectPrototype = new ObjectPrototype.ObjectPrototype()

        _objectPrototype.injectOrOverrideFunction(WorkspacesView.WorkspacesDisplay.prototype, 'prepareToEnterOverview', true, function(){
            const _workspacesView = this._workspacesViews[0];
            for (const workspace of _workspacesView._workspaces) {
                _show_or_hide_background(workspace);
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
            _objectPrototype.removeInjections(WorkspacesView.WorkspacesDisplay.prototype);
            _objectPrototype = null;    
        }
        
    }

} 