# wamp1

Very simple WAMP v1 implementation

[![Build Status](https://travis-ci.org/Swatinem/wamp1.png?branch=master)](https://travis-ci.org/Swatinem/wamp1)
[![Coverage Status](https://coveralls.io/repos/Swatinem/wamp1/badge.png?branch=master)](https://coveralls.io/r/Swatinem/wamp1)
[![Dependency Status](https://gemnasium.com/Swatinem/wamp1.png)](https://gemnasium.com/Swatinem/wamp1)

## Installation

    $ npm install wamp1
    $ component install Swatinem/wamp1

## Rational

So far there is basically one WAMP implementation for the client side,
[AutobahnJS](https://github.com/tavendo/AutobahnJS).
It claims to be tiny without dependencies. It is actually >100K with a lot of
dependencies embedded. Plus it has a very ugly promises-based API.

I think I can do better :-)

**note**: This only implements WAMP1, which is fundamentally different from
the still working draft WAMP2, which is *a lot* more complex.

**note**: This does not include WAMP-CRA, that should be a separate library on
top of this one.

## Usage

### new Wamp(url, [callback])

Creates a websocket connection to `url` and optionally calls `callback` with the
resulting welcome message.

### wamp.socket

This is the underlying WebSocket object. It is using
[ws](https://github.com/einaros/ws) in node and
[stagas/websocket](https://github.com/stagas/websocket) in component, both
of which have the same API.

### wamp.on(event, callback)

Wamp will forward any event that was subcribed to to a generic `event` event.
It will emit a `error` event in case the protocol version is not supported or
in case the server sends callresults that were not requested.

### wamp.sessionId

This property reflects the session id that the server generates and sends via
the handshake.

### wamp.subscribe(event, callback)

Subscribe to `event` on the server. The `callback` is called when the server
sends that event.

### wamp.unsubscribe(event, [callback])

Unsubscribe from `event` on the server. This takes care of multiple listeners
for you.

### wamp.publish(event, data, [excludeMe] | [exclude] , [eligible])

Publish an `event` with `data` to the server.
See the [spec](http://wamp.ws/spec/#publish_message) for the optional arguments
that control the users getting this event.

### wamp.prefix(prefix, uri)

This registers the `prefix` as `uri` on the server.
Really, using complete URIs as event identifiers is just overkill, better to use
simple names to begin with.

### wamp.call(method, [args…], callback(error, result))

This calls `method` remotely on the server, passing in `args`.
The `callback` is called either with an `error` or with the `result` from the
server.

## License

  LGPLv3

