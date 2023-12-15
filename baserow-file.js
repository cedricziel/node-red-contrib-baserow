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

  function baserowFileNode(n) {
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
    this.userFieldNames = n.userFieldNames;
    this.operation = n.operation;
    this.rowId = n.rowId;
    this.beforeId = n.beforeId;
    this.baserowConfig = RED.nodes.getNode(n.baserow);

    this.on("input", async (msg, send, done) => {
      const operation =
        msg.operation !== undefined ? msg.operation : this.operation;
      const tableId = msg.tableId !== undefined ? msg.tableId : this.tableId;
      const rowId = msg.rowId !== undefined ? msg.rowId : this.rowId;
      const userFieldNames =
        msg.userFieldNames !== undefined
          ? msg.userFieldNames
          : this.userFieldNames;
      const beforeId =
        msg.beforeId !== undefined ? msg.beforeId : this.beforeId;

      getJWT(this.username, this.password, this.url)
        .then((token) => {
          const axios = require("axios");

          switch (operation) {
            case "upload":
              axios
                .post(`${this.url}/api/user-files/upload-file/`, msg.payload, {
                  headers: {
                    Authorization: `JWT ${token.access_token}`,
                  },
                })
                .then((res) => {
                  msg.payload = res.data;
                  send(msg);
                })
                .catch((err) => {
                  msg.payload = err;
                  done(msg);
                });
              break;
            case "upload_via_url":
              axios
                .post(
                  `${this.url}/api/user-files/upload-via-url/`,
                  msg.payload,
                  {
                    headers: {
                      Authorization: `JWT ${token.access_token}`,
                    },
                  },
                )
                .then((res) => {
                  msg.payload = res.data;
                  send(msg);
                })
                .catch((err) => {
                  msg.payload = err;
                  done(msg);
                });
              break;
            default:
              done(`Invalid operation '${operation}'`);
          }
        })
        .catch((err) => {
          msg.payload = err;
          done(msg);
        });
    });
  }

  RED.nodes.registerType("baserow-file", baserowFileNode);
};
