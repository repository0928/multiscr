const express = require('express');
const ExcelJS = require('exceljs');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

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
  const entries = req.body;
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

  ws.columns = [
    { header: '學生', key: 'student', width: 20 },
    ...items.map(i => ({ header: `${i.name}(${i.maxScore})`, key: `item_${i.id}`, width: 12 })),
    { header: '總分', key: 'total', width: 8 },
    { header: '等第', key: 'grade', width: 6 },
  ];

  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  students.forEach(s => {
    const rowData = { student: `${s.year}年${s.class}班${s.number}號 ${s.name}` };
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

// 下載範例評分 xlsx
router.get('/:subjectId/scores/sample', auth, async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });

  const items = await prisma.scoringItem.findMany({
    where: { subjectId: subject.id }, orderBy: { orderIndex: 'asc' },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('範例');

  ws.columns = [
    { header: '學生', key: 'student', width: 20 },
    ...items.map(i => ({ header: `${i.name}(${i.maxScore})`, key: `item_${i.id}`, width: 12 })),
  ];

  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // 加兩列範例資料
  const sampleStudents = ['5年1班1號 王小明', '5年1班2號 李小華'];
  sampleStudents.forEach(name => {
    const row = { student: name };
    items.forEach(i => { row[`item_${i.id}`] = 0; });
    ws.addRow(row);
  });

  // 加說明列
  ws.addRow({});
  const noteRow = ws.addRow({ student: '※ 請依照學生格式填入「年年班班號號 姓名」，分數欄填入數字' });
  noteRow.getCell(1).font = { color: { argb: 'FF6B7280' }, italic: true };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="scores_sample.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// 匯入評分 xlsx
router.post('/:subjectId/scores/import', auth, upload.single('file'), async (req, res) => {
  const subject = await getSubject(req.params.subjectId, req.teacherId);
  if (!subject) return res.status(404).json({ error: '找不到科目' });
  if (!req.file) return res.status(400).json({ error: '未提供檔案' });

  try {
    const [students, items] = await Promise.all([
      prisma.student.findMany({ where: { teacherId: req.teacherId } }),
      prisma.scoringItem.findMany({ where: { subjectId: subject.id }, orderBy: { orderIndex: 'asc' } }),
    ]);

    // 建立學生查找 map（用「年班號」當 key）
    const studentMap = {};
    students.forEach(s => {
      studentMap[`${s.year}-${s.class}-${s.number}`] = s;
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];

    // 解析標題列，找出每欄對應的 item
    const headerRow = ws.getRow(1).values; // index 從 1 開始
    const colItemMap = {}; // colIndex → item
    items.forEach(item => {
      for (let c = 2; c < headerRow.length; c++) {
        const h = String(headerRow[c] || '').replace(/\(.*\)/, '').trim();
        if (h === item.name) { colItemMap[c] = item; break; }
      }
    });

    const upserts = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // 跳過標題
      const studentCell = String(row.getCell(1).value || '').trim();
      if (!studentCell) return;

      // 解析「5年1班1號 王小明」→ year=5, class=1, number=1
      const m = studentCell.match(/(\d+)年(\d+)班(\d+)號/);
      if (!m) return;
      const student = studentMap[`${m[1]}-${m[2]}-${m[3]}`];
      if (!student) return;

      Object.entries(colItemMap).forEach(([col, item]) => {
        const val = row.getCell(parseInt(col)).value;
        const score = parseInt(val);
        if (isNaN(score)) return;
        const clamped = Math.max(0, Math.min(score, item.maxScore));
        upserts.push({ studentId: student.id, itemId: item.id, score: clamped });
      });
    });

    await Promise.all(upserts.map(({ studentId, itemId, score }) =>
      prisma.score.upsert({
        where: { subjectId_studentId_itemId: { subjectId: subject.id, studentId, itemId } },
        update: { score },
        create: { subjectId: subject.id, studentId, itemId, score },
      })
    ));

    res.json({ imported: upserts.length });
  } catch (e) {
    res.status(400).json({ error: '匯入失敗：' + e.message });
  }
});

module.exports = router;
