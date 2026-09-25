import {
  User,
  PatchingReport,
  LetterItem,
  MaterialTransaction,
  EquipmentLog,
  AuditLog,
  MaterialStockSummary
} from '../types';

export const API_BASE = '/api';

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Gagal login');
    }
    return res.json();
  },

  async logout(userId?: string): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string; tempToken?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Permintaan gagal');
    return data;
  },

  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Gagal mengambil daftar pengguna');
    return res.json();
  },

  async createUser(userData: any, adminUserId: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, adminUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat pengguna');
    }
    return res.json();
  },

  async updateUser(id: string, userData: any, adminUserId: string): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, adminUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui pengguna');
    }
    return res.json();
  },

  async resetUserPassword(id: string, newPassword: string, adminUserId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, adminUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal mereset kata sandi');
    }
  },

  async deleteUser(id: string, adminUserId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus pengguna');
    }
  },

  // Patching Reports
  async getPatchingReports(params?: {
    roadName?: string;
    status?: string;
    dateStart?: string;
    dateEnd?: string;
    creatorId?: string;
  }): Promise<PatchingReport[]> {
    const query = new URLSearchParams();
    if (params?.roadName) query.set('roadName', params.roadName);
    if (params?.status) query.set('status', params.status);
    if (params?.dateStart) query.set('dateStart', params.dateStart);
    if (params?.dateEnd) query.set('dateEnd', params.dateEnd);
    if (params?.creatorId) query.set('creatorId', params.creatorId);

    const res = await fetch(`${API_BASE}/patching?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat laporan patching');
    return res.json();
  },

  async createPatchingReport(reportData: any, user: User): Promise<PatchingReport> {
    const res = await fetch(`${API_BASE}/patching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reportData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan laporan patching');
    }
    return res.json();
  },

  async updatePatchingReport(id: string, reportData: any, user: User): Promise<PatchingReport> {
    const res = await fetch(`${API_BASE}/patching/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...reportData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui laporan');
    }
    return res.json();
  },

  async reviewPatchingReport(
    id: string,
    decision: 'approved' | 'revision',
    notes: string,
    user: User
  ): Promise<PatchingReport> {
    const res = await fetch(`${API_BASE}/patching/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, notes, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memverifikasi laporan');
    }
    return res.json();
  },

  async deletePatchingReport(id: string, user: User): Promise<void> {
    const res = await fetch(`${API_BASE}/patching/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus laporan');
    }
  },

  // Surat
  async getLetters(params?: { type?: string; status?: string; search?: string }): Promise<LetterItem[]> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/surat?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat agenda surat');
    return res.json();
  },

  async createLetter(letterData: any, user: User): Promise<LetterItem> {
    const res = await fetch(`${API_BASE}/surat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...letterData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal membuat surat');
    }
    return res.json();
  },

  async updateLetter(id: string, letterData: any, user: User): Promise<LetterItem> {
    const res = await fetch(`${API_BASE}/surat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...letterData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui surat');
    }
    return res.json();
  },

  async deleteLetter(id: string, user: User): Promise<void> {
    const res = await fetch(`${API_BASE}/surat/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus surat');
    }
  },

  // Materials
  async getMaterials(params?: {
    materialName?: string;
    type?: string;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<MaterialTransaction[]> {
    const query = new URLSearchParams();
    if (params?.materialName) query.set('materialName', params.materialName);
    if (params?.type) query.set('type', params.type);
    if (params?.dateStart) query.set('dateStart', params.dateStart);
    if (params?.dateEnd) query.set('dateEnd', params.dateEnd);

    const res = await fetch(`${API_BASE}/material?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat transaksi material');
    return res.json();
  },

  async getMaterialStock(): Promise<MaterialStockSummary[]> {
    const res = await fetch(`${API_BASE}/material/stock`);
    if (!res.ok) throw new Error('Gagal memuat saldo stok material');
    return res.json();
  },

  async createMaterial(materialData: any, user: User): Promise<MaterialTransaction> {
    const res = await fetch(`${API_BASE}/material`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...materialData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan transaksi material');
    }
    return res.json();
  },

  async updateMaterial(id: string, materialData: any, user: User): Promise<MaterialTransaction> {
    const res = await fetch(`${API_BASE}/material/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...materialData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui transaksi');
    }
    return res.json();
  },

  async deleteMaterial(id: string, user: User): Promise<void> {
    const res = await fetch(`${API_BASE}/material/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus transaksi');
    }
  },

  // Equipment (Jam Alat)
  async getEquipmentLogs(params?: {
    equipmentName?: string;
    dateStart?: string;
    dateEnd?: string;
    operator?: string;
  }): Promise<EquipmentLog[]> {
    const query = new URLSearchParams();
    if (params?.equipmentName) query.set('equipmentName', params.equipmentName);
    if (params?.dateStart) query.set('dateStart', params.dateStart);
    if (params?.dateEnd) query.set('dateEnd', params.dateEnd);
    if (params?.operator) query.set('operator', params.operator);

    const res = await fetch(`${API_BASE}/alat?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat log jam alat');
    return res.json();
  },

  async getEquipmentRekap(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/alat/rekap`);
    if (!res.ok) throw new Error('Gagal memuat rekap jam alat');
    return res.json();
  },

  async createEquipmentLog(logData: any, user: User): Promise<EquipmentLog> {
    const res = await fetch(`${API_BASE}/alat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...logData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menyimpan jam alat');
    }
    return res.json();
  },

  async updateEquipmentLog(id: string, logData: any, user: User): Promise<EquipmentLog> {
    const res = await fetch(`${API_BASE}/alat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...logData, user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memperbarui data alat');
    }
    return res.json();
  },

  async deleteEquipmentLog(id: string, user: User): Promise<void> {
    const res = await fetch(`${API_BASE}/alat/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal menghapus log alat');
    }
  },

  // Audit Logs
  async getAuditLogs(params?: { module?: string; action?: string; search?: string }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.module) query.set('module', params.module);
    if (params?.action) query.set('action', params.action);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE}/audit-logs?${query.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat audit log');
    return res.json();
  },

  // Backup & Restore
  async downloadBackup(adminUserId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/system/backup?adminUserId=${adminUserId}`);
    if (!res.ok) throw new Error('Gagal mengunduh backup');
    return res.json();
  },

  async restoreBackup(backupData: any, adminUserId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/system/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backupData, adminUserId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Gagal memulihkan database');
    }
  },

  async resetDemoData(adminUserId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/system/reset-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId }),
    });
    if (!res.ok) throw new Error('Gagal me-reset data demo');
  }
};
