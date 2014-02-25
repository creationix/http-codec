http-codec
=====================

A HTTP parser and encoder packaged as a sync stream converter.


## Server Usage

```js
var codec = require('http-codec').server;

// Then later in your TCP handling code
stream.on("data", codec.decoder(function (item) {
  // For requests, the first item is { method, path, headers }
  // After that it gives body chunks
  // And an empty item to signify the end of the request stream.
});
```
