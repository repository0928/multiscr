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

// 下載範例 CSV
router.get('/sample', auth, (req, res) => {
  const sample = '年,班,號,姓名\n5,1,1,王小明\n5,1,2,李小華\n5,2,1,張小美\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students_sample.csv"');
  res.send('﻿' + sample);
});

// CSV / TXT 匯入（支援有無標題列、尾逗號、欄位數不一致）
router.post('/import', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '未提供檔案' });
  try {
    const text = req.file.buffer.toString('utf-8').replace(/^﻿/, ''); // 移除 BOM

    // 先用無標題模式解析所有列
    const rawRecords = parse(text, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // 允許欄位數不一致
    });

    const data = [];
    for (const row of rawRecords) {
      // 判斷是否為標題列（第一欄是「年」或非數字）
      if (isNaN(parseInt(row[0]))) continue;

      const year   = parseInt(row[0]);
      const cls    = parseInt(row[1]);
      const number = parseInt(row[2]);
      const name   = (row[3] || '').trim();

      if (!year || !cls || !number || !name) continue;

      data.push({ year, class: cls, number, name, teacherId: req.teacherId });
    }

    if (data.length === 0) return res.status(400).json({ error: '找不到有效的學生資料，請確認格式為：年,班,號,姓名' });

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
