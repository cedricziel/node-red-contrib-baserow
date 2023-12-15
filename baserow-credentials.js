module.exports = function (RED) {
  function baserowCredentials(n) {
    RED.nodes.createNode(this, n);

    this.token = n.token;
    this.url = n.url;
  }

  RED.nodes.registerType("baserowCredentials", baserowCredentials, {
    credentials: {
      username: { type: "text" },
      password: { type: "password" },
      url: { type: "text" },
    },
  });
};
