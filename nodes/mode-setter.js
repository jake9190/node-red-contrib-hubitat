/* eslint-disable global-require */
module.exports = function HubitatModeSetterModule(RED) {
  const fetch = require('./utils/fetch-with-timeout');
  const doneWithId = require('./utils/done-with-id');

  function HubitatModeSetterNode(config) {
    RED.nodes.createNode(this, config);

    this.hubitat = RED.nodes.getNode(config.server);
    this.name = config.name;
    this.modeId = config.modeId;
    this.availableModes = {};
    const node = this;

    if (!node.hubitat) {
      node.error('Hubitat server not configured');
      return;
    }
    async function fetchAvailableModes() {
      return node.hubitat.getMode().then((mode) => {
        node.availableModes = mode.reduce((accumulator, value) => {
          accumulator[value.name] = value.id;
          return accumulator;
        }, {});
      }).catch((err) => {
        node.warn(`Unable to fetch available modes: ${err.message}`);
        node.status({ fill: 'red', shape: node.shape, text: 'unable to fetch modes' });
        throw err;
      });
    }

    node.on('input', async (msg, send, done) => {
      node.status({ fill: 'blue', shape: 'dot', text: 'requesting' });

      let modeId;
      if (msg.modeId) {
        modeId = msg.modeId;
      } else if (msg.mode) {
        if (this.availableModes[msg.mode] === undefined) {
          try {
            await fetchAvailableModes();
          } catch (err) {
            done(err);
            return;
          }
        }
        modeId = this.availableModes[msg.mode];
      } else {
        modeId = node.modeId;
      }

      if (!modeId) {
        const errorMsg = 'undefined mode';
        node.status({ fill: 'red', shape: 'ring', text: errorMsg });
        doneWithId(node, done, errorMsg);
        return;
      }

      const baseUrl = `${node.hubitat.baseUrl}/modes/${modeId}`;
      const url = `${baseUrl}?access_token=${node.hubitat.token}`;
      const options = { method: 'GET' };

      try {
        await node.hubitat.acquireLock();
        node.debug(`Request: ${baseUrl}`);
        const response = await fetch(url, options);
        if (response.status >= 400) {
          node.status({ fill: 'red', shape: 'ring', text: 'response error' });
          const message = `${baseUrl}: ${await response.text()}`;
          doneWithId(node, done, message);
          return;
        }
        const output = { ...msg, response: await response.json() };
        node.status({});
        send(output);
        done();
      } catch (err) {
        node.status({ fill: 'red', shape: 'ring', text: err.code });
        doneWithId(node, done, err);
      } finally {
        node.hubitat.releaseLock();
      }
    });
  }

  RED.nodes.registerType('hubitat mode-setter', HubitatModeSetterNode);
};
