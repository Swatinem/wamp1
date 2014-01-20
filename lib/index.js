/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
"use strict";

var ws = require('websocket-buffering');
var Emitter;
try {
	// node
	Emitter = require('events').EventEmitter;
} catch (e) {
	// component
	Emitter = require('emitter');
}

var slice = [].slice;

module.exports = Wamp;

function Wamp(host, fn) {
	Emitter.call(this);
	if (typeof host === 'string')
		this.socket = new ws(host);
	else
		this.socket = host;
	this.socket.on('message', this._handle.bind(this));
	this.sessionId = undefined;
	this._welcomecb = fn || function () {};
	this._listeners = {};
	this._prefixes = {};
	this._calls = {};
	this._callsno = 0;
}

Wamp.prototype = Object.create(Emitter.prototype);

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

function type(t) {
	return Wamp.types.indexOf(t);
}

Wamp.prototype._send = function Wamp__send(json) {
	this.socket.send(JSON.stringify(json));
};

Wamp.prototype._handle = function Wamp__handle(message) {
	message = JSON.parse(message);
	var type = this.types[message.shift()];
	switch (type) {
		case 'welcome':
			this._handleWelcome(message);
		break;
		case 'event':
			this._handleEvent(message[0], message[1]);
		break;
		case 'callresult':
		case 'callerror':
			var callno = message[0];
			var fn = this._calls[callno];
			delete this._calls[callno];
			var result = message[1];
			if (type === 'callerror') {
				result = new Error(message[2]);
				result.uri = message[1];
				if (message.length === 4)
					result.details = message[3];
			}
			if (!fn) {
				var error = new Error('Unmatched ' + type + ' received from server');
				error.type = type;
				error.callId = callno;
				error[type === 'callerror' ? 'error' : 'result'] = result;
				return this.emit('error', error);
			}
			if (type === 'callresult') {
				fn(undefined, result);
			} else {
				fn(result);
			}
		break;
	}
};

Wamp.prototype._handleWelcome = function Wamp__handleWelcome(msg) {
	var version = msg[1];
	var server = msg[2];
	if (version !== 1) {
		return this.emit('error', new Error('Server "' + server +
			'" uses incompatible protocol version ' + version));
	}
	// TODO: maybe make this configurable?
	// re-send all the previously registered prefixes and subscriptions
	// but not on the very first welcome, this interacts badly with buffering
	// socket implementations, such as `Swatinem/websocket-buffering`
	if (this.sessionId) {
		for (var prefix in this._prefixes) {
			var expanded = this._prefixes[prefix];
			this._send([type('prefix'), prefix, expanded]);
		}
		for (var uri in this._listeners) {
			this._send([type('subscribe'), uri]);
		}
	}
	this.sessionId = msg[0];
	this._welcomecb({
		sessionId: this.sessionId,
		version: version,
		server: server
	});
};

Wamp.prototype._handleEvent = function Wamp__handleEvent(event, data) {
	this.emit('event', event, data);
	// emit the original version straight away
	this._emit(event, data);
	for (var prefix in this._prefixes) {
		var expanded = this._prefixes[prefix];
		prefix = prefix + ':';
		if (event.indexOf(prefix) === 0) {
			// if the prefix matches, also emit the expanded version
			return this._emit(expanded + event.slice(prefix.length), data);
		} else if (event.indexOf(expanded) === 0) {
			// similarly, also emit the prefixed version if the expanded matches
			return this._emit(prefix + event.slice(expanded.length), data);
		}
	}
};

Wamp.prototype._emit = function Wamp__emit(event, data) {
	(this._listeners[event] || []).forEach(function (fn) {
		fn(data);
	});
};

Wamp.prototype.prefix = function Wamp_prefix(prefix, uri) {
	this._prefixes[prefix] = uri;
	this._send([type('prefix'), prefix, uri]);
};

Wamp.prototype.subscribe = function Wamp_subscribe(uri, fn) {
	(this._listeners[uri] = this._listeners[uri] || []).push(fn);
	if (this._listeners[uri].length === 1)
		this._send([type('subscribe'), uri]);
};

Wamp.prototype.unsubscribe = function Wamp_unsubscribe(uri, fn) {
	var list = this._listeners[uri];
	if (fn) {
		var i = list.indexOf(fn);
		list.splice(i, 1);
		if (list.length)
			return;
	}
	delete this._listeners[uri];
	this._send([type('unsubscribe'), uri]);
};

Wamp.prototype.publish = function Wamp_emit() {
	this._send([type('publish')].concat(slice.call(arguments)));
};

Wamp.prototype.call = function Wamp_call(uri) {
	var args = slice.call(arguments, 1);
	var fn = args.pop();
	if (typeof fn !== 'function') {
		// add back the argument, and add a bogus function
		args.push(fn);
		fn = function () {};
	}
	var callid = (this._callsno++).toString();
	this._calls[callid] = fn;
	this._send([type('call'), callid, uri].concat(args));
};
