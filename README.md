# A wrapper for async functions which eliminates concurrent executions

Consider:

```javascript
setInterval(function tick() {
    getSomething(function gotStuff(err, stuff) {
        if (err) console.error('no stuff for us');
        use(stuff);
    });
}, 1000);
```

Will try to get something every second and use it... but if it takes more than
a second to get stuff (or fail to), we'll start having multiple requests for
stuff happening.  This can exacerbate the reason why stuff took longer than a second to get, or cause even worse interactions.

Instead you:

```javascript
var oneAtATime = require('oneatatime');

setInterval(oneAtATime(function tick() {
    getSomething(function gotStuff(err, stuff) {
        if (err) console.error('no stuff for us');
        use(stuff);
    });
}), 1000);
```

And now only one `tick` operation will ever be running at a time.

Alternatively you might choose to:

```javascript
var oneAtATime = require('oneatatime');

getSomething = oneAtATime(getSomething);

setInterval(function tick() {
    getSomething(function gotStuff(err, stuff) {
        if (err) console.error('no stuff for us');
        use(stuff);
    });
}, 1000);
```

Which will make sure that only one execution of `getSomething` will be ongoing.
However in the case of backlog, a queue of `gotStuff` callbacks will fill, and
drain once the single long running `getSomething` call finishes.

Finally we have:

```javascript
var oneAtATime = require('oneatatime');

getSomething = oneAtATime.justCallFirst(getSomething);

setInterval(function tick() {
    getSomething(function gotStuff(err, stuff) {
        if (err) console.error('no stuff for us');
        use(stuff);
    });
}, 1000);
```

Which is just like the above, except only the first gotStuff will be called.
All subsequent calls to `getSomething` are ignored until the first one
finishes.

# TODO

- provide a corollary `justCallLast`
- it could be useful to provide uniqueness based on some or all of the argument
  provided to the wrapped function so that a call like `getSomething("key1",
  cb)` is de-duped separately from `getSomething("key2", cb)`.
