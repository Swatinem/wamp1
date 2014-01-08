
// thank god they have the same api :-)
var ws;
try {
	// node
	ws = require('ws');
} catch (e) {
	// component
	ws = require('websocket');
}

var slice = [].slice;

module.exports = Wamp;

function Wamp(host, fn) {
	this.socket = new ws(host);
	this.socket.on('message', this._handle.bind(this));
	this.sessionId = undefined;
	this._welcomecb = fn;
	this._listeners = {};
	this._calls = {};
	this._callsno = 0;
}

Wamp.types = Wamp.prototype.types = [
	'welcome',
	'prefix',
	'call',
	'callresult',
	'callerror',
	'subscribe',
	'unsubscribe',
	'publish',
	'event',
];

function type(type) {
	return Wamp.types.indexOf(type);
}

Wamp.prototype._send = function Wamp__send(json) {
	this.socket.send(JSON.stringify(json));
};

Wamp.prototype._handle = function Wamp__handle(message) {
	message = JSON.parse(message);
	var type = this.types[message.shift()];
	switch (type) {
		case 'welcome':
			this.sessionId = message[0];
			// TODO: maybe error when the server advertises version 2?
			this._welcomecb({
				sessionId: message[0],
				version: message[1],
				server: message[2]
			});
		break;
		case 'event':
			(this._listeners[message[0]] || []).forEach(function (fn) {
				fn(message[1]);
			});
		break;
		// TODO: call rounting
		case 'callresult':
			
		break;
		case 'callerror':
			
		break;
	}
};

Wamp.prototype.prefix = function Wamp_prefix(prefix, uri) {
	this._send([type('prefix'), prefix, uri]);
};

Wamp.prototype.on = function Wamp_on(uri, fn) {
	(this._listeners[uri] = this._listeners[uri] || []).push(fn);
	this._send([type('subscribe'), uri]);
};

Wamp.prototype.off = function Wamp_off(uri) {
	delete this._listeners[uri];
	this._send([type('unsubscribe'), uri]);
};

Wamp.prototype.emit = function Wamp_emit() {
	this._send([type('publish')].concat(slice.call(arguments)));
};

Wamp.prototype.call = function Wamp_call(uri) {
	var args = slice.call(arguments, 1);
	var fn = args.pop();
	var callid = (this._callsno++).toString();
	this._calls[callid] = fn;
	this._send([type('call'), callid, uri].concat(args));
};
