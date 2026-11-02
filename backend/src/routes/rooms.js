const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Room = require('../models/Room');
const Module = require('../models/Module');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

// In-memory registry of SSE connections per room code: Map<roomCode, Set<res>>
const roomConnections = new Map();

/**
 * Broadcast an event to all connected clients in a specific room
 */
function broadcastToRoom(roomCode, eventType, data) {
  const normalizedCode = roomCode.toUpperCase();
  const clients = roomConnections.get(normalizedCode);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const clientRes of clients) {
    try {
      clientRes.write(payload);
    } catch (err) {
      clients.delete(clientRes);
    }
  }
}

// Purge any previously seeded default rooms so only real user-created rooms exist
(async () => {
  try {
    await Room.deleteMany({ code: { $in: ['QUEST-101', 'ALGO-202', 'PYTHON-303'] } });
  } catch (err) {
    // Ignore if DB not ready yet
  }
})();

// @route   GET /api/rooms
// @desc    List all active public study rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({ isPublic: true }).sort({ updatedAt: -1 }).limit(30);
    res.json({ status: 'success', rooms });
  } catch (err) {
    console.error('Error listing rooms:', err);
    res.status(500).json({ message: 'Error listing study rooms', error: err.message });
  }
});

// @route   POST /api/rooms
// @desc    Create a new study session room
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name, topic, moduleId, customCode, isPublic } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Room name must be at least 3 characters long.' });
    }

    // Generate room code or use custom
    let roomCode = customCode ? customCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') : '';
    if (!roomCode) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const prefix = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'QUEST';
      roomCode = `${prefix}-${randomNum}`;
    }

    // Check code collision
    const existing = await Room.findOne({ code: roomCode });
    if (existing) {
      roomCode = `QUEST-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Find linked module details if provided
    let moduleTitle = 'General Study Session';
    let validModuleId = null;
    if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
      const mod = await Module.findById(moduleId);
      if (mod) {
        moduleTitle = mod.title;
        validModuleId = mod._id;
      }
    }

    const creatorName = req.user?.fullName || req.body.creatorName || 'Student';
    const creatorUserId = req.user?._id || req.body.userId || 'guest-' + Date.now();

    const newRoom = await Room.create({
      code: roomCode,
      name: name.trim(),
      topic: topic ? topic.trim() : 'Collaborative study & peer learning session',
      moduleId: validModuleId,
      moduleTitle,
      createdBy: req.user?._id || null,
      creatorName,
      isAudioActive: true,
      isPublic: isPublic !== false,
      participants: [
        {
          userId: String(creatorUserId),
          name: creatorName,
          avatar: '🎓',
          isMuted: false,
          isSpeaking: false,
        },
      ],
      messages: [
        {
          id: 'msg-' + Date.now(),
          senderId: 'system',
          senderName: 'SkillQuest System',
          text: `Study room "${name.trim()}" created. Share room code [${roomCode}] with peers to study together!`,
          timestamp: new Date(),
          isSystem: true,
        },
      ],
    });

    res.status(201).json({ status: 'success', room: newRoom });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ message: 'Failed to create room', error: err.message });
  }
});

// @route   GET /api/rooms/:code
// @desc    Get room details, linked module content, participants and chat messages
router.get('/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const room = await Room.findOne({ code });

    if (!room) {
      return res.status(404).json({ message: `Room with code "${code}" not found.` });
    }

    // If linked to a module, fetch module content
    let moduleDetails = null;
    if (room.moduleId) {
      moduleDetails = await Module.findById(room.moduleId);
    }

    res.json({
      status: 'success',
      room,
      module: moduleDetails,
    });
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ message: 'Error retrieving room', error: err.message });
  }
});

// @route   POST /api/rooms/:code/join
// @desc    Join an active study room
router.post('/:code/join', optionalAuth, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { userId, name, avatar } = req.body;

    const resolvedUserId = String(req.user?._id || userId || 'student-' + Date.now());
    const resolvedName = req.user?.fullName || name || 'Peer Explorer';
    const resolvedAvatar = avatar || '💻';

    const room = await Room.findOne({ code });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Add participant if not already present
    const existingIndex = room.participants.findIndex((p) => p.userId === resolvedUserId);
    if (existingIndex === -1) {
      const newParticipant = {
        userId: resolvedUserId,
        name: resolvedName,
        avatar: resolvedAvatar,
        isMuted: false,
        isSpeaking: false,
        joinedAt: new Date(),
      };
      room.participants.push(newParticipant);

      // System message
      const sysMsg = {
        id: 'msg-' + Date.now(),
        senderId: 'system',
        senderName: 'System',
        text: `${resolvedName} joined the study room.`,
        timestamp: new Date(),
        isSystem: true,
      };
      room.messages.push(sysMsg);

      await room.save();

      // Broadcast to active SSE listeners
      broadcastToRoom(code, 'participant-joined', {
        participant: newParticipant,
        systemMessage: sysMsg,
        participants: room.participants,
      });
    }

    res.json({ status: 'success', room });
  } catch (err) {
    console.error('Error joining room:', err);
    res.status(500).json({ message: 'Failed to join room', error: err.message });
  }
});

// @route   POST /api/rooms/:code/leave
// @desc    Leave an active study room
router.post('/:code/leave', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { userId } = req.body;

    const room = await Room.findOne({ code });
    if (!room) return res.json({ status: 'ok' });

    const leavingUser = room.participants.find((p) => p.userId === String(userId));
    room.participants = room.participants.filter((p) => p.userId !== String(userId));

    if (leavingUser) {
      const sysMsg = {
        id: 'msg-' + Date.now(),
        senderId: 'system',
        senderName: 'System',
        text: `${leavingUser.name} left the room.`,
        timestamp: new Date(),
        isSystem: true,
      };
      room.messages.push(sysMsg);
      await room.save();

      broadcastToRoom(code, 'participant-left', {
        userId,
        systemMessage: sysMsg,
        participants: room.participants,
      });
    }

    res.json({ status: 'success', participants: room.participants });
  } catch (err) {
    res.status(500).json({ message: 'Error leaving room', error: err.message });
  }
});

// @route   POST /api/rooms/:code/message
// @desc    Send a text message in the study room
router.post('/:code/message', optionalAuth, async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { text, senderId, senderName } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    const room = await Room.findOne({ code });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const newMsg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      senderId: String(req.user?._id || senderId || 'anon'),
      senderName: req.user?.fullName || senderName || 'Student',
      text: text.trim(),
      timestamp: new Date(),
      isSystem: false,
    };

    room.messages.push(newMsg);
    // Keep last 150 messages
    if (room.messages.length > 150) {
      room.messages = room.messages.slice(-150);
    }
    await room.save();

    // Broadcast immediately to all connected peers in real time
    broadcastToRoom(code, 'message', newMsg);

    res.json({ status: 'success', message: newMsg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Failed to send message', error: err.message });
  }
});

// @route   POST /api/rooms/:code/signal
// @desc    WebRTC audio signaling router (offers, answers, ICE candidates, speaking state)
router.post('/:code/signal', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { senderId, targetId, signalType, data } = req.body;

  // Broadcast WebRTC audio signal to target peer or room
  broadcastToRoom(code, 'signal', {
    senderId,
    targetId,
    signalType, // 'offer' | 'answer' | 'ice-candidate' | 'speaking-state' | 'mute-state'
    data,
  });

  res.json({ status: 'sent' });
});

// @route   GET /api/rooms/:code/events
// @desc    Real-time Server-Sent Events (SSE) connection stream for live chat, participants & audio signaling
router.get('/:code/events', (req, res) => {
  const code = req.params.code.toUpperCase();

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ room: code, time: Date.now() })}\n\n`);

  if (!roomConnections.has(code)) {
    roomConnections.set(code, new Set());
  }
  const clientSet = roomConnections.get(code);
  clientSet.add(res);

  // Send periodic keepalive ping to prevent connection timeout
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keep-alive ping\n\n');
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 25000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    clientSet.delete(res);
    if (clientSet.size === 0) {
      roomConnections.delete(code);
    }
  });
});

module.exports = router;
