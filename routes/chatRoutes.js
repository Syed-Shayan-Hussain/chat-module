const express = require("express");
const { fetchMessages } = require("../controllers/chatController");
const { sendMessage } = require("../controllers/messageController");

const router = express.Router();

router.post("/send-message", sendMessage);
router.get("/fetch-messages/:room", fetchMessages);

module.exports = router;
