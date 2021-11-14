const { Gtk } = imports.gi;
const Lang = imports.lang;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Settings = new Lang.Class({
    Name: 'AlwaysShowTitlesInOverviewSettings',

    _init: function() {
        // Fix: _gtk_style_provider_private_get_settings: assertion 'GTK_IS_STYLE_PROVIDER_PRIVATE (provider)' failed
        // Gtk.init(null)

        this.load_ui();
    },

    load_ui: function() {
        log('Loading ui')
        this._builder = new Gtk.Builder();
        this._builder.add_from_file(Me.path + '/Settings.ui');
        this.notebook = this._builder.get_object('settings_notebook');

        log('Loaded ui')
    }
    
});

function buildPrefsWidget() {
    let settings = new Settings();
    let notebook = settings.notebook;
    return notebook;
}

function init() {

}
