import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_USERS,
  INITIAL_PATCHING_REPORTS,
  INITIAL_LETTERS,
  INITIAL_MATERIALS,
  INITIAL_EQUIPMENT_LOGS,
  INITIAL_AUDIT_LOGS
} from './src/data/seedData';
import {
  User,
  PatchingReport,
  LetterItem,
  MaterialTransaction,
  EquipmentLog,
  AuditLog,
  MaterialStockSummary
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Interface for persistent database
interface AppDatabase {
  users: (User & { passwordHash: string })[];
  patchingReports: PatchingReport[];
  letters: LetterItem[];
  materials: MaterialTransaction[];
  equipmentLogs: EquipmentLog[];
  auditLogs: AuditLog[];
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
function loadDatabase(): AppDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Error reading database, creating fresh seed:', e);
    }
  }

  const initialDb: AppDatabase = {
    users: INITIAL_USERS,
    patchingReports: INITIAL_PATCHING_REPORTS,
    letters: INITIAL_LETTERS,
    materials: INITIAL_MATERIALS,
    equipmentLogs: INITIAL_EQUIPMENT_LOGS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };

  saveDatabase(initialDb);
  return initialDb;
}

let db: AppDatabase = loadDatabase();

function saveDatabase(dataToSave: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

// Audit Log Helper
function recordAuditLog(
  userId: string,
  userName: string,
  userRole: User['role'],
  module: AuditLog['module'],
  action: AuditLog['action'],
  description: string,
  targetId?: string
) {
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    module,
    action,
    description,
    targetId,
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase(db);
  return newLog;
}

async function startServer() {
  const app = express();

  // Support base64 photo uploads up to 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ===================== AUTH ROUTES =====================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi Administrator.' });
    }

    user.lastLogin = new Date().toISOString();
    saveDatabase(db);

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      'Autentikasi',
      'LOGIN',
      `Pengguna ${user.name} (${user.role.toUpperCase()}) berhasil masuk sistem.`
    );

    const { passwordHash, ...safeUser } = user;
    return res.json({
      success: true,
      user: safeUser,
      token: `token_${user.id}_${Date.now()}`,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        recordAuditLog(
          user.id,
          user.name,
          user.role,
          'Autentikasi',
          'LOGOUT',
          `Pengguna ${user.name} keluar dari sistem.`
        );
      }
    }
    return res.json({ success: true, message: 'Berhasil keluar' });
  });

  app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // For security, don't expose if user doesn't exist, but simulate success
      return res.json({
        success: true,
        message: 'Permintaan reset telah dicatat. Silakan hubungi Administrator atau gunakan opsi Reset Password Admin.'
      });
    }

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      'Autentikasi',
      'RESET_PASSWORD',
      `Pengguna mengajukan permintaan lupa kata sandi untuk email ${email}.`
    );

    return res.json({
      success: true,
      message: `Permintaan reset kata sandi untuk ${user.name} telah dicatat. Administrator dapat mereset kata sandi melalui menu Kelola User.`,
      tempToken: `reset_${user.id}`
    });
  });

  // ===================== USER MANAGEMENT =====================
  app.get('/api/users', (_req: Request, res: Response) => {
    const safeUsers = db.users.map(({ passwordHash, ...u }) => u);
    return res.json(safeUsers);
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const { name, email, role, agency, phone, password, adminUserId } = req.body;
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Nama, email, role, dan kata sandi wajib diisi' });
    }

    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email sudah terdaftar di sistem' });
    }

    const newUser: User & { passwordHash: string } = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      agency: agency || 'Dinas Bina Marga',
      phone: phone || '',
      status: 'active',
      passwordHash: password,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Manajemen Pengguna',
      'TAMBAH',
      `Menambahkan akun baru: ${newUser.name} (${newUser.role.toUpperCase()}) - ${newUser.email}`,
      newUser.id
    );

    const { passwordHash, ...safeUser } = newUser;
    return res.status(201).json(safeUser);
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, role, agency, phone, status, password, adminUserId } = req.body;
    const user = db.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    if (name) user.name = name;
    if (role) user.role = role;
    if (agency) user.agency = agency;
    if (phone !== undefined) user.phone = phone;
    if (status) user.status = status;
    if (password) user.passwordHash = password;

    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Manajemen Pengguna',
      'EDIT',
      `Memperbarui data pengguna ${user.name} (${user.role.toUpperCase()})`,
      user.id
    );

    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  });

  app.post('/api/users/:id/reset-password', (req: Request, res: Response) => {
    const { id } = req.params;
    const { newPassword, adminUserId } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Kata sandi baru wajib diisi' });

    const user = db.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    user.passwordHash = newPassword;
    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Manajemen Pengguna',
      'RESET_PASSWORD',
      `Administrator mereset kata sandi pengguna ${user.name} (${user.email})`,
      user.id
    );

    return res.json({ success: true, message: `Kata sandi untuk ${user.name} berhasil diperbarui` });
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminUserId } = req.body;
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const deleted = db.users[index];
    if (deleted.id === 'usr-admin-1') {
      return res.status(400).json({ error: 'Akun Super Admin utama tidak dapat dihapus' });
    }

    db.users.splice(index, 1);
    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Manajemen Pengguna',
      'HAPUS',
      `Menghapus akun pengguna ${deleted.name} (${deleted.email})`,
      deleted.id
    );

    return res.json({ success: true, message: 'Pengguna berhasil dihapus' });
  });

  // ===================== PATCHING REPORTS =====================
  app.get('/api/patching', (req: Request, res: Response) => {
    const { roadName, status, dateStart, dateEnd, creatorId } = req.query;
    let list = [...db.patchingReports];

    if (roadName && typeof roadName === 'string') {
      list = list.filter(r => r.roadName.toLowerCase().includes(roadName.toLowerCase()));
    }
    if (status && typeof status === 'string' && status !== 'Semua') {
      list = list.filter(r => r.status === status);
    }
    if (dateStart && typeof dateStart === 'string') {
      list = list.filter(r => r.date >= dateStart);
    }
    if (dateEnd && typeof dateEnd === 'string') {
      list = list.filter(r => r.date <= dateEnd);
    }
    if (creatorId && typeof creatorId === 'string') {
      list = list.filter(r => r.createdBy.id === creatorId);
    }

    return res.json(list);
  });

  app.post('/api/patching', (req: Request, res: Response) => {
    const {
      roadName,
      side,
      staStart,
      staEnd,
      lengthM,
      widthM,
      thicknessCm,
      damageType,
      notes,
      weather,
      date,
      progressPercent,
      photos,
      user
    } = req.body;

    if (!roadName || !staStart || !staEnd || lengthM == null || widthM == null || thicknessCm == null) {
      return res.status(400).json({ error: 'Mohon lengkapi field ruas jalan, STA, dan dimensi (P, L, T)' });
    }

    const len = Number(lengthM);
    const wid = Number(widthM);
    const thk = Number(thicknessCm);
    const vol = parseFloat((len * wid * (thk / 100)).toFixed(3));
    const ton = parseFloat((vol * 2.3).toFixed(2)); // standard asphalt density approx 2.3 t/m3

    const newReport: PatchingReport = {
      id: `rep-${Date.now()}`,
      roadName,
      side: side || 'Kiri',
      staStart,
      staEnd,
      lengthM: len,
      widthM: wid,
      thicknessCm: thk,
      volumeM3: vol,
      tonnageTon: ton,
      damageType: damageType || 'Lubang',
      notes: notes || '',
      weather: weather || 'Cerah',
      date: date || new Date().toISOString().split('T')[0],
      progressPercent: progressPercent != null ? Number(progressPercent) as (0 | 50 | 100) : 0,
      photos: Array.isArray(photos) ? photos : [],
      status: 'Menunggu Verifikasi Pengawas',
      createdBy: {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Pelaksana Lapangan',
        role: user?.role || 'pelaksana',
        agency: user?.agency || 'Kontraktor Pelaksana',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          userId: user?.id || 'usr-anon',
          userName: user?.name || 'Pelaksana',
          action: 'INPUT',
          details: `Laporan baru dibuat untuk ruas ${roadName} STA ${staStart} s/d ${staEnd} (Vol: ${vol} m³)`
        }
      ]
    };

    db.patchingReports.unshift(newReport);
    saveDatabase(db);

    recordAuditLog(
      newReport.createdBy.id,
      newReport.createdBy.name,
      newReport.createdBy.role,
      'Laporan Patching',
      'TAMBAH',
      `Menambahkan laporan patching: ${newReport.roadName} STA ${newReport.staStart}-${newReport.staEnd} (${vol} m³)`,
      newReport.id
    );

    return res.status(201).json(newReport);
  });

  app.put('/api/patching/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const report = db.patchingReports.find(r => r.id === id);
    if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    const {
      roadName,
      side,
      staStart,
      staEnd,
      lengthM,
      widthM,
      thicknessCm,
      damageType,
      notes,
      weather,
      date,
      progressPercent,
      photos,
      user
    } = req.body;

    const changesRecorded: string[] = [];

    if (roadName && roadName !== report.roadName) {
      changesRecorded.push(`Ruas diubah dari "${report.roadName}" ke "${roadName}"`);
      report.roadName = roadName;
    }
    if (side) report.side = side;
    if (staStart && staStart !== report.staStart) {
      changesRecorded.push(`STA Awal: ${report.staStart} -> ${staStart}`);
      report.staStart = staStart;
    }
    if (staEnd && staEnd !== report.staEnd) {
      changesRecorded.push(`STA Akhir: ${report.staEnd} -> ${staEnd}`);
      report.staEnd = staEnd;
    }
    if (lengthM != null) report.lengthM = Number(lengthM);
    if (widthM != null) report.widthM = Number(widthM);
    if (thicknessCm != null) report.thicknessCm = Number(thicknessCm);

    // Recalculate volume & tonnage
    report.volumeM3 = parseFloat((report.lengthM * report.widthM * (report.thicknessCm / 100)).toFixed(3));
    report.tonnageTon = parseFloat((report.volumeM3 * 2.3).toFixed(2));

    if (damageType) report.damageType = damageType;
    if (notes !== undefined) report.notes = notes;
    if (weather) report.weather = weather;
    if (date) report.date = date;
    if (progressPercent != null) {
      if (report.progressPercent !== progressPercent) {
        changesRecorded.push(`Progres berubah: ${report.progressPercent}% -> ${progressPercent}%`);
      }
      report.progressPercent = Number(progressPercent) as (0 | 50 | 100);
    }
    if (Array.isArray(photos)) {
      const addedCount = photos.length - report.photos.length;
      if (addedCount > 0) {
        changesRecorded.push(`Menambahkan ${addedCount} foto dokumentasi`);
      }
      report.photos = photos;
    }

    report.updatedAt = new Date().toISOString();
    report.history.unshift({
      timestamp: new Date().toISOString(),
      userId: user?.id || 'usr-edit',
      userName: user?.name || 'Pengguna',
      action: 'EDIT',
      details: changesRecorded.length > 0 ? changesRecorded.join('; ') : 'Memperbarui data teknis'
    });

    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-edit',
      user?.name || 'Pengguna',
      user?.role || 'pelaksana',
      'Laporan Patching',
      'EDIT',
      `Memperbarui laporan patching ${report.roadName} STA ${report.staStart}-${report.staEnd}`,
      report.id
    );

    return res.json(report);
  });

  // Review / Approval Endpoint for Pengawas & PPK
  app.post('/api/patching/:id/review', (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision, notes, user } = req.body;
    const report = db.patchingReports.find(r => r.id === id);
    if (!report) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    if (!user || (user.role !== 'pengawas' && user.role !== 'ppk' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Hanya Pengawas, PPK, atau Admin yang dapat memverifikasi laporan ini' });
    }

    const reviewObj = {
      byUserId: user.id,
      byUserName: user.name,
      role: user.role as ('pengawas' | 'ppk'),
      timestamp: new Date().toISOString(),
      status: decision as ('approved' | 'rejected' | 'revision'),
      notes: notes || '',
    };

    let logAction: AuditLog['action'] = 'VERIFIKASI_PENGAWAS';

    if (user.role === 'pengawas') {
      report.pengawasReview = reviewObj;
      if (decision === 'approved') {
        report.status = 'Diverifikasi Pengawas';
        report.history.unshift({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          action: 'VERIFIKASI_PENGAWAS',
          details: `Pengawas MENYETUJUI: "${notes || 'Kualitas & ketebalan sesuai standar'}"`
        });
      } else {
        report.status = 'Perlu Revisi';
        report.history.unshift({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          action: 'REVISI_PENGAWAS',
          details: `Pengawas MINTA REVISI: "${notes}"`
        });
      }
    } else if (user.role === 'ppk' || user.role === 'admin') {
      logAction = 'APPROVAL_PPK';
      report.ppkApproval = reviewObj;
      if (decision === 'approved') {
        report.status = 'Disetujui PPK';
        report.history.unshift({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          action: 'APPROVAL_PPK',
          details: `PPK MENYETUJUI: "${notes || 'Disahkan untuk rekap opname volume'}"`
        });
      } else {
        report.status = 'Perlu Revisi';
        report.history.unshift({
          timestamp: new Date().toISOString(),
          userId: user.id,
          userName: user.name,
          action: 'REVISI_PPK',
          details: `PPK MINTA REVISI: "${notes}"`
        });
      }
    }

    report.updatedAt = new Date().toISOString();
    saveDatabase(db);

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      'Laporan Patching',
      logAction,
      `${user.role.toUpperCase()} (${user.name}) ${decision === 'approved' ? 'menyetujui' : 'meminta revisi'} laporan ${report.roadName} STA ${report.staStart}`,
      report.id
    );

    return res.json(report);
  });

  app.delete('/api/patching/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req.body;
    const index = db.patchingReports.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ error: 'Laporan tidak ditemukan' });

    const deleted = db.patchingReports[index];

    // Authorization: Pelaksana can only delete their own Draft, Admin can delete any
    if (user && user.role === 'pelaksana' && deleted.createdBy.id !== user.id) {
      return res.status(403).json({ error: 'Anda hanya dapat menghapus laporan milik sendiri' });
    }

    db.patchingReports.splice(index, 1);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-del',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Laporan Patching',
      'HAPUS',
      `Menghapus laporan patching: ${deleted.roadName} STA ${deleted.staStart}-${deleted.staEnd}`,
      deleted.id
    );

    return res.json({ success: true, message: 'Laporan berhasil dihapus' });
  });

  // ===================== SURAT MASUK & KELUAR =====================
  app.get('/api/surat', (req: Request, res: Response) => {
    const { type, status, search } = req.query;
    let list = [...db.letters];

    if (type && typeof type === 'string' && type !== 'semua') {
      list = list.filter(l => l.type === type);
    }
    if (status && typeof status === 'string' && status !== 'semua') {
      list = list.filter(l => l.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.letterNumber.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        l.originOrDestination.toLowerCase().includes(q)
      );
    }

    return res.json(list);
  });

  app.post('/api/surat', (req: Request, res: Response) => {
    const {
      letterNumber,
      letterDate,
      receivedOrSentDate,
      type,
      subject,
      originOrDestination,
      attachmentName,
      attachmentData,
      attachmentType,
      status,
      dispositionNotes,
      user
    } = req.body;

    if (!letterNumber || !subject || !originOrDestination) {
      return res.status(400).json({ error: 'Nomor surat, perihal, dan asal/tujuan surat wajib diisi' });
    }

    const newLetter: LetterItem = {
      id: `let-${Date.now()}`,
      letterNumber,
      letterDate: letterDate || new Date().toISOString().split('T')[0],
      receivedOrSentDate: receivedOrSentDate || new Date().toISOString().split('T')[0],
      type: type === 'keluar' ? 'keluar' : 'masuk',
      subject,
      originOrDestination,
      attachmentName,
      attachmentData,
      attachmentType,
      status: status || 'proses',
      dispositionNotes: dispositionNotes || '',
      createdBy: {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Administrator',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.letters.unshift(newLetter);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Surat Masuk & Keluar',
      'TAMBAH',
      `Mencatat surat ${newLetter.type.toUpperCase()}: No. ${newLetter.letterNumber} (${newLetter.subject})`,
      newLetter.id
    );

    return res.status(201).json(newLetter);
  });

  app.put('/api/surat/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const letter = db.letters.find(l => l.id === id);
    if (!letter) return res.status(404).json({ error: 'Surat tidak ditemukan' });

    const {
      letterNumber,
      letterDate,
      receivedOrSentDate,
      type,
      subject,
      originOrDestination,
      attachmentName,
      attachmentData,
      attachmentType,
      status,
      dispositionNotes,
      user
    } = req.body;

    if (letterNumber) letter.letterNumber = letterNumber;
    if (letterDate) letter.letterDate = letterDate;
    if (receivedOrSentDate) letter.receivedOrSentDate = receivedOrSentDate;
    if (type) letter.type = type;
    if (subject) letter.subject = subject;
    if (originOrDestination) letter.originOrDestination = originOrDestination;
    if (attachmentName !== undefined) letter.attachmentName = attachmentName;
    if (attachmentData !== undefined) letter.attachmentData = attachmentData;
    if (attachmentType !== undefined) letter.attachmentType = attachmentType;
    if (status) letter.status = status;
    if (dispositionNotes !== undefined) letter.dispositionNotes = dispositionNotes;
    letter.updatedAt = new Date().toISOString();

    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Surat Masuk & Keluar',
      'EDIT',
      `Memperbarui surat: No. ${letter.letterNumber} (${letter.subject})`,
      letter.id
    );

    return res.json(letter);
  });

  app.delete('/api/surat/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req.body;
    const index = db.letters.findIndex(l => l.id === id);
    if (index === -1) return res.status(404).json({ error: 'Surat tidak ditemukan' });

    const deleted = db.letters[index];
    db.letters.splice(index, 1);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Surat Masuk & Keluar',
      'HAPUS',
      `Menghapus arsip surat: No. ${deleted.letterNumber}`,
      deleted.id
    );

    return res.json({ success: true, message: 'Surat berhasil dihapus' });
  });

  // ===================== MATERIAL MANAGEMENT =====================
  app.get('/api/material', (req: Request, res: Response) => {
    const { materialName, type, dateStart, dateEnd } = req.query;
    let list = [...db.materials];

    if (materialName && typeof materialName === 'string') {
      list = list.filter(m => m.materialName.toLowerCase().includes(materialName.toLowerCase()));
    }
    if (type && typeof type === 'string' && type !== 'semua') {
      list = list.filter(m => m.type === type);
    }
    if (dateStart && typeof dateStart === 'string') {
      list = list.filter(m => m.date >= dateStart);
    }
    if (dateEnd && typeof dateEnd === 'string') {
      list = list.filter(m => m.date <= dateEnd);
    }

    return res.json(list);
  });

  // Calculate Running Stock Ledger
  app.get('/api/material/stock', (_req: Request, res: Response) => {
    const stockMap = new Map<string, MaterialStockSummary>();

    for (const tx of db.materials) {
      if (!stockMap.has(tx.materialName)) {
        stockMap.set(tx.materialName, {
          materialName: tx.materialName,
          unit: tx.unit,
          totalMasuk: 0,
          totalKeluar: 0,
          totalPakai: 0,
          currentStock: 0,
          lastUpdated: tx.date,
        });
      }

      const item = stockMap.get(tx.materialName)!;
      if (tx.type === 'masuk') item.totalMasuk += tx.amount;
      if (tx.type === 'keluar') item.totalKeluar += tx.amount;
      if (tx.type === 'pakai') item.totalPakai += tx.amount;
      if (tx.date > item.lastUpdated) item.lastUpdated = tx.date;
    }

    const summaries: MaterialStockSummary[] = Array.from(stockMap.values()).map(item => ({
      ...item,
      totalMasuk: parseFloat(item.totalMasuk.toFixed(2)),
      totalKeluar: parseFloat(item.totalKeluar.toFixed(2)),
      totalPakai: parseFloat(item.totalPakai.toFixed(2)),
      currentStock: parseFloat((item.totalMasuk - item.totalKeluar - item.totalPakai).toFixed(2)),
    }));

    return res.json(summaries);
  });

  app.post('/api/material', (req: Request, res: Response) => {
    const {
      materialName,
      date,
      type,
      amount,
      unit,
      sourceOrDestination,
      roadName,
      staLocation,
      waybillNumber,
      notes,
      proofPhotoName,
      proofPhotoData,
      user
    } = req.body;

    if (!materialName || !amount || !unit || !type) {
      return res.status(400).json({ error: 'Nama material, tipe transaksi, jumlah, dan satuan wajib diisi' });
    }

    const newTx: MaterialTransaction = {
      id: `mat-${Date.now()}`,
      materialName,
      date: date || new Date().toISOString().split('T')[0],
      type,
      amount: Number(amount),
      unit,
      sourceOrDestination: sourceOrDestination || '-',
      roadName: type === 'pakai' ? (roadName || '-') : undefined,
      staLocation: type === 'pakai' ? staLocation : undefined,
      waybillNumber,
      notes,
      proofPhotoName,
      proofPhotoData,
      createdBy: {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Pelaksana Material',
      },
      createdAt: new Date().toISOString(),
    };

    db.materials.unshift(newTx);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'pelaksana',
      'Material Jalan',
      'TAMBAH',
      `Mencatat transaksi material ${newTx.type.toUpperCase()}: ${newTx.amount} ${newTx.unit} ${newTx.materialName}`,
      newTx.id
    );

    return res.status(201).json(newTx);
  });

  app.put('/api/material/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const tx = db.materials.find(m => m.id === id);
    if (!tx) return res.status(404).json({ error: 'Transaksi material tidak ditemukan' });

    const {
      materialName,
      date,
      type,
      amount,
      unit,
      sourceOrDestination,
      roadName,
      staLocation,
      waybillNumber,
      notes,
      proofPhotoName,
      proofPhotoData,
      user
    } = req.body;

    if (materialName) tx.materialName = materialName;
    if (date) tx.date = date;
    if (type) tx.type = type;
    if (amount != null) tx.amount = Number(amount);
    if (unit) tx.unit = unit;
    if (sourceOrDestination) tx.sourceOrDestination = sourceOrDestination;
    if (roadName !== undefined) tx.roadName = roadName;
    if (staLocation !== undefined) tx.staLocation = staLocation;
    if (waybillNumber !== undefined) tx.waybillNumber = waybillNumber;
    if (notes !== undefined) tx.notes = notes;
    if (proofPhotoName !== undefined) tx.proofPhotoName = proofPhotoName;
    if (proofPhotoData !== undefined) tx.proofPhotoData = proofPhotoData;

    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'pelaksana',
      'Material Jalan',
      'EDIT',
      `Memperbarui transaksi material ${tx.materialName} (${tx.amount} ${tx.unit})`,
      tx.id
    );

    return res.json(tx);
  });

  app.delete('/api/material/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req.body;
    const index = db.materials.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const deleted = db.materials[index];
    db.materials.splice(index, 1);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Material Jalan',
      'HAPUS',
      `Menghapus transaksi material ${deleted.materialName} (${deleted.amount} ${deleted.unit})`,
      deleted.id
    );

    return res.json({ success: true, message: 'Transaksi berhasil dihapus' });
  });

  // ===================== EQUIPMENT / JAM KERJA ALAT =====================
  app.get('/api/alat', (req: Request, res: Response) => {
    const { equipmentName, dateStart, dateEnd, operator } = req.query;
    let list = [...db.equipmentLogs];

    if (equipmentName && typeof equipmentName === 'string') {
      list = list.filter(e => e.equipmentName.toLowerCase().includes(equipmentName.toLowerCase()));
    }
    if (dateStart && typeof dateStart === 'string') {
      list = list.filter(e => e.date >= dateStart);
    }
    if (dateEnd && typeof dateEnd === 'string') {
      list = list.filter(e => e.date <= dateEnd);
    }
    if (operator && typeof operator === 'string') {
      list = list.filter(e => e.operatorName.toLowerCase().includes(operator.toLowerCase()));
    }

    return res.json(list);
  });

  app.get('/api/alat/rekap', (_req: Request, res: Response) => {
    const map = new Map<string, {
      equipmentName: string;
      equipmentCode: string;
      equipmentType: string;
      totalJamOperasi: number;
      totalHariKerja: number;
      totalBahanBakar: number;
      lastDate: string;
    }>();

    for (const log of db.equipmentLogs) {
      const key = `${log.equipmentName}___${log.equipmentCode}`;
      if (!map.has(key)) {
        map.set(key, {
          equipmentName: log.equipmentName,
          equipmentCode: log.equipmentCode,
          equipmentType: log.equipmentType,
          totalJamOperasi: 0,
          totalHariKerja: 0,
          totalBahanBakar: 0,
          lastDate: log.date,
        });
      }

      const item = map.get(key)!;
      item.totalJamOperasi += log.totalHours;
      item.totalHariKerja += 1;
      item.totalBahanBakar += (log.fuelAddedLiters || 0);
      if (log.date > item.lastDate) item.lastDate = log.date;
    }

    const rekap = Array.from(map.values()).map(r => ({
      ...r,
      totalJamOperasi: parseFloat(r.totalJamOperasi.toFixed(2)),
      totalBahanBakar: parseFloat(r.totalBahanBakar.toFixed(2)),
    }));

    return res.json(rekap);
  });

  app.post('/api/alat', (req: Request, res: Response) => {
    const {
      equipmentName,
      equipmentType,
      equipmentCode,
      date,
      startTime,
      endTime,
      breakMinutes,
      roadName,
      locationSta,
      operatorName,
      status,
      notes,
      fuelAddedLiters,
      user
    } = req.body;

    if (!equipmentName || !startTime || !endTime || !operatorName) {
      return res.status(400).json({ error: 'Nama alat, jam mulai, jam selesai, dan nama operator wajib diisi' });
    }

    // Calculate total hours
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Cross midnight handler
    const breakMin = Number(breakMinutes || 0);
    const netMinutes = Math.max(0, diffMinutes - breakMin);
    const totalHours = parseFloat((netMinutes / 60).toFixed(2));

    const newLog: EquipmentLog = {
      id: `eq-${Date.now()}`,
      equipmentName,
      equipmentType: equipmentType || 'Alat Berat',
      equipmentCode: equipmentCode || 'ALAT-01',
      date: date || new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      breakMinutes: breakMin,
      totalHours,
      roadName: roadName || '-',
      locationSta: locationSta || '-',
      operatorName,
      status: status || 'Beroperasi Normal',
      notes,
      fuelAddedLiters: fuelAddedLiters ? Number(fuelAddedLiters) : undefined,
      createdBy: {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Pelaksana Alat',
      },
      createdAt: new Date().toISOString(),
    };

    db.equipmentLogs.unshift(newLog);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'pelaksana',
      'Jam Alat Berat',
      'TAMBAH',
      `Mencatat jam operasional alat ${newLog.equipmentName} (${newLog.totalHours} Jam) oleh Operator ${newLog.operatorName}`,
      newLog.id
    );

    return res.status(201).json(newLog);
  });

  app.put('/api/alat/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const log = db.equipmentLogs.find(e => e.id === id);
    if (!log) return res.status(404).json({ error: 'Log alat tidak ditemukan' });

    const {
      equipmentName,
      equipmentType,
      equipmentCode,
      date,
      startTime,
      endTime,
      breakMinutes,
      roadName,
      locationSta,
      operatorName,
      status,
      notes,
      fuelAddedLiters,
      user
    } = req.body;

    if (equipmentName) log.equipmentName = equipmentName;
    if (equipmentType) log.equipmentType = equipmentType;
    if (equipmentCode) log.equipmentCode = equipmentCode;
    if (date) log.date = date;
    if (startTime) log.startTime = startTime;
    if (endTime) log.endTime = endTime;
    if (breakMinutes !== undefined) log.breakMinutes = Number(breakMinutes);

    // Recalculate
    const [startH, startM] = log.startTime.split(':').map(Number);
    const [endH, endM] = log.endTime.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    const netMinutes = Math.max(0, diffMinutes - log.breakMinutes);
    log.totalHours = parseFloat((netMinutes / 60).toFixed(2));

    if (roadName) log.roadName = roadName;
    if (locationSta) log.locationSta = locationSta;
    if (operatorName) log.operatorName = operatorName;
    if (status) log.status = status;
    if (notes !== undefined) log.notes = notes;
    if (fuelAddedLiters !== undefined) log.fuelAddedLiters = Number(fuelAddedLiters);

    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'pelaksana',
      'Jam Alat Berat',
      'EDIT',
      `Memperbarui log alat ${log.equipmentName} (${log.equipmentCode})`,
      log.id
    );

    return res.json(log);
  });

  app.delete('/api/alat/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { user } = req.body;
    const index = db.equipmentLogs.findIndex(e => e.id === id);
    if (index === -1) return res.status(404).json({ error: 'Log tidak ditemukan' });

    const deleted = db.equipmentLogs[index];
    db.equipmentLogs.splice(index, 1);
    saveDatabase(db);

    recordAuditLog(
      user?.id || 'usr-anon',
      user?.name || 'Pengguna',
      user?.role || 'admin',
      'Jam Alat Berat',
      'HAPUS',
      `Menghapus log jam alat ${deleted.equipmentName} (${deleted.equipmentCode})`,
      deleted.id
    );

    return res.json({ success: true, message: 'Log jam alat berhasil dihapus' });
  });

  // ===================== AUDIT LOGS =====================
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    const { module, action, search } = req.query;
    let list = [...db.auditLogs];

    if (module && typeof module === 'string' && module !== 'Semua') {
      list = list.filter(l => l.module === module);
    }
    if (action && typeof action === 'string' && action !== 'Semua') {
      list = list.filter(l => l.action === action);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.userName.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q)
      );
    }

    return res.json(list);
  });

  // ===================== BACKUP & RESTORE =====================
  app.get('/api/system/backup', (req: Request, res: Response) => {
    const { adminUserId } = req.query;
    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };

    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Sistem & Backup',
      'BACKUP_DATA',
      `Administrator mengunduh cadangan lengkap database sistem (JSON snapshot).`
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_monitoring_jalan_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    return res.json(db);
  });

  app.post('/api/system/restore', (req: Request, res: Response) => {
    const { backupData, adminUserId } = req.body;
    if (!backupData || !Array.isArray(backupData.patchingReports)) {
      return res.status(400).json({ error: 'Format berkas cadangan database tidak valid' });
    }

    db = backupData;
    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Sistem & Backup',
      'RESTORE_DATA',
      `Administrator memulihkan database dari berkas cadangan.`
    );

    return res.json({ success: true, message: 'Database sistem berhasil dipulihkan' });
  });

  app.post('/api/system/reset-demo', (req: Request, res: Response) => {
    const { adminUserId } = req.body;
    db = {
      users: INITIAL_USERS,
      patchingReports: INITIAL_PATCHING_REPORTS,
      letters: INITIAL_LETTERS,
      materials: INITIAL_MATERIALS,
      equipmentLogs: INITIAL_EQUIPMENT_LOGS,
      auditLogs: INITIAL_AUDIT_LOGS,
    };
    saveDatabase(db);

    const admin = db.users.find(u => u.id === adminUserId) || { id: 'admin', name: 'Admin', role: 'admin' as const };
    recordAuditLog(
      admin.id,
      admin.name,
      admin.role,
      'Sistem & Backup',
      'RESTORE_DATA',
      `Database di-reset ke data demonstrasi standar.`
    );

    return res.json({ success: true, message: 'Data demo awal berhasil dimuat ulang' });
  });

  // ===================== FRONTEND INTEGRATION =====================
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Road Construction Monitoring App] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
