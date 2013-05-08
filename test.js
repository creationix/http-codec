var decoder = require('./').decoder;
var helpers = require('min-stream-helpers');
var buf = require('buffer-tools');

var source = helpers.arraySource([
  "GET ", "/ HTTP/1.", "1\r\n",
  "User", "-Agent: c", "url/7.26.0\r\n",
  "Host", ": creatio", "nix.com\r\n",
  "Acce", "pt: */*\r", "\n\r\n"
].map(buf.fromString));

var source2 = helpers.arraySource([
  "PUT /upload HTTP/1.1\r\nUser-Agent: curl/7.26.0",
  "\r\nHost: localhost:3000\r\nAccept: */*\r\nConte",
  "nt-Length: 105\r\nContent-Type: application/x-mar",
  "kdown\r\n\r\nmin-stream-http-codec\n=====",
  "================\n\nA HTTP parser and encoder packaged ",
  "as a min-stream pull-filter."
].map(buf.fromString));

var inspect = require('util').inspect;

helpers.sink(onEvent)(helpers.pushToPull(decoder)(source2));
function onEvent(err, request) {
  if (request === undefined) {
    if (err) throw err;
    console.log("END OF STREAM");
    return;
  }
  console.log(inspect(request, {colors:true}));
}
