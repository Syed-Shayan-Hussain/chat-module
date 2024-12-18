const { redisQueue } = require("../config/redis");
const db = require("../config/database");

const connectedUsers = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", async ({ username, room }) => {
      connectedUsers[socket.id] = { username, room };
      socket.join(room);
      console.log(`${username} joined room: ${room}`);

      try {
        // Save the room joining info in MySQL
        await db.query(
          "INSERT INTO chat_rooms (username, room, joined_at) VALUES (?, ?, NOW())",
          [username, room]
        );

        // Fetch previous messages for the room and emit them to the user
        const [messages] = await db.query(
          "SELECT username, message, sent_at FROM chat_messages WHERE room = ? ORDER BY sent_at ASC",
          [room]
        );
        socket.emit("previousMessages", messages);
      } catch (error) {
        console.error("Error handling room join:", error.message);
      }
    });

    socket.on("sendMessage", async ({ username, room, message }) => {
      const payload = { username, room, message };

      // Enqueue the message into the job queue
      await redisQueue.lPush("job_queue", JSON.stringify(payload));
      console.log("Message enqueued to job queue:", payload);

      // Save the message in MySQL
      try {
        await db.query(
          "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
          [username, room, message]
        );
      } catch (error) {
        console.error("Error saving message:", error.message);
      }
    });

    socket.on("disconnect", () => {
      delete connectedUsers[socket.id];
      console.log("User disconnected:", socket.id);
    });
  });
};
