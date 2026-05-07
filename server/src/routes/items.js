const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// 確認科目屬於該老師
async function getSubject(subjectId, teacherId) {
  return prisma.subject.findFirst({ where: { id: parseInt(subjectId), teacherId } });
}

// 列出項目
router.get('/:subjectId/items', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const items = await prisma.scoringItem.findMany({
    where: { subjectId: subject.id },
    orderBy: { orderIndex: 'asc' },
  });
  res.json(items);
});

// 新增項目
router.post('/:subjectId/items', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const { name, maxScore } = req.body;
  if (!name || maxScore === undefined) return res.status(400).json({ error: '欄位不完整' });
  const last = await prisma.scoringItem.findFirst({
    where: { subjectId: subject.id }, orderBy: { orderIndex: 'desc' },
  });
  const item = await prisma.scoringItem.create({
    data: { name, maxScore: +maxScore, subjectId: subject.id, orderIndex: (last?.orderIndex ?? -1) + 1 },
  });
  res.json(item);
});

// 編輯項目
router.put('/:subjectId/items/:itemId', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const id = parseInt(req.params.itemId);
  const { name, maxScore, orderIndex } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (maxScore !== undefined) data.maxScore = +maxScore;
  if (orderIndex !== undefined) data.orderIndex = +orderIndex;
  const item = await prisma.scoringItem.update({ where: { id }, data });
  res.json(item);
});

// 刪除項目
router.delete('/:subjectId/items/:itemId', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const id = parseInt(req.params.itemId);
  await prisma.scoringItem.delete({ where: { id } });
  res.json({ ok: true });
});

// CSV 匯入（名稱,滿分）
router.post('/:subjectId/items/import', auth, upload.single('file'), async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  if (!req.file) return res.status(400).json({ error: '未提供檔案' });
  try {
    const text = req.file.buffer.toString('utf-8');
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    const last = await prisma.scoringItem.findFirst({
      where: { subjectId: subject.id }, orderBy: { orderIndex: 'desc' },
    });
    let idx = (last?.orderIndex ?? -1) + 1;
    const data = records.map(r => ({
      name: r['名稱'] || r['name'],
      maxScore: parseInt(r['滿分'] || r['maxScore']),
      subjectId: subject.id,
      orderIndex: idx++,
    })).filter(r => r.name && r.maxScore);
    await prisma.scoringItem.createMany({ data });
    res.json({ imported: data.length });
  } catch (e) {
    res.status(400).json({ error: 'CSV 格式錯誤：' + e.message });
  }
});

// CSV 匯出
router.get('/:subjectId/items/export', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const items = await prisma.scoringItem.findMany({
    where: { subjectId: subject.id }, orderBy: { orderIndex: 'asc' },
  });
  const csv = stringify(items.map(i => ({ 名稱: i.name, 滿分: i.maxScore })), {
    header: true, columns: ['名稱', '滿分'],
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="items.csv"');
  res.send('﻿' + csv);
});

module.exports = router;
