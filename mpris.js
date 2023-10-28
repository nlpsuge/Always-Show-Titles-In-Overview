'use strict';

const { Gio, GObject, Shell, St } = imports.gi;

const { loadInterfaceXML } = imports.misc.fileUtils;

const DBusIface = loadInterfaceXML('org.freedesktop.DBus');
const DBusProxy = Gio.DBusProxy.makeProxyWrapper(DBusIface);

const MprisIface = loadInterfaceXML('org.mpris.MediaPlayer2');
const MprisProxy = Gio.DBusProxy.makeProxyWrapper(MprisIface);

const MprisPlayerIface = loadInterfaceXML('org.mpris.MediaPlayer2.Player');
const MprisPlayerProxy = Gio.DBusProxy.makeProxyWrapper(MprisPlayerIface);

const MPRIS_PLAYER_PREFIX = 'org.mpris.MediaPlayer2.';

var Mpris = class {

    constructor() {
        this._proxy = new DBusProxy(Gio.DBus.session,
            'org.freedesktop.DBus',
            '/org/freedesktop/DBus',
            this._onProxyReady.bind(this));
    }

    async _onProxyReady() {
        // const [names] = await this._proxy.ListNamesAsync();
        // names.forEach(name => {
        //     if (!name.startsWith(MPRIS_PLAYER_PREFIX))
        //         return;

        //     this._addPlayer(name);
        // });
        this._proxy.connectSignal('NameOwnerChanged',
                                  this._onNameOwnerChanged.bind(this));
    }

    _onNameOwnerChanged(proxy, sender, [name, oldOwner, newOwner]) {
        if (!name.startsWith(MPRIS_PLAYER_PREFIX))
            return;

        if (newOwner && !oldOwner)
            this._addPlayer(name);
    }

    _addPlayer(busName) {
        this._mprisProxy = new MprisProxy(Gio.DBus.session, busName,
            '/org/mpris/MediaPlayer2',
            null);
        this._playerProxy = new MprisPlayerProxy(Gio.DBus.session, busName,
            '/org/mpris/MediaPlayer2',
            this._onPlayerProxyReady.bind(this));
        
        log(this._mprisProxy)
        log(this._mprisProxy.DesktopEntry)
        let app;
        if(this._mprisProxy.DesktopEntry) {
            let desktopId = `${this._mprisProxy.DesktopEntry}.desktop`;
            app = Shell.AppSystem.get_default().lookup_app(desktopId);
        }
        log(app)

        

    }

    async getPlayingWindow() {
        const [names] = await this._proxy.ListNamesAsync();
        names.forEach(name => {
            if (!name.startsWith(MPRIS_PLAYER_PREFIX))
                return;

            this._addPlayer(name);
        });
    }

    _onPlayerProxyReady() {
        this._playerProxy.connectObject(
            'g-properties-changed', () => this._updateState(), this);
        this._updateState();
    }

    _updateState() {
        let metadata = {};
        for (let prop in this._playerProxy.Metadata)
            metadata[prop] = this._playerProxy.Metadata[prop].deepUnpack();
            
        log(JSON.stringify(metadata))
        
        this._trackTitle = metadata['xesam:title'];
        if (typeof this._trackTitle !== 'string') {
            if (typeof this._trackTitle !== 'undefined') {
                log(`Received faulty track title metadata from ${
                    this._busName}; expected a string, got ${
                    this._trackTitle} (${typeof this._trackTitle})`);
            }
            
        }
        log(this._trackTitle)

    }




}