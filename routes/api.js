const express = require("express");
const router = express.Router();
const { redisQueue } = require("../config/redis");
const db = require("../config/database");

// Send message
router.post("/send-message", async (req, res) => {
  const { username, room, message } = req.body;

  if (!username || !room || !message) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  const payload = { username, room, message };

  try {
    // Check if record exists in chat_rooms table
    const [rows] = await db.query(
      "SELECT * FROM chat_rooms WHERE username = ? AND room = ?",
      [username, room]
    );

    if (rows.length === 0) {
      await db.query(
        "INSERT INTO chat_rooms (username, room, created_at) VALUES (?, ?, NOW())",
        [username, room]
      );
    }

    // Enqueue the message into the job queue
    await redisQueue.lPush("job_queue", JSON.stringify(payload));
    console.log("Message enqueued to job queue:", payload);

    // Save the message in MySQL
    await db.query(
      "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
      [username, room, message]
    );

    res.json({
      status: "Message enqueued and saved successfully",
      data: payload,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Error processing your message." });
  }
});

// Fetch messages
router.get("/fetch-messages/:room", async (req, res) => {
  const { room } = req.params;

  if (!room || !room.trim()) {
    return res.status(400).json({ error: "Room is required!" });
  }

  try {
    const [messages] = await db.query(
      "SELECT * FROM chat_messages WHERE room = ? ORDER BY sent_at ASC",
      [room]
    );
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error.message);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
