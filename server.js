
// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const redis = require("redis");
// const mysql = require("mysql2/promise"); // Import MySQL library
// require("dotenv").config();
// const cors = require("cors")
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*", // Allow requests from this frontend origin
//     // methods: ["GET", "POST"], // Allow these HTTP methods
//     // credentials: true, // Allow credentials (e.g., cookies)
//   },
// });
// app.use(cors())
// // Redis connections
// const redisPublisher = redis.createClient({ url: process.env.REDIS_URL });
// const redisSubscriber = redis.createClient({ url: process.env.REDIS_URL });
// const redisQueue = redis.createClient({ url: process.env.REDIS_URL });

// (async () => {
//   await redisPublisher.connect();
//   await redisSubscriber.connect();
//   await redisQueue.connect();
// })();

// // MySQL connection pool
// const db = mysql.createPool({
//   host: process.env.MYSQL_HOST, // e.g., 'localhost'
//   user: process.env.MYSQL_USER, // MySQL username
//   password: process.env.MYSQL_PASSWORD, // MySQL password
//   database: process.env.MYSQL_DATABASE, // Database name
// });

// // Middleware for JSON parsing
// app.use(express.json());

// const connectedUsers = {};



// io.on("connection", (socket) => {
//     console.log("User connected:", socket.id);
  
//     socket.on("join", async ({ username, room }) => {
//       connectedUsers[socket.id] = { username, room };
//       socket.join(room);
  
//       console.log(`${username} joined room: ${room}`);
  
//       // Save the room joining info in MySQL
//       try {
//         await db.query(
//           "INSERT INTO chat_rooms (username, room, joined_at) VALUES (?, ?, NOW())",
//           [username, room]
//         );
  
//         // Fetch previous messages for the room and emit them to the user
//         const [messages] = await db.query(
//           "SELECT username, message, sent_at FROM chat_messages WHERE room = ? ORDER BY sent_at ASC",
//           [room]
//         );
//         socket.emit("previousMessages", messages); // Emit previous messages to the client
//       } catch (error) {
//         console.error("Error handling room join:", error.message);
//       }
//     });
  
//     socket.on("sendMessage", async ({ username, room, message }) => {
//       const payload = { username, room, message };
  
//       // Enqueue the message into the job queue
//       await redisQueue.lPush("job_queue", JSON.stringify(payload));
//       console.log("Message enqueued to job queue:", payload);
  
//       // Save the message in MySQL
//       try {
//         await db.query(
//           "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
//           [username, room, message]
//         );
//       } catch (error) {
//         console.error("Error saving message:", error.message);
//       }
//     });
  
//     socket.on("disconnect", () => {
//       delete connectedUsers[socket.id];
//       console.log("User disconnected:", socket.id);
//     });
//   });
  
//   // Listen for processed responses from Backend B (the worker)
//   redisSubscriber.subscribe("chat_responses", async (message) => {
//     const parsedMessage = JSON.parse(message);
//     const { room, response } = parsedMessage;
  
//     // Save the response to the database
//     try {
//       await db.query(
//         "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
//         ["Server", room, response]
//       );
//     } catch (error) {
//       console.error("Error saving backend response:", error.message);
//     }
  
//     // Emit the response to the room
//     io.to(room).emit("receiveMessage", response);
//     console.log("Response sent to room:", room, response);
//   });
  

// // Test endpoints
// app.post("/api/send-message", async (req, res) => {
//     const { username, room, message } = req.body;
  
//     if (!username || !room || !message) {
//       return res.status(400).json({ error: "All fields are required!" });
//     }
  
//     const payload = { username, room, message };
  
//     // Check if record exists in chat_rooms table
//     try {
//       const [rows] = await db.query(
//         "SELECT * FROM chat_rooms WHERE username = ? AND room = ?",
//         [username, room]
//       );
  
//       if (rows.length === 0) {
//         // Create a new record if it does not exist
//         await db.query(
//           "INSERT INTO chat_rooms (username, room, created_at) VALUES (?, ?, NOW())",
//           [username, room]
//         );
//         console.log("New chat room record created:", { username, room });
//       } else {
//         console.log("Chat room record already exists:", { username, room });
//       }
//     } catch (error) {
//       console.error("Error checking or inserting chat room record:", error.message);
//       return res.status(500).json({ error: "Database error while checking chat room." });
//     }
  
//     // Enqueue the message into the job queue
//     try {
//       await redisQueue.lPush("job_queue", JSON.stringify(payload));
//       console.log("Message enqueued to job queue:", payload);
  
//       // Save the message in MySQL
//       await db.query(
//         "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
//         [username, room, message]
//       );
  
//       res.json({
//         status: "Message enqueued and saved successfully",
//         data: payload,
//       });
//     } catch (error) {
//       console.error("Error saving message or enqueuing:", error.message);
//       return res.status(500).json({ error: "Error processing your message." });
//     }
//   });
  

// app.get("/api/fetch-messages/:room", async (req, res) => {
//     const { room } = req.params;
  
//     // Validate the room parameter
//     if (!room || !room.trim()) {
//       return res.status(400).json({ error: "Room is required!" });
//     }
  
//     try {
//       console.log("Fetching messages for room:", room);
  
//       // Query the database
//       const [messages] = await db.query(
//         "SELECT * FROM chat_messages WHERE room = ? ORDER BY sent_at ASC",
//         [room]
//       );
  
//       res.json(messages);
//     } catch (error) {
//       console.error("Error fetching messages:", error.message);
//       res.status(500).json({ error: "Failed to fetch messages" });
//     }
//   });
  
// // Start server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const { redisSubscriber } = require("./config/redis");
const db = require("./config/database");
const chatSocket = require("./sockets/chat");
const apiRoutes = require("./routes/api");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
});

app.use(cors());
app.use(express.json());

// API routes
app.use("/api", apiRoutes);

// Socket logic
chatSocket(io);

// Listen for processed responses from Redis
redisSubscriber.subscribe("chat_responses", async (message) => {
  const parsedMessage = JSON.parse(message);
  const { room, response } = parsedMessage;

  try {
    await db.query(
      "INSERT INTO chat_messages (username, room, message, sent_at) VALUES (?, ?, ?, NOW())",
      ["Server", room, response]
    );
  } catch (error) {
    console.error("Error saving backend response:", error.message);
  }

  io.to(room).emit("receiveMessage", response);
  console.log("Response sent to room:", room, response);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
