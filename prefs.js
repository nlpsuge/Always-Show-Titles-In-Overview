const { Gtk, GObject, Gio } = imports.gi;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE = [5, 15, 25, 35, 45, 55, 60];

const Settings = new Lang.Class({
    Name: 'AlwaysShowTitlesInOverviewSettings',

    _init: function() {
        this._settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.always-show-titles-in-overview');
        this._renderUi();
        this._bindSettings();
    },

    _bindSettings: function() {
        this._settings.bind(
            'show-app-icon',
            this.show_app_icon_switch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        this._settings.connect('changed::app-icon-position', (settings) => {
            log('app-icon-position changed: ' + settings.get_string('app-icon-position'));
            this._render_app_icon_position();
        });

        this._settings.bind(
            'do-not-show-app-icon-when-fullscreen',
            this.do_not_show_app_icon_when_fullscreen_switch,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        // GtkScale has no property named value, so we can not bind GtkScale.value, 

        // Listen changes of window-active-size-inc, pass the changed value to GtkScale
        this._settings.connect('changed::window-active-size-inc', (settings) => {
            const window_active_size_inc_scale = settings.get_int('window-active-size-inc');
            log('window-active-size-inc changed: ' + window_active_size_inc_scale);
            this.window_active_size_inc_scale.set_value(window_active_size_inc_scale);
        });
    },


    _renderUi() {
        log('Rendering ui')
        this._builder = new Gtk.Builder();
        this._builder.set_scope(new BuilderScope(this));
        this._builder.add_from_file(Me.path + '/SettingsGtk4.ui');
        this.notebook = this._builder.get_object('settings_notebook');

        this.show_app_icon_switch = this._builder.get_object('show_app_icon_switch');
        this.show_app_icon_switch.connect('notify::active', (widget) => {
            const active = widget.active;
            log('show_app_icon_switch activate via lambda: ' + active);
            this._settings.set_boolean('show-app-icon', active);
            
            this.position_bottom_button.set_sensitive(active);
            this.position_middle_button.set_sensitive(active);
            this.do_not_show_app_icon_when_fullscreen_switch.set_sensitive(active);
        });

        this._render_app_icon_position();

        this.do_not_show_app_icon_when_fullscreen_switch = this._builder.get_object('do_not_show_app_icon_when_fullscreen_switch');
        this.do_not_show_app_icon_when_fullscreen_switch.connect('notify::active', (widget) => {
            const active = widget.active;
            log('do_not_show_app_icon_when_fullscreen_switch activate via lambda: ' + active);
            this._settings.set_boolean('do-not-show-app-icon-when-fullscreen', active);
        });

        this.window_active_size_inc_scale = this._builder.get_object('window_active_size_inc_scale');
        this.window_active_size_inc_scale.set_format_value_func((scale, value) => {
            return value + ' px';
        });

        let min = DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE[0];
        let max = DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE[DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE.length - 1];
        this.window_active_size_inc_scale.set_range(min, max);
        this.window_active_size_inc_scale.set_value(
            this._settings.get_int('window-active-size-inc'));
        DEFAULT_WINDOW_ACTIVE_SIZE_INC_RANGE.slice().forEach(num => {
            this.window_active_size_inc_scale.add_mark(num, Gtk.PositionType.TOP, num.toString());
        })

        // Listen changes of window_active_size_inc_scale, pass the changed value to Gio.Gsettings
        this.window_active_size_inc_scale.connect('value-changed', (scale) => {
            const value = scale.get_value();
            log('The current value is: ' + value);
            this._settings.set_int('window-active-size-inc', value);
        });

    },
    
    _render_app_icon_position() {
        this.position_middle_button = this._builder.get_object('position_middle_button');
        this.position_bottom_button = this._builder.get_object('position_bottom_button');
        this.app_icon_position = this._settings.get_string('app-icon-position');
        if (this.app_icon_position === 'Center') {
            this.position_middle_button.set_active(true);
        }
        else {
            this.position_bottom_button.set_active(true);
        }
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
        this._preferences._settings.set_string('app-icon-position', 'Bottom');
    }

    position_middle_button_clicked_cb(button) {
        log('middle button clicked: ' + button.get_active());
        this._preferences._settings.set_string('app-icon-position', 'Center');
    }
});

function buildPrefsWidget() {
    let settings = new Settings();
    let notebook = settings.notebook;
    return notebook;
}

function init() {

}
