/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  PatchingReport,
  LetterItem,
  MaterialTransaction,
  MaterialStockSummary,
  EquipmentLog,
  AuditLog
} from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { PatchingView } from './components/PatchingView';
import { PatchingModal } from './components/PatchingModal';
import { PatchingDetailModal } from './components/PatchingDetailModal';
import { MaterialView } from './components/MaterialView';
import { EquipmentView } from './components/EquipmentView';
import { LettersView } from './components/LettersView';
import { AuditView } from './components/AuditView';
import { UsersView } from './components/UsersView';
import { ArchitectureGuide } from './components/ArchitectureGuide';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('binamarga_sarolangun_user') || localStorage.getItem('simpang_jalan_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<PatchingReport[]>([]);
  const [letters, setLetters] = useState<LetterItem[]>([]);
  const [materials, setMaterials] = useState<MaterialTransaction[]>([]);
  const [stockSummaries, setStockSummaries] = useState<MaterialStockSummary[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);
  const [equipmentRekap, setEquipmentRekap] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modals
  const [isPatchingModalOpen, setIsPatchingModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PatchingReport | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<PatchingReport | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `t-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all core system data
  const fetchData = useCallback(async () => {
    try {
      const [
        usersData,
        reportsData,
        lettersData,
        materialsData,
        stocksData,
        equipmentData,
        rekapData,
        auditData,
      ] = await Promise.all([
        api.getUsers(),
        api.getPatchingReports(),
        api.getLetters(),
        api.getMaterials(),
        api.getMaterialStock(),
        api.getEquipmentLogs(),
        api.getEquipmentRekap(),
        api.getAuditLogs(),
      ]);

      setUsers(usersData);
      setReports(reportsData);
      setLetters(lettersData);
      setMaterials(materialsData);
      setStockSummaries(stocksData);
      setEquipmentLogs(equipmentData);
      setEquipmentRekap(rekapData);
      setAuditLogs(auditData);

      // Keep user in sync if roles were modified by admin
      if (currentUser) {
        const found = usersData.find((u) => u.id === currentUser.id);
        if (found) {
          setCurrentUser(found);
          localStorage.setItem('binamarga_sarolangun_user', JSON.stringify(found));
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, []);

  // Sync current user to local storage
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('binamarga_sarolangun_user', JSON.stringify(user));
    addToast('success', `Selamat datang, ${user.name} (${user.role.toUpperCase()})`);
    fetchData();
  };

  const handleLogout = async () => {
    if (currentUser) {
      await api.logout(currentUser.id);
    }
    setCurrentUser(null);
    localStorage.removeItem('binamarga_sarolangun_user');
    localStorage.removeItem('simpang_jalan_user');
    addToast('info', 'Anda telah keluar dari sistem.');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('binamarga_sarolangun_user', JSON.stringify(user));
    addToast('info', `Beralih ke akun ${user.name} (${user.role.toUpperCase()})`);
    // If switched from admin to non-admin while on user tab, redirect to dashboard
    if (user.role !== 'admin' && activeTab === 'users') {
      setActiveTab('dashboard');
    }
  };

  // Road options extracted from reports
  const roadOptions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(r.roadName));
    if (set.size === 0) {
      return ['Ruas Pantura KM 42+000 - 45+000', 'Jl. Lingkar Luar Barat KM 14-22'];
    }
    return Array.from(set);
  }, [reports]);

  // Patching Handlers
  const handleSaveReport = async (reportData: any) => {
    if (!currentUser) return;
    if (editingReport) {
      const updated = await api.updatePatchingReport(editingReport.id, reportData, currentUser);
      addToast('success', `Laporan STA ${updated.staStart} berhasil diperbarui.`);
    } else {
      const created = await api.createPatchingReport(reportData, currentUser);
      addToast('success', `Laporan baru STA ${created.staStart}-${created.staEnd} berhasil disimpan.`);
    }
    setIsPatchingModalOpen(false);
    setEditingReport(null);
    fetchData();
  };

  const handleReviewReport = async (decision: 'approved' | 'revision', notes: string) => {
    if (!currentUser || !selectedReportDetail) return;
    const reviewed = await api.reviewPatchingReport(selectedReportDetail.id, decision, notes, currentUser);
    setSelectedReportDetail(reviewed);
    addToast(
      decision === 'approved' ? 'success' : 'info',
      decision === 'approved'
        ? `Laporan STA ${reviewed.staStart} berhasil disahkan oleh ${currentUser.role.toUpperCase()}`
        : `Catatan revisi telah dikirim ke pelaksana.`
    );
    fetchData();
  };

  const handleDeleteReport = async (report: PatchingReport) => {
    if (!currentUser) return;
    if (!confirm(`Hapus laporan pekerjaan STA ${report.staStart} s/d ${report.staEnd}?`)) return;
    await api.deletePatchingReport(report.id, currentUser);
    addToast('success', 'Laporan pekerjaan jalan berhasil dihapus.');
    if (selectedReportDetail?.id === report.id) {
      setSelectedReportDetail(null);
    }
    fetchData();
  };

  // Material Handlers
  const handleSaveMaterial = async (data: any) => {
    if (!currentUser) return;
    if (data.id) {
      await api.updateMaterial(data.id, data, currentUser);
      addToast('success', `Transaksi material ${data.materialName} berhasil diperbarui.`);
    } else {
      await api.createMaterial(data, currentUser);
      addToast('success', `Transaksi material ${data.materialName} berhasil dicatat.`);
    }
    fetchData();
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Hapus catatan transaksi material ini?')) return;
    await api.deleteMaterial(id, currentUser);
    addToast('success', 'Transaksi material berhasil dihapus.');
    fetchData();
  };

  // Equipment Handlers
  const handleSaveEquipment = async (data: any) => {
    if (!currentUser) return;
    if (data.id) {
      await api.updateEquipmentLog(data.id, data, currentUser);
      addToast('success', `Log jam kerja alat ${data.equipmentName} berhasil diperbarui.`);
    } else {
      await api.createEquipmentLog(data, currentUser);
      addToast('success', `Log jam kerja alat ${data.equipmentName} berhasil disimpan.`);
    }
    fetchData();
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Hapus catatan jam kerja alat ini?')) return;
    await api.deleteEquipmentLog(id, currentUser);
    addToast('success', 'Catatan jam kerja alat berhasil dihapus.');
    fetchData();
  };

  // Letter Handlers
  const handleSaveLetter = async (data: any) => {
    if (!currentUser) return;
    if (data.id) {
      await api.updateLetter(data.id, data, currentUser);
      addToast('success', `Surat No. ${data.letterNumber} berhasil diperbarui.`);
    } else {
      await api.createLetter(data, currentUser);
      addToast('success', `Surat No. ${data.letterNumber} berhasil dicatat.`);
    }
    fetchData();
  };

  const handleDeleteLetter = async (id: string) => {
    if (!currentUser) return;
    if (!confirm('Hapus arsip surat ini?')) return;
    await api.deleteLetter(id, currentUser);
    addToast('success', 'Arsip surat berhasil dihapus.');
    fetchData();
  };

  // If not logged in, show Auth Screen
  if (!currentUser) {
    return (
      <>
        <AuthModal
          onLoginSuccess={handleLoginSuccess}
          availableDemoUsers={users}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col pb-20 md:pb-6">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        availableUsers={users}
        onSwitchUser={handleSwitchUser}
        onRefreshData={() => {
          fetchData();
          addToast('info', 'Data disinkronkan dengan database pusat.');
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            reports={reports}
            equipmentLogs={equipmentLogs}
            stocks={stockSummaries}
            currentUser={currentUser}
            onOpenReport={(rep) => setSelectedReportDetail(rep)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'patching' && (
          <PatchingView
            reports={reports}
            currentUser={currentUser}
            onOpenReport={(rep) => setSelectedReportDetail(rep)}
            onAddNew={() => {
              setEditingReport(null);
              setIsPatchingModalOpen(true);
            }}
            onEdit={(rep) => {
              setEditingReport(rep);
              setIsPatchingModalOpen(true);
            }}
            onDelete={handleDeleteReport}
          />
        )}

        {activeTab === 'material' && (
          <MaterialView
            materials={materials}
            stockSummaries={stockSummaries}
            currentUser={currentUser}
            onSaveTransaction={handleSaveMaterial}
            onDeleteTransaction={handleDeleteMaterial}
            roadOptions={roadOptions}
          />
        )}

        {activeTab === 'alat' && (
          <EquipmentView
            logs={equipmentLogs}
            rekap={equipmentRekap}
            currentUser={currentUser}
            onSaveLog={handleSaveEquipment}
            onDeleteLog={handleDeleteEquipment}
            roadOptions={roadOptions}
          />
        )}

        {activeTab === 'surat' && (
          <LettersView
            letters={letters}
            currentUser={currentUser}
            onSaveLetter={handleSaveLetter}
            onDeleteLetter={handleDeleteLetter}
          />
        )}

        {activeTab === 'audit' && (
          <AuditView logs={auditLogs} />
        )}

        {activeTab === 'users' && currentUser.role === 'admin' && (
          <UsersView
            users={users}
            currentUser={currentUser}
            onRefreshUsers={fetchData}
            onShowToast={addToast}
          />
        )}

        {activeTab === 'panduan' && (
          <ArchitectureGuide />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
      />

      {/* Modals */}
      <PatchingModal
        isOpen={isPatchingModalOpen}
        onClose={() => {
          setIsPatchingModalOpen(false);
          setEditingReport(null);
        }}
        onSave={handleSaveReport}
        editData={editingReport}
        currentUser={currentUser}
        roadSuggestions={roadOptions}
      />

      <PatchingDetailModal
        isOpen={!!selectedReportDetail}
        onClose={() => setSelectedReportDetail(null)}
        report={selectedReportDetail}
        currentUser={currentUser}
        onReview={handleReviewReport}
        onEdit={(rep) => {
          setSelectedReportDetail(null);
          setEditingReport(rep);
          setIsPatchingModalOpen(true);
        }}
      />

      {/* Global Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
