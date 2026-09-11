// A nested, asynchronously rejected build must reach the outer error handler.
// Match the editor's request/stage chain, including its delayed status update.
Promise.resolve({}).then(function () {
  return new Promise(function (resolve, reject) {
    setTimeout(function () { reject(new Error("invalid CSS")); }, 0);
  }).then(function (value) { return value; }, function (error) {
    throw new Error("compile: " + error.message);
  }).then(function () { throw new Error("unexpected success"); });
}).then(function () {
  __wwcPostMessage(JSON.stringify(["unexpected completion"]));
}, function (error) {
  setTimeout(function () {
    __wwcPostMessage(JSON.stringify([error.message]));
  }, 10);
});
