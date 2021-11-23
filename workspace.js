
const ExtensionUtils = imports.misc.extensionUtils;
const WorkspacesView = imports.ui.workspacesView;
const Main = imports.ui.main;
const Overview = imports.ui.overview;


let windowOverlayInjections = {};
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

function removeInjection(objectPrototype, injection, functionName) {
    if (injection[functionName] === undefined) {
        delete objectPrototype[functionName];
    } else {
        objectPrototype[functionName] = injection[functionName];
    }
}

var ASTIOWorkspace = class {

    constructor() {

    }

    enable() {
        _settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');

        windowOverlayInjections['prepareToEnterOverview'] = injectToFunction(WorkspacesView.WorkspacesDisplay.prototype, 'prepareToEnterOverview', function(){
            const _workspacesView = this._workspacesViews[0];
            for (const workspace of _workspacesView._workspaces) {
                _show_or_hide_background(workspace);
            }
        });
    }

    disable() {
        for (let functionName in windowOverlayInjections) {
            removeInjection(WorkspacesView.WorkspacesDisplay.prototype, windowOverlayInjections, functionName);
        }

        windowOverlayInjections = {};

        // Destroy the created object
        if (_settings) {
            // GObject.Object.run_dispose(): Releases all references to other objects.
            _settings.run_dispose();
            _settings = null;
        }
        
    }

} 