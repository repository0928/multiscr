const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'change_me';

// 檢查是否已有任何老師（首次啟動）
router.get('/status', async (req, res) => {
  const count = await prisma.teacher.count();
  res.json({ hasTeacher: count > 0 });
});

// 註冊新老師帳號
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || username.trim().length === 0) return res.status(400).json({ error: '帳號不可空白' });
  if (!password || password.length !== 4) return res.status(400).json({ error: '密碼須為4個字元' });

  const existing = await prisma.teacher.findUnique({ where: { username } });
  if (existing) return res.status(409).json({ error: '帳號已被使用' });

  const hashed = await bcrypt.hash(password, 10);
  const teacher = await prisma.teacher.create({ data: { username, password: hashed } });
  const token = jwt.sign({ teacherId: teacher.id }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: teacher.username });
});

// 登入
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const teacher = await prisma.teacher.findUnique({ where: { username } });
  if (!teacher) return res.status(401).json({ error: '帳號或密碼錯誤' });

  const ok = await bcrypt.compare(password, teacher.password);
  if (!ok) return res.status(401).json({ error: '帳號或密碼錯誤' });

  const token = jwt.sign({ teacherId: teacher.id }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: teacher.username });
});

// 修改帳號 / 密碼
router.put('/profile', auth, async (req, res) => {
  const { username, password } = req.body;
  const data = {};

  if (username !== undefined) {
    if (!username || username.trim().length === 0) return res.status(400).json({ error: '帳號不可空白' });
    // 確認不重複（排除自己）
    const existing = await prisma.teacher.findFirst({
      where: { username, id: { not: req.teacherId } }
    });
    if (existing) return res.status(409).json({ error: '帳號已被使用' });
    data.username = username;
  }

  if (password !== undefined) {
    if (password.length !== 4) return res.status(400).json({ error: '密碼須為4個字元' });
    data.password = await bcrypt.hash(password, 10);
  }

  const teacher = await prisma.teacher.update({ where: { id: req.teacherId }, data });
  res.json({ username: teacher.username });
});

module.exports = router;
