var async = require('async');
var isFunction = require('lodash.isfunction');

var test = require('tape');
var oneAtATime = require('../oneatatime');

function eventually(effect, callback) {
    if (isFunction(effect))
        setImmediate(eventually, effect(), callback);
    else
        setImmediate(callback, null, effect);
}

function TracedCount() {
    this.trace = [];
    this.count = 0;
    for (var prop in this)
        if (isFunction(this[prop]))
            this[prop] = this[prop].bind(this);
}

TracedCount.prototype.inc = function() {
    this.trace.push(['+', ++this.count]);
    return this.count;
};

TracedCount.prototype.dec = function incDecTracedCount() {
    this.trace.push(['-', --this.count]);
    return this.count;
};

TracedCount.prototype.incThenDec = function incDecTracedCount() {
    this.inc();
    return this.dec;
};

TracedCount.prototype.tracer = function countTracer(done) {
    return function(err, got) {
        if (err) return done(err);
        this.trace.push(['=', got]);
        done(null, got);
    }.bind(this);
};

test('What we want to avoid', function(assert) {
    assert.plan(3);
    var trace = new TracedCount();
    async.parallel({
        a: function(done) {eventually(trace.incThenDec, trace.tracer(done));},
        b: function(done) {eventually(trace.incThenDec, trace.tracer(done));},
        c: function(done) {eventually(trace.incThenDec, trace.tracer(done));},
    }, function(err, results) {
        assert.ifError(err);
        assert.deepEqual(results, {a: 2, b: 1, c: 0});
        assert.deepEqual(trace.trace, [
            [ '+', 1 ], [ '+', 2 ], [ '+', 3 ],
            [ '-', 2 ], [ '-', 1 ], [ '-', 0 ],
            [ '=', 2 ], [ '=', 1 ], [ '=', 0 ],
        ]);
        assert.end();
    });
});

test('Now with oneAtATime', function(assert) {
    assert.plan(3);
    var trace = new TracedCount();
    var onceEventually = oneAtATime(eventually);
    async.parallel({
        a: function(done) {onceEventually(trace.incThenDec, trace.tracer(done));},
        b: function(done) {onceEventually(trace.incThenDec, trace.tracer(done));},
        c: function(done) {onceEventually(trace.incThenDec, trace.tracer(done));},
    }, function(err, results) {
        assert.ifError(err);
        assert.deepEqual(results, {a: 0, b: 0, c: 0});
        assert.deepEqual(trace.trace, [
            [ '+', 1 ],
            [ '-', 0 ],
            [ '=', 0 ], [ '=', 0 ], [ '=', 0 ],
        ]);
        assert.end();
    });
});

test('Now with oneAtATime.justCallFirst', function(assert) {
    assert.plan(3);
    var trace = new TracedCount();
    var onceEventually = oneAtATime.justCallFirst(eventually);

    onceEventually(trace.incThenDec, trace.tracer(function(err, got) {
        assert.ifError(err);
        assert.equal(got, 0);
        assert.deepEqual(trace.trace, [
            [ '+', 1 ],
            [ '-', 0 ],
            [ '=', 0 ],
        ]);
        setImmediate(assert.end); // XXX bind?
    }));
    onceEventually(trace.incThenDec, trace.tracer(function(err, got) {
        assert.ifError(err);
        assert.fail("shouldn't call second callback", got);
    }));
    onceEventually(trace.incThenDec, trace.tracer(function(err, got) {
        assert.ifError(err);
        assert.fail("shouldn't call third callback", got);
    }));
});

test('oneAtATime works without callbacks', function(assert) {
    assert.plan(3);
    var trace = new TracedCount();
    var eventuallyIncDec = eventually.bind(null, trace.incThenDec);
    var onceEventuallyIncDec = oneAtATime(eventuallyIncDec);

    onceEventuallyIncDec(trace.tracer(function(err, got) {
        assert.ifError(err);
        assert.deepEqual(got, 0);
        assert.deepEqual(trace.trace, [
            [ '+', 1 ],
            [ '-', 0 ],
            [ '=', 0 ],
        ]);
        assert.end();
    }));
    onceEventuallyIncDec();
    onceEventuallyIncDec();
});

test('oneAtATime.justCallFirst works without callbacks', function(assert) {
    assert.plan(3);
    var trace = new TracedCount();
    var eventuallyIncDec = eventually.bind(null, trace.incThenDec);
    var onceEventuallyIncDec = oneAtATime.justCallFirst(eventuallyIncDec);

    onceEventuallyIncDec(trace.tracer(function(err, got) {
        assert.ifError(err);
        assert.deepEqual(got, 0);
        assert.deepEqual(trace.trace, [
            [ '+', 1 ],
            [ '-', 0 ],
            [ '=', 0 ],
        ]);
        assert.end();
    }));
    onceEventuallyIncDec();
    onceEventuallyIncDec();
});

test('oneAtATime.justCallFirst works without callbacks, not even the first', function(assert) {
    assert.plan(0);
    var trace = new TracedCount();
    var eventuallyIncDec = eventually.bind(null, trace.incThenDec);
    var onceEventuallyIncDec = oneAtATime.justCallFirst(eventuallyIncDec);

    onceEventuallyIncDec();
    onceEventuallyIncDec(trace.tracer(function(err, got) {
        assert.fail("Shouldn't be called", got);
    }));
    setTimeout(assert.end, 1);
});
