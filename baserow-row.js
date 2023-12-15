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

  function baserowRowNode(n) {
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
            case "get":
              axios
                .get(
                  `${this.url}/api/database/rows/table/${tableId}/${rowId}/`,
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
            case "create":
              axios
                .post(
                  `${this.url}/api/database/rows/table/${tableId}/`,
                  msg.payload,
                  {
                    headers: {
                      Authorization: `JWT ${token.access_token}`,
                    },
                    params: {
                      before: beforeId,
                      user_field_names: userFieldNames,
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
            case "update":
              axios
                .patch(
                  `${this.url}/api/database/rows/table/${tableId}/${rowId}/`,
                  msg.payload,
                  {
                    headers: {
                      Authorization: `JWT ${token.access_token}`,
                    },
                    params: {
                      user_field_names: userFieldNames,
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
            case "move":
              axios
                .patch(
                  `${this.url}/api/database/rows/table/${tableId}/move/`,
                  msg.payload,
                  {
                    headers: {
                      Authorization: `JWT ${token.access_token}`,
                    },
                    params: {
                      user_field_names: userFieldNames,
                      before_id: beforeId,
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
            case "delete":
              axios
                .delete(
                  `${this.url}/api/database/rows/table/${tableId}/${rowId}/`,
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

  RED.nodes.registerType("baserow-row", baserowRowNode);
};
