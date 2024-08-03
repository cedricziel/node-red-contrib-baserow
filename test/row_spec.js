var should = require("should");
var helper = require("node-red-node-test-helper");
var baserowRowNode = require("../baserow-row");

helper.init(require.resolve("node-red"));

describe("lower-case Node", function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it("should be loaded", function (done) {
    var flow = [{ id: "n1", type: "baserow-row", name: "baserow-row" }];
    helper.load(baserowRowNode, flow, function () {
      var n1 = helper.getNode("n1");
      try {
        n1.should.have.property("name", "baserow-row");
        done();
      } catch (err) {
        done(err);
      }
    });
  });
});
