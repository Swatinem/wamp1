/* vim: set shiftwidth=2 tabstop=2 noexpandtab textwidth=80 wrap : */
"use strict";

var should = require('should');
var WebSocketServer = require('ws').Server;

var Wamp = require('../');

describe('wamp1', function () {
	var wss = new WebSocketServer({port: 8080});
	var client;
	var server;
	it('should call back with the welcome message', function (done) {
		wss.once('connection', function (ws) {
			ws.send(JSON.stringify([0, "v59mbCGDXZ7WTyxB", 1, "Autobahn/0.5.1"]));
		});
		new Wamp('ws://localhost:8080', function (welcome) {
			welcome.should.eql({
				sessionId: "v59mbCGDXZ7WTyxB",
				version: 1,
				server: "Autobahn/0.5.1"
			});
			done();
		});
	});
	it('should reject servers with unsupported versions', function (done) {
		wss.once('connection', function (ws) {
			ws.send(JSON.stringify([0, "v59mbCGDXZ7WTyxB", 2, "Autobahn/0.5.1"]));
		});
		var client = new Wamp('ws://localhost:8080', function () {
			throw new Error('unreached');
		});
		client.on('error', function (err) {
			err.message.should.eql('Server "Autobahn/0.5.1" uses incompatible protocol version 2');
			done();
		});
	});
	beforeEach(function (done) {
		wss.once('connection', function (ws) {
			server = ws;
			ws.send(JSON.stringify([0, "v59mbCGDXZ7WTyxB", 1, "Autobahn/0.5.1"]));
		});
		client = new Wamp('ws://localhost:8080', function () {
			done();
		});
	});
	it('should save the sessionId', function () {
		client.sessionId.should.eql("v59mbCGDXZ7WTyxB");
	});
	it('should send out prefix messages', function (done) {
		server.once('message', function (msg) {
			JSON.parse(msg).should.eql([1, "calc", "http://example.com/simple/calc#"]);
			done();
		});
		client.prefix('calc', 'http://example.com/simple/calc#');
	});
	it('should support subscribing to events', function (done) {
		server.once('message', function (msg) {
			JSON.parse(msg).should.eql([5, 'event']);
			done();
		});
		client.subscribe('event', function () {});
	});
	it('should support unsubscribing from events', function (done) {
		server.once('message', function (msg) {
			JSON.parse(msg).should.eql([6, 'event']);
			done();
		});
		client.unsubscribe('event');
	});
	it('should route events to the correct callback', function (done) {
		client.subscribe('http://example.com/simple', function (data) {
			data.should.eql("Hello, I am a simple event.");
			done();
		});
		server.send(JSON.stringify([8, "http://example.com/simple", "Hello, I am a simple event."]));
	});
	it('should support multiple `subscribe()` calls', function (done) {
		var servercalls = 0;
		var clientcalls = 0;
		server.on('message', function (msg) {
			servercalls++;
			JSON.parse(msg).should.eql([5, 'event']);
			server.send(JSON.stringify([8, 'event', 'foo']));
		});
		client.subscribe('event', function (ev) {
			clientcalls++;
			ev.should.eql('foo');
		});
		client.subscribe('event', function (ev) {
			ev.should.eql('foo');
			servercalls.should.eql(1);
			clientcalls.should.eql(1);
			done();
		});
	});
	it('should support selective removal of event callbacks', function (done) {
		var servercalls = 0;
		server.on('message', function (msg) {
			servercalls++;
			JSON.parse(msg).should.eql([5, 'event']);
			server.send(JSON.stringify([8, 'event', 'foo']));
		});
		var fn = function () {
			throw new Error('unreached');
		};
		client.subscribe('event', fn);
		client.subscribe('event', function (ev) {
			ev.should.eql('foo');
			servercalls.should.eql(1);
			done();
		});
		client.unsubscribe('event', fn);
	});
	it('should support a generic `event` event', function (done) {
		client.on('event', function (ev, data) {
			ev.should.eql('event');
			data.should.eql('foobar');
			done();
		});
		server.send(JSON.stringify([8, "event", "foobar"]));
	});
	describe('publish', function () {
		it('should allow publishing simple events', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null]);
				done();
			});
			client.publish('uri', null);
		});
		it('should allow publishing with excludesMe', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, true]);
				done();
			});
			client.publish('uri', null, true);
		});
		it('should allow publishing with exclude list', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, ['foo', 'bar']]);
				done();
			});
			client.publish('uri', null, ['foo', 'bar']);
		});
		it('should allow publishing with eligible list', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, [], ['foo', 'bar']]);
				done();
			});
			client.publish('uri', null, [], ['foo', 'bar']);
		});
	});
	describe('calls', function () {
		it('should allow "fire and forget" without a callback', function (done) {
			server.once('message', function (msg) {
				msg = JSON.parse(msg);
				msg[2].should.eql('fn');
				msg[3].should.eql('arg');
				server.send(JSON.stringify([3, msg[1], null]));
				done();
			});
			client.call('fn', 'arg');
		});
		it('should allow simple calls', function (done) {
			server.once('message', function (msg) {
				msg = JSON.parse(msg);
				msg[2].should.eql('fn');
				msg.should.have.length(3);
				server.send(JSON.stringify([3, msg[1], null]));
			});
			client.call('fn', function (err, res) {
				should.not.exist(err);
				should.not.exist(res);
				done();
			});
		});
		it('should support complex arguments', function (done) {
			server.once('message', function (msg) {
				msg = JSON.parse(msg);
				msg[2].should.eql('fn');
				msg.slice(3).should.eql(['foo', {bar: 'foobar'}, true, null]);
				server.send(JSON.stringify([3, msg[1], null]));
			});
			client.call('fn', 'foo', {bar: 'foobar'}, true, null, function (err, res) {
				should.not.exist(err);
				should.not.exist(res);
				done();
			});
		});
		it('should support complex return objects', function (done) {
			var data = {one: {complex: 'object', with: [true, null]}};
			server.once('message', function (msg) {
				msg = JSON.parse(msg);
				msg[2].should.eql('fn');
				server.send(JSON.stringify([3, msg[1], data]));
			});
			client.call('fn', function (err, res) {
				should.not.exist(err);
				res.should.eql(data);
				done();
			});
		});
		it('should propagate errors', function (done) {
			server.once('message', function (msg) {
				msg = JSON.parse(msg);
				server.send(JSON.stringify([4, msg[1], 'error1', 'description', 'details']));
			});
			client.call('fn', function (err, res) {
				should.not.exist(res);
				err.should.be.instanceof(Error);
				err.message.should.eql('description');
				err.uri.should.eql('error1');
				err.details.should.eql('details');
				done();
			});
		});
		it('should error on not matching results', function (done) {
			client.on('error', function (err) {
				err.message.should.eql('Unmatched callresult received from server');
				err.type.should.eql('callresult');
				err.callId.should.eql('2');
				(err.result === null).should.be.true; // jshint ignore:line
				done();
			});
			server.send(JSON.stringify([3, '2', null]));
		});
		it('should error on not matching errors', function (done) {
			client.on('error', function (err) {
				err.message.should.eql('Unmatched callerror received from server');
				err.type.should.eql('callerror');
				err.callId.should.eql('2');
				err.error.message.should.eql('description');
				err.error.uri.should.eql('error1');
				err.error.details.should.eql('details');
				done();
			});
				server.send(JSON.stringify([4, '2', 'error1', 'description', 'details']));
		});
	});
});

