module.exports = function (RED) {
  "use strict";

  const ws = require("ws");
  const url = require("url");

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

  function BaserowWebsocketListenNode(n) {
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

    this.name = n.name;

    var node = this;
    node.wholemsg = n.wholemsg === "true";
    node._inputNodes = [];
    node.closing = false;

    this.baserowConfig = RED.nodes.getNode(n.baserow);

    function startconn(credentialsUrl, jwt) {
      node.status({ fill: "yellow", shape: "dot", text: "connecting" });

      const parsedUrl = url.parse(credentialsUrl);
      const compiledUrl = `wss://${parsedUrl.host}/ws/core/?jwt_token=${jwt.access_token}`;

      // Connect to remote endpoint
      node.tout = null;
      var prox, noprox;
      if (process.env.http_proxy) {
        prox = process.env.http_proxy;
      }
      if (process.env.HTTP_PROXY) {
        prox = process.env.HTTP_PROXY;
      }
      if (process.env.no_proxy) {
        noprox = process.env.no_proxy.split(",");
      }
      if (process.env.NO_PROXY) {
        noprox = process.env.NO_PROXY.split(",");
      }

      var noproxy = false;
      if (noprox) {
        for (var i in noprox) {
          if (node.path.indexOf(noprox[i].trim()) !== -1) {
            noproxy = true;
          }
        }
      }

      var agent = undefined;
      if (prox && !noproxy) {
        agent = new HttpsProxyAgent(prox);
      }

      var options = {};
      if (agent) {
        options.agent = agent;
      }
      if (node.tls) {
        var tlsNode = RED.nodes.getNode(node.tls);
        if (tlsNode) {
          tlsNode.addTLSOptions(options);
        }
      }

      node.warn(`${compiledUrl}`);

      var socket = new ws.WebSocket(compiledUrl, options);
      socket.setMaxListeners(0);
      node.server = socket; // keep for closing

      handleConnection(socket);
    }

    function handleConnection(/*socket*/ socket) {
      var id = RED.util.generateId();
      socket.nrId = id;
      socket.nrPendingHeartbeat = false;

      socket.on("open", function () {
        node.status({ fill: "green", shape: "dot", text: "connected" });

        if (node.page === "table") {
        } else if (node.page === "row") {
        }

        socket.send(
          JSON.stringify({
            page: "table",
            table_id: 642,
          }),
        );

        if (node.heartbeat) {
          clearInterval(node.heartbeatInterval);
          node.heartbeatInterval = setInterval(function () {
            if (socket.nrPendingHeartbeat) {
              // No pong received
              socket.terminate();
              socket.nrErrorHandler(new Error("timeout"));
              return;
            }
            socket.nrPendingHeartbeat = true;
            try {
              socket.ping();
            } catch (err) {}
          }, node.heartbeat);
        }

        node.emit("opened", { count: "", id: id });
      });

      socket.on("close", function () {
        clearInterval(node.heartbeatInterval);

        node.status({ fill: "red", shape: "dot", text: "disconnected" });

        node.emit("closed", { count: "", id: id });

        if (!node.closing) {
          clearTimeout(node.tout);
          node.tout = setTimeout(function () {
            getJWT(node.username, node.password, node.url)
              .then((token) => {
                startconn(node.url, token);
              })
              .catch((err) => {
                msg.payload = err;
                done(msg);
              });
          }, 3000); // try to reconnect every 3 secs... bit fast ?
        }
      });

      socket.on("message", function (data, flags) {
        node.debug("ws message", data, flags);

        node.handleEvent(id, socket, "message", data, flags);
      });

      socket.nrErrorHandler = function (err) {
        clearInterval(node.heartbeatInterval);
        node.emit("erro", { err: err, id: id });

        if (!node.closing) {
          clearTimeout(node.tout);
          node.tout = setTimeout(function () {
            getJWT(node.username, node.password, node.url)
              .then((token) => {
                startconn(node.url, token);
              })
              .catch((err) => {
                msg.payload = err;
                done(msg);
              });
          }, 3000); // try to reconnect every 3 secs... bit fast ?
        }
      };

      socket.on("error", socket.nrErrorHandler);

      socket.on("ping", function () {
        socket.nrPendingHeartbeat = false;
      });

      socket.on("pong", function () {
        socket.nrPendingHeartbeat = false;
      });
    }

    getJWT(this.username, this.password, this.url)
      .then((token) => {
        startconn(this.url, token);
      })
      .catch((err) => {
        let msg = {};
        msg.payload = err;
      });

    node.on("close", function (done) {
      if (node.heartbeatInterval) {
        clearInterval(node.heartbeatInterval);
      }

      node.closing = true;
      node.server.close();
      //wait 20*50 (1000ms max) for ws to close.
      //call done when readyState === ws.CLOSED (or 1000ms, whichever comes fist)
      const closeMonitorInterval = 20;
      let closeMonitorCount = 50;
      let si = setInterval(() => {
        if (node.server.readyState === ws.CLOSED || closeMonitorCount <= 0) {
          if (node.tout) {
            clearTimeout(node.tout);
            node.tout = null;
          }
          clearInterval(si);
          return done();
        }
        closeMonitorCount--;
      }, closeMonitorInterval);
    });
  }

  RED.nodes.registerType("baserow-listen", BaserowWebsocketListenNode);

  BaserowWebsocketListenNode.prototype.handleEvent = function (
    id,
    /*socket*/ socket,
    /*String*/ event,
    /*Object*/ data,
    /*Object*/ flags,
  ) {
    var msg;

    this.debug("handleEvent", id, event, data, flags);

    if (this.wholemsg) {
      try {
        msg = JSON.parse(data);
        if (typeof msg !== "object" && !Array.isArray(msg) && msg !== null) {
          msg = { payload: msg };
        }
      } catch (err) {
        msg = { payload: data };
      }
    } else {
      msg = {
        payload: data,
      };
    }
    msg._session = { type: "websocket", id: id };
    for (var i = 0; i < this._inputNodes.length; i++) {
      this._inputNodes[i].send(msg);
    }
  };

  BaserowWebsocketListenNode.prototype.registerInputNode = function (
    /*Node*/ handler,
  ) {
    this._inputNodes.push(handler);
  };

  BaserowWebsocketListenNode.prototype.removeInputNode = function (
    /*Node*/ handler,
  ) {
    this._inputNodes.forEach(function (node, i, inputNodes) {
      if (node === handler) {
        inputNodes.splice(i, 1);
      }
    });
  };

  BaserowWebsocketListenNode.prototype.reply = function (id, data) {
    var session = this._clients[id];
    if (session) {
      try {
        session.send(data);
      } catch (e) {
        // swallow any errors
      }
    }
  };
};
