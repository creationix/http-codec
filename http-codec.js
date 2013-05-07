var helpers = require('../min-stream-helpers');

var states = {
  method: function (byte, data, emit) {
    // Capital letter
    if (byte > 0x40 && byte <= 0x5a) {
      data.push(byte);
      return "method"
    }
    // Space
    if (byte === 0x20) {
      data.method = bufferToString(data);
      data.length = 0;
      return "path";
    }
    data.push(byte);
    emit(new SyntaxError("Invalid method: " + JSON.stringify(bufferToString(data))));
    return "error";
  },
  path: function (byte, data, emit) {
    if (byte === 0x20) {
      data.path = bufferToString(data);
      data.length = 0;
      return "version";
    }
    if (byte === 0x0d || byte === 0x0a) {
      data.push(byte);
      emit(new SyntaxError("Unexpected newline in path: " + JSON.stringify(bufferToString(data))));
      return "error";
    }
    data.push(byte);
    return "path";
  },
  version: function (byte, data, emit) {
    if (byte === 0x0d) {
      var match = bufferToString(data).match(/HTTP\/(1).([01])/);
      if (!match) {
        emit(new SyntaxError("Invalid HTTP version string: " + JSON.stringify(bufferToString(data))));
        return "error";
      }
      data.version = [parseInt(match[1], 10), parseInt(match[2], 10)];
      data.length = 0;
      return "endhead";
    }
    data.push(byte);
    return "version";
  },
  endhead: function (byte, data, emit) {
    if (byte === 0x0a) {
      data.headers = [];
      return "key";
    }
    emit(new SyntaxError("Syntax Error in newline after HTTP request header"));
  },
  key: function (byte, data, emit) {
    if (byte === 0x0d) {
      if (data.length === 0) {
        return "endheaders";
      }
      emit(new SyntaxError("Unexpected newline"));
      return "error";
    }
    if (byte === 0x3a) {
      data.headers.push(bufferToString(data));
      data.length = 0;
      return "value";
    }
    data.push(byte);
    return "key";
  },
  value: function (byte, data, emit) {
    if (byte === 0x0d) {
      data.headers.push(bufferToString(data));
      data.length = 0;
      return "endheader";
    }
    data.push(byte);
    return "value";
  },
  endheader: function (byte, data, emit) {
    if (byte === 0x0a) {
      return "key";
    }
    emit(new SyntaxError("Invalid line termination"));
    return "error";
  },
  endheaders: function (byte, data, emit) {
    if (byte === 0x0a) {
      emit(null, {
        method: data.method,
        path: data.path,
        version: data.version,
        headers: data.headers
      });
      return "body";
    }
    emit(new SyntaxError("Invalid head termination"));
    return "error";
  },
  error: function (byte, data, emit) {
    emit();
    return "error";
  }
}

exports.decoder = decoder;
function decoder(emit) {

  var state = "method";
  var data = [];

  return function (err, chunk) {
    if (chunk === undefined) return emit(err);
    for (var i = 0, l = chunk.length; i < l; i++) {
      state = states[state](chunk[i], data, emit);
    }
  }
}

exports.encoder = encoder;
function encoder(read) {
  return function (close, callback) {

  }
}

function bufferToString(buffer) {
  var string = "";
  for (var i = 0, l = buffer.length; i < l; i++) {
    string += String.fromCharCode(buffer[i]);
  }
  return decodeURIComponent(escape(string));
}

// Accepts a Unicode string and returns a UTF-8 encoded byte array.
function stringToBuffer(string) {
  string = unescape(encodeURIComponent(string));
  var length = string.length;
  var array = new Array(length);
  for (var i = 0; i < length; i++) {
    array[i] = string.charCodeAt(i);
  }
  return array;
}

var source = helpers.arraySource([
  "GET ", "/ HTTP/1.", "1\r\n",
  "User", "-Agent: c", "url/7.26.0\r\n",
  "Host", ": creatio", "nix.com\r\n",
  "Acce", "pt: */*\r", "\n\r\n"
].map(stringToBuffer));

var source2 = helpers.arraySource([
  "PUT /upload HTTP/1.1\r\nUser-Agent: curl/7.26.0",
  "\r\nHost: localhost:3000\r\nAccept: */*\r\nConte",
  "nt-Length: 105\r\nContent-Type: application/x-www",
  "-form-urlencoded\r\n\r\nmin-stream-http-codec=====",
  "================A HTTP parser and encoder packaged ",
  "as a min-stream pull-filter."
].map(stringToBuffer));

helpers.sink(onEvent)(helpers.pushToPull(decoder)(source));
function onEvent(err, event) {
  if (err) throw err;
  console.log("event", arguments);
}
