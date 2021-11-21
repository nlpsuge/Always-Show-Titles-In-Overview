
const ExtensionUtils = imports.misc.extensionUtils;
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;


let _settings;

/**
 * windowPreview._workspace._background is a Widget, so we can just hide it
 *
 * @param   {Object} instance of WindowPreview
 * @returns {void}
 */
// function _show_or_hide_background() {
//
//
//     let workspaceManager = global.workspace_manager;
//     for (let w = 0; w < workspaceManager.n_workspaces; w++) {
//         let workspace = workspaceManager.get_workspace_by_index(w);
//         print('workspace: ' + workspace);
//
//         // const hide_background = _settings.get_boolean('hide-background');
//         // if (hide_background) {
//
//         //     workspace._background.hide();
//         // } else {
//         //     workspace._background.show();
//         // }
//     }
//
// }

var ASTIOWorkspace = class {

    constructor() {

    }

    enable() {
        print('astioWorkspace enable ...');
        print('Main.layoutManager.overviewGroup: ' + Main.layoutManager.overviewGroup);
        
        // const overview_chilren = Main.layoutManager.overviewGroup.get_children();
        // for (const child of overview_chilren) {
        //     if (child instanceof Overview.OverviewActor) {
        //         const controls = child.controls;
        //         const _workspacesDisplay = controls._workspacesDisplay;
        //         const _workspacesViews = _workspacesDisplay._workspacesViews;
        //         for (const _workspacesView of _workspacesViews) {
        //             print('ui_overview_OverviewActor.controls._workspacesDisplay._workspacesViews._workspacesView: ' + _workspacesView);
        //         }


        //         print('ui_overview_OverviewActor: ' + child);
        //         print('ui_overview_OverviewActor.controls: ' + controls);
        //         print('ui_overview_OverviewActor.controls._workspacesDisplay: ' + _workspacesDisplay);
        //         print('ui_overview_OverviewActor.controls._workspacesDisplay._workspacesViews: ' + _workspacesViews);
        //     }
        // }

        // print('Main.layoutManager.overviewGroup.get_children(): ' + overview_chilren);
        // print('Main.overview.controls: ' + Main.overview.controls);

        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');

        // WorkspacesView.WorkspacesView.prototype._oldUpdateWorkspaces = WorkspacesView.WorkspacesView.prototype._updateWorkspaces; 
        // WorkspacesView.WorkspacesView.prototype._updateWorkspaces = function _updateWorkspaces() {
        //     print('this is: ' + this);
        //     print('this._workspaces is: ' + this._workspaces);


            // WorkspacesView.WorkspacesView.prototype._oldUpdateWorkspaces();
            
            // for (workspace of this._workspaces) {
            //     print('workspace: ' + workspace);
            //     // _show_or_hide_background();
            //     const hide_background = _settings.get_boolean('hide-background');
            //     if (hide_background) {
            //         workspace._background.hide();
            //     } else {
            //         workspace._background.show();
            //     }
            // }
            
        // }
    }

    disable() {
        // Destroy the created object
        if (_settings) {
            // GObject.Object.run_dispose(): Releases all references to other objects.
            _settings.run_dispose();
            _settings = null;
        }
        
        Workspace.Workspace.prototype._updateWorkspaces = Workspace.Workspace.prototype._oldUpdateWorkspaces;
    }

} 