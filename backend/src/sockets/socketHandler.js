// backend/src/sockets/socketHandler.js

const jwt = require("jsonwebtoken");

module.exports = (io) => {
  // 1. Middleware ตรวจสอบ Token
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // 2. เมื่อ User Connect
  io.on("connection", (socket) => {
    const userId = socket.user.id;
    const userRole = socket.user.role;

    console.log(
      `⚡ User connected: ${socket.id} (ID: ${userId}, Role: ${userRole})`
    );

    // 2.1 ห้องส่วนตัว (ทุก role)
    const personalRoom = `user_${userId}`;
    socket.join(personalRoom);

    // 2.2 HR Group
    if (userRole === "HR") {
      socket.join("hr_group");
      console.log("   -> HR User joined: hr_group");
    }

    // 2.3 ADMIN Group
    if (userRole === "ADMIN") {
      socket.join("admin_group");
      console.log("   -> Admin joined: admin_group");
    }

    // 2.4 MANAGER Group (เผื่ออนาคต)
    if (userRole === "MANAGER") {
      socket.join("manager_group");
      console.log("   -> Manager joined: manager_group");
    }

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`🔥 User disconnected: ${socket.id}`);
    });
  });
};
