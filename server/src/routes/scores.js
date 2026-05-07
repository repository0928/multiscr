const express = require('express');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

async function getSubject(subjectId, teacherId) {
  return prisma.subject.findFirst({ where: { id: parseInt(subjectId), teacherId } });
}

function calcGrade(total, maxTotal) {
  if (maxTotal === 0) return '-';
  const pct = (total / maxTotal) * 100;
  if (pct >= 90) return '優';
  if (pct >= 80) return '甲';
  if (pct >= 70) return '乙';
  if (pct >= 60) return '丙';
  return '丁';
}

// 取得本科所有分數
router.get('/:subjectId/scores', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const scores = await prisma.score.findMany({ where: { subjectId: subject.id } });
  res.json(scores);
});

// 批次 upsert 分數（[{studentId, itemId, score}]）
router.put('/:subjectId/scores', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  const entries = req.body; // array of {studentId, itemId, score}
  if (!Array.isArray(entries)) return res.status(400).json({ error: '需提供陣列' });

  await Promise.all(entries.map(({ studentId, itemId, score }) =>
    prisma.score.upsert({
      where: { subjectId_studentId_itemId: { subjectId: subject.id, studentId, itemId } },
      update: { score },
      create: { subjectId: subject.id, studentId, itemId, score },
    })
  ));
  res.json({ ok: true });
});

// 匯出成績 xlsx
router.get('/:subjectId/export', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });

  const [students, items, scores] = await Promise.all([
    prisma.student.findMany({ where: { teacherId: req.teacherId }, orderBy: [{ year: 'asc' }, { class: 'asc' }, { number: 'asc' }] }),
    prisma.scoringItem.findMany({ where: { subjectId: subject.id }, orderBy: { orderIndex: 'asc' } }),
    prisma.score.findMany({ where: { subjectId: subject.id } }),
  ]);

  const scoreMap = {};
  scores.forEach(s => { scoreMap[`${s.studentId}_${s.itemId}`] = s.score; });
  const maxTotal = items.reduce((sum, i) => sum + i.maxScore, 0);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(subject.name);

  // Header
  ws.columns = [
    { header: '學生', key: 'student', width: 15 },
    ...items.map(i => ({ header: `${i.name}(${i.maxScore})`, key: `item_${i.id}`, width: 12 })),
    { header: '總分', key: 'total', width: 8 },
    { header: '等第', key: 'grade', width: 6 },
  ];

  // Style header
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  students.forEach(s => {
    const rowData = { student: `${s.year}-${s.number} ${s.name}` };
    let total = 0;
    items.forEach(i => {
      const v = scoreMap[`${s.id}_${i.id}`] ?? 0;
      rowData[`item_${i.id}`] = v;
      total += v;
    });
    rowData.total = total;
    rowData.grade = calcGrade(total, maxTotal);
    const row = ws.addRow(rowData);
    if (total === maxTotal && maxTotal > 0) {
      row.getCell('total').font = { color: { argb: 'FF6366F1' }, bold: true };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(subject.name)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
