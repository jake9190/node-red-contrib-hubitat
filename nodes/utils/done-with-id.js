function doneWithId(node, done, msg) {
  if (msg instanceof Error) {
    done(msg);
    return;
  }
  let message = String(msg);
  if (node.deviceId) {
    message = `[deviceId:${node.deviceId}] ${message}`;
  }
  if (node.name) {
    message = `[${node.id}] ${message}`;
  }
  done(new Error(message));
}
module.exports = doneWithId;
