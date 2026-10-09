import { createServer } from "http";
import { initSocket, emitToUser, emitToAdmins } from "../services/socketService.js";

describe("socketService", () => {
  test("emit helpers are safe no-ops until the socket server exists", () => {
    // Before initSocket runs, these must not throw
    expect(() => emitToUser("any-user", "order:update", { orderId: "x" })).not.toThrow();
    expect(() => emitToAdmins("chat:unseen-user", { userId: "x", userName: "Y" })).not.toThrow();
  });

  test("initSocket attaches a socket.io server to the http server", () => {
    const server = createServer();
    const io = initSocket(server);
    expect(io).toBeDefined();
    expect(typeof io.on).toBe("function");
    server.close();
  });
});
