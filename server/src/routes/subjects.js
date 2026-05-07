const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 列出我的科目
router.get('/', auth, async (req, res) => {
  const subjects = await prisma.subject.findMany({
    where: { teacherId: req.teacherId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(subjects);
});

// 新增科目
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '科目名稱不可空白' });
  const subject = await prisma.subject.create({
    data: { name, teacherId: req.teacherId },
  });
  res.json(subject);
});

// 改名
router.put('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const subject = await prisma.subject.findFirst({ where: { id, teacherId: req.teacherId } });
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const updated = await prisma.subject.update({ where: { id }, data: { name: req.body.name } });
  res.json(updated);
});

// 刪除
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const subject = await prisma.subject.findFirst({ where: { id, teacherId: req.teacherId } });
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  await prisma.subject.delete({ where: { id } });
  res.json({ ok: true });
});

module.exports = router;
