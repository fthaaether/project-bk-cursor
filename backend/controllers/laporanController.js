const PDFDocument = require('pdfkit');
const db = require('../db');
const { enrichPertemuan } = require('../utils/helpers');

function exportPdf(req, res) {
  try {
    const { dari, sampai } = req.query;
    let rows = db
      .read('pertemuan')
      .filter((p) => p.guru_bk_id === req.user.guru_bk_id)
      .map(enrichPertemuan);

    if (dari) {
      rows = rows.filter((p) => p.tanggal >= dari);
    }
    if (sampai) {
      rows = rows.filter((p) => p.tanggal <= sampai);
    }

    rows.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=laporan-konseling.pdf');
    doc.pipe(res);

    doc.fontSize(18).fillColor('#1B2A4A').text('Laporan Konseling BK', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Guru: ${req.user.name}`, { align: 'center' });
    doc.text(`Tanggal cetak: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });
    doc.moveDown(1.5);

    if (rows.length === 0) {
      doc.fontSize(12).fillColor('#333').text('Tidak ada data pertemuan.', { align: 'center' });
      doc.end();
      return;
    }

    rows.forEach((row, i) => {
      if (i > 0) doc.moveDown(1);
      doc.fontSize(12).fillColor('#1B2A4A').text(`#${row.id} — ${row.nama_siswa} (${row.nis})`);
      doc.fontSize(10).fillColor('#333');
      doc.text(`Kelas: ${row.kelas} | Kategori: ${row.kategori_nama || '-'} | Status: ${row.status}`);
      doc.text(`Tanggal: ${row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-'}`);
      doc.text(`Keperluan: ${row.keperluan || '-'}`);
      if (row.isi_catatan) {
        doc.text(`Catatan: ${row.isi_catatan}`);
        doc.text(`Tindak Lanjut: ${row.tindak_lanjut || '-'}`);
      }
      doc.moveDown(0.5);
      doc.strokeColor('#F59E0B').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Gagal membuat laporan PDF' });
    }
  }
}

module.exports = { exportPdf };
