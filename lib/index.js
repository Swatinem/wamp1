
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
			var version = message[1];
			var server = message[2];
			if (version !== 1) {
				return this._emit('_error_', new Error('Server "' + server +
					'" uses incompatible protocol version ' + version));
			}
			this.sessionId = message[0];
			this._welcomecb({
				sessionId: this.sessionId,
				version: version,
				server: message[2]
			});
		break;
		case 'event':
			this._emit(message[0], message[1]);
		break;
		case 'callresult':
		case 'callerror':
			var callno = message[0];
			var fn = this._calls[callno];
			delete this._calls[callno];
			var result = message[1];
			if (type == 'callerror') {
				var result = new Error(message[2]);
				result.uri = message[1];
				if (message.length = 4)
					result.details = message[3];
			}
			if (!fn) {
				var error = new Error('Unmatched ' + type + ' received from server');
				error.type = type;
				error.callId = callno;
				error[type == 'callerror' ? 'error' : 'result'] = result;
				return this._emit('_error_', error);
			}
			if (type == 'callresult') {
				fn(undefined, result);
			} else {
				fn(result);
			}
		break;
	}
};

function special(uri) {
	return ~['_error_', '_event_'].indexOf(uri);
}

Wamp.prototype._emit = function Wamp__emit(event, data) {
	if (!special(event)) {
		this._emit('_event_', [event, data]);
	}
	if (event !== '_event_')
		data = [data];
	(this._listeners[event] || []).forEach(function (fn) {
		fn.apply(null, data);
	});
};

Wamp.prototype.prefix = function Wamp_prefix(prefix, uri) {
	this._send([type('prefix'), prefix, uri]);
};

// TODO: cleanly separate `.on()` and `.subscribe`. This is very confusing
// right now
Wamp.prototype.on = function Wamp_on(uri, fn) {
	(this._listeners[uri] = this._listeners[uri] || []).push(fn);
	if (!special(uri) && this._listeners[uri].length == 1)
		this._send([type('subscribe'), uri]);
};

Wamp.prototype.off = function Wamp_off(uri, fn) {
	var list = this._listeners[uri];
	if (fn) {
		var i = list.indexOf(fn);
		list.splice(i, 1);
		if (list.length)
			return;
	}
	delete this._listeners[uri];
	if (!special(uri))
		this._send([type('unsubscribe'), uri]);
};

Wamp.prototype.emit = function Wamp_emit() {
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
