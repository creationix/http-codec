var buf = require('buffer-tools');

function syntaxError(message, array) {
  return new SyntaxError(message + ": " +
    JSON.stringify(buf.toString(buf.fromArray(array)))
  );
}

var states = {
  method: function (byte, data, emit) {
    // Capital letter
    if (byte > 0x40 && byte <= 0x5a) {
      data.push(byte);
      return "method"
    }
    // Space
    if (byte === 0x20) {
      data.method = buf.toString(buf.fromArray(data));
      data.length = 0;
      return "path";
    }
    data.push(byte);
    emit(syntaxError("Invalid Method", data));
    return "error";
  },
  path: function (byte, data, emit) {
    if (byte === 0x20) {
      data.path = buf.fromArrayToString(data);
      data.length = 0;
      return "version";
    }
    if (byte === 0x0d || byte === 0x0a) {
      data.push(byte);
      emit(syntaxError("Unexpected newline in path", data));
      return "error";
    }
    data.push(byte);
    return "path";
  },
  version: function (byte, data, emit) {
    if (byte === 0x0d) {
      var match = buf.fromArrayToString(data).match(/HTTP\/(1).([01])/);
      if (!match) {
        emit(syntaxError("Invalid HTTP version string", data));
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
      data.headers.push(buf.fromArrayToString(data));
      data.length = 0;
      return "value";
    }
    data.push(byte);
    return "key";
  },
  value: function (byte, data, emit) {
    if (byte === 0x0d) {
      data.headers.push(buf.fromArrayToString(data));
      data.length = 0;
      return "endheader";
    }
    if (byte === 0x20 && data.length === 0) {
      // Ignore leading spaces in header values
      return "value";
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
        headers: data.headers,
      });
      return "body";
    }
    emit(new SyntaxError("Invalid head termination"));
    return "error";
  },
  error: function (byte, data, emit) {
    emit();
    return "error";
  },
  body: function (byte, data, emit) {
    data.push(byte);
    return "body";
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
    if (state === "body") {
      emit(null, buf.fromArray(data));
      data.length = 0;
    }
  }
}

exports.encoder = encoder;
function encoder(read) {
  return function (close, callback) {

  }
}

