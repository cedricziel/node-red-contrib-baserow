module.exports = function (RED) {
  function getJWT(username, password, url) {
    const axios = require("axios");

    return axios
      .post(`${url}/api/user/token-auth/`, {
        username: username,
        password: password,
      })
      .then((res) => {
        return res.data;
      });
  }

  function baserowNode(n) {
    RED.nodes.createNode(this, n);
    if (RED.nodes.getNode(n.creds)) {
      this.username = RED.nodes.getNode(n.creds).credentials.username;
      this.password = RED.nodes.getNode(n.creds).credentials.password;
      this.url = RED.nodes.getNode(n.creds).credentials.url;
    } else {
      this.username = "";
      this.password = "";
      this.url = "";
    }

    var node = this;
    this.name = n.name;
    this.tableId = n.tableId;
    this.baserowConfig = RED.nodes.getNode(n.baserow);

    this.on("input", async (msg) => {
      node.send(msg);
    });
  }

  RED.nodes.registerType("baserow", baserowNode);

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
