const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// 列出所有學生
router.get('/', auth, async (req, res) => {
  const students = await prisma.student.findMany({
    where: { teacherId: req.teacherId },
    orderBy: [{ year: 'asc' }, { class: 'asc' }, { number: 'asc' }],
  });
  res.json(students);
});

// 手動新增學生
router.post('/', auth, async (req, res) => {
  const { year, class: cls, number, name } = req.body;
  if (!year || !cls || !number || !name) return res.status(400).json({ error: '欄位不完整' });
  const student = await prisma.student.create({
    data: { year: +year, class: +cls, number: +number, name, teacherId: req.teacherId },
  });
  res.json(student);
});

// 刪除單一學生
router.delete('/:id', auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const s = await prisma.student.findFirst({ where: { id, teacherId: req.teacherId } });
  if (!s) return res.status(404).json({ error: '找不到學生' });
  await prisma.student.delete({ where: { id } });
  res.json({ ok: true });
});

// 批次刪除
router.delete('/', auth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: '需提供 ids 陣列' });
  await prisma.student.deleteMany({
    where: { id: { in: ids }, teacherId: req.teacherId },
  });
  res.json({ ok: true });
});

// CSV 匯入（年,班,號,姓名）
router.post('/import', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未提供檔案' });
  try {
    const text = req.file.buffer.toString('utf-8');
    const records = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    const data = records.map(r => ({
      year: parseInt(r['年'] || r['year']),
      class: parseInt(r['班'] || r['class']),
      number: parseInt(r['號'] || r['number']),
      name: r['姓名'] || r['name'],
      teacherId: req.teacherId,
    })).filter(r => r.year && r.class && r.number && r.name);

    const result = await prisma.student.createMany({ data, skipDuplicates: true });
    res.json({ imported: result.count });
  } catch (e) {
    res.status(400).json({ error: 'CSV 格式錯誤：' + e.message });
  }
});

// CSV 匯出
router.get('/export', auth, async (req, res) => {
  const students = await prisma.student.findMany({
    where: { teacherId: req.teacherId },
    orderBy: [{ year: 'asc' }, { class: 'asc' }, { number: 'asc' }],
  });
  const csv = stringify(students.map(s => ({ 年: s.year, 班: s.class, 號: s.number, 姓名: s.name })), {
    header: true,
    columns: ['年', '班', '號', '姓名'],
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
  res.send('﻿' + csv); // BOM for Excel
});

module.exports = router;
