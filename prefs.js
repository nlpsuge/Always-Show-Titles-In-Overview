const { Gtk, GObject } = imports.gi;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE = [5, 10, 15, 20];

const Settings = new Lang.Class({
    Name: 'AlwaysShowTitlesInOverviewSettings',

    _init: function() {
        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        this._renderUi();
        this._bindSettings();
    },

    _bindSettings: function() {
        // this._settings.bind();
    },


    _renderUi() {
        log('Rendering ui')
        this._builder = new Gtk.Builder();
        this._builder.set_scope(new BuilderScope(this));
        this._builder.add_from_file(Me.path + '/SettingsGtk4.ui');
        this.notebook = this._builder.get_object('settings_notebook');

        this._builder.get_object('multimon_multi_switch').connect('notify::active', Lang.bind (this, function(widget) {
            log('switch activate via `Lang.bind (this, function(widget) {}`: ' + widget);

        }));

        this._builder.get_object('multimon_multi_switch').connect('notify::active', (widget) => {
            log('switch activate via lambda: ' + widget);

        });

        let window_active_size_inc_scale = this._builder.get_object('window_active_size_inc_scale');
        this.window_active_size_inc_scale = window_active_size_inc_scale;
        window_active_size_inc_scale.set_format_value_func((scale, value) => {
            return value + ' px';
        });

        let min = DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE[0];
        let max = DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE[DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE.length - 1];
        window_active_size_inc_scale.set_range(min, max);
        window_active_size_inc_scale.set_value(10);
        DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE.slice().forEach(num => {
            window_active_size_inc_scale.add_mark(num, Gtk.PositionType.TOP, num.toString());
        })

        window_active_size_inc_scale.connect('value-changed', (scale, value) => {
            log('The current value is: ' + scale.get_value());
        });

    }
    
});

const BuilderScope = GObject.registerClass({
    GTypeName: "AlwaysShowTitlesInOverviewBuilderScope",
    Implements: [Gtk.BuilderScope],
}, class BuilderScope extends GObject.Object {
    _init(preferences) {
        this._preferences = preferences;
        super._init();
    }

    // Fix: Gtk.BuilderError: Creating closures is not supported by Gjs_BuilderScope
    // https://docs.w3cub.com/gtk~4.0/gtkbuilder#gtk-builder-create-closure
    vfunc_create_closure(builder, handlerName, flags, connectObject) {
        if (flags & Gtk.BuilderClosureFlags.SWAPPED)
            throw new Error('Unsupported template signal flag "swapped"');

        if (typeof this[handlerName] === 'undefined')
            throw new Error(`${handlerName} is undefined`);

        return this[handlerName].bind(connectObject || this);
    }

    position_bottom_button_clicked_cb(button) {
        log('bottom button clicked: ' + button.get_active());

    }

    position_middle_button_clicked_cb(button) {
        log('middle button clicked: ' + button.get_active());

    }
});

function buildPrefsWidget() {
    let settings = new Settings();
    let notebook = settings.notebook;
    return notebook;
}

function init() {

}
