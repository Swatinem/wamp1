
var Wamp = require('../');
var WebSocketServer = require('ws').Server;

describe('wamp1', function () {
	var wss = new WebSocketServer({port: 8080});
	var client;
	var server;
	it('should call back with the welcome message', function (done) {
		wss.once('connection', function (ws) {
			ws.send(JSON.stringify([0, "v59mbCGDXZ7WTyxB", 1, "Autobahn/0.5.1"]));
		});
		var client = new Wamp('ws://localhost:8080', function (welcome) {
			welcome.should.eql({
				sessionId: "v59mbCGDXZ7WTyxB",
				version: 1,
				server: "Autobahn/0.5.1"
			});
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
		client.on('event');
	});
	it('should support unsubscribing from events', function (done) {
		server.once('message', function (msg) {
			JSON.parse(msg).should.eql([6, 'event']);
			done();
		});
		client.off('event');
	});
	it('should route events to the correct callback', function (done) {
		client.on('http://example.com/simple', function (data) {
			data.should.eql("Hello, I am a simple event.");
			done();
		});
		server.send(JSON.stringify([8, "http://example.com/simple", "Hello, I am a simple event."]));
	});
	it.skip('should support multiple `on()` calls', function (done) {
		
	});
	it.skip('should support selective removal of event callbacks', function (done) {
		
	});
	describe('publish', function () {
		it('should allow publishing simple events', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null]);
				done();
			});
			client.emit('uri', null);
		});
		it('should allow publishing with excludesMe', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, true]);
				done();
			});
			client.emit('uri', null, true);
		});
		it('should allow publishing with exclude list', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, ['foo', 'bar']]);
				done();
			});
			client.emit('uri', null, ['foo', 'bar']);
		});
		it('should allow publishing with eligible list', function (done) {
			server.once('message', function (msg) {
				JSON.parse(msg).should.eql([7, 'uri', null, [], ['foo', 'bar']]);
				done();
			});
			client.emit('uri', null, [], ['foo', 'bar']);
		});
	});
	describe('calls', function () {
		it.skip('should allow simple calls', function (done) {
			server.once('message', function (msg) {
				server.send(JSON.stringify());
			});
			client.call('fn', function (err, res) {
				err.should.eql(null);
				res.should.eql(null);
				done();
			});
		});
		it.skip('should support complex arguments', function () {
			
		});
		it.skip('should support complex return objects', function () {
			
		});
		it.skip('should propagate errors', function () {
			
		});
	});
});

