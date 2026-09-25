import React, { useState, useMemo } from 'react';
import {
  PatchingReport,
  EquipmentLog,
  MaterialStockSummary,
  User
} from '../types';
import {
  Activity,
  Layers,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  Truck,
  TrendingUp,
  MapPin,
  ChevronRight,
  HardHat
} from 'lucide-react';

interface DashboardViewProps {
  reports: PatchingReport[];
  equipmentLogs: EquipmentLog[];
  stocks: MaterialStockSummary[];
  currentUser: User;
  onOpenReport: (report: PatchingReport) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  equipmentLogs,
  stocks,
  currentUser,
  onOpenReport,
  onNavigateToTab,
}) => {
  const [selectedRoad, setSelectedRoad] = useState<string>('Semua');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30'); // days

  // Unique roads
  const roadOptions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => set.add(r.roadName));
    return ['Semua', ...Array.from(set)];
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedRoad !== 'Semua' && r.roadName !== selectedRoad) return false;
      return true;
    });
  }, [reports, selectedRoad]);

  // Calculations
  const stats = useMemo(() => {
    let totalVol = 0;
    let totalTonnage = 0;
    let count0 = 0;
    let count50 = 0;
    let count100 = 0;
    let approvedPpk = 0;
    let waitingReview = 0;

    filteredReports.forEach((r) => {
      totalVol += r.volumeM3;
      totalTonnage += r.tonnageTon;
      if (r.progressPercent === 0) count0++;
      else if (r.progressPercent === 50) count50++;
      else if (r.progressPercent === 100) count100++;

      if (r.status === 'Disetujui PPK') approvedPpk++;
      if (r.status === 'Menunggu Verifikasi Pengawas' || r.status === 'Diverifikasi Pengawas') waitingReview++;
    });

    const totalPoints = filteredReports.length;
    const overallProgress = totalPoints > 0
      ? Math.round(((count50 * 0.5 + count100 * 1.0) / totalPoints) * 100)
      : 0;

    return {
      totalVol: parseFloat(totalVol.toFixed(2)),
      totalTonnage: parseFloat(totalTonnage.toFixed(2)),
      count0,
      count50,
      count100,
      approvedPpk,
      waitingReview,
      totalPoints,
      overallProgress,
    };
  }, [filteredReports]);

  // Grouping by road for progress cards
  const roadProgressSummaries = useMemo(() => {
    const map = new Map<string, {
      roadName: string;
      totalPoints: number;
      completed: number;
      inProgress: number;
      pending: number;
      volume: number;
    }>();

    reports.forEach((r) => {
      if (!map.has(r.roadName)) {
        map.set(r.roadName, {
          roadName: r.roadName,
          totalPoints: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          volume: 0,
        });
      }
      const item = map.get(r.roadName)!;
      item.totalPoints += 1;
      item.volume += r.volumeM3;
      if (r.progressPercent === 100) item.completed += 1;
      else if (r.progressPercent === 50) item.inProgress += 1;
      else item.pending += 1;
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      percentage: item.totalPoints > 0 ? Math.round((item.completed / item.totalPoints) * 100) : 0,
      volume: parseFloat(item.volume.toFixed(2)),
    }));
  }, [reports]);

  // Total equipment operating hours
  const totalEquipmentHours = useMemo(() => {
    return equipmentLogs.reduce((acc, curr) => acc + curr.totalHours, 0);
  }, [equipmentLogs]);

  return (
    <div className="space-y-6">
      {/* Top Filter and Role Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Dashboard Monitoring Preservasi Jalan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Ringkasan status lapangan, rekap volume pekerjaan, dan peta segmen station harian Kab. Sarolangun.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filter Ruas:</span>
            <select
              value={selectedRoad}
              onChange={(e) => setSelectedRoad(e.target.value)}
              className="bg-slate-50 text-slate-900 rounded-lg px-2.5 py-1.5 border border-slate-300 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
            >
              {roadOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {currentUser.role === 'pelaksana' && (
            <button
              onClick={() => onNavigateToTab('patching')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-[#0f2347] font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <HardHat className="w-3.5 h-3.5" />
              + Input Patching Hari Ini
            </button>
          )}

          {currentUser.role === 'ppk' && (
            <button
              onClick={() => onNavigateToTab('patching')}
              className="px-3.5 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#2563eb] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
              Verifikasi &amp; Approval ({stats.waitingReview})
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Completion */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[#1e3a8a] text-xs font-bold uppercase tracking-wider">
            <span>RATA-RATA PROGRES FISIK</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0f2347]">{stats.overallProgress}%</span>
            <span className="text-xs text-slate-500">dari {stats.totalPoints} titik</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(stats.count100 / Math.max(1, stats.totalPoints)) * 100}%` }}
              title="100% Selesai"
            />
            <div
              className="bg-amber-400 h-full transition-all duration-500"
              style={{ width: `${(stats.count50 / Math.max(1, stats.totalPoints)) * 100}%` }}
              title="50% Progres"
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${(stats.count0 / Math.max(1, stats.totalPoints)) * 100}%` }}
              title="0% Belum Dikerjakan"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-mono font-medium">
            <span className="text-emerald-700">● 100%: {stats.count100}</span>
            <span className="text-amber-700">● 50%: {stats.count50}</span>
            <span className="text-rose-700">● 0%: {stats.count0}</span>
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-[#1e3a8a] text-xs font-bold uppercase tracking-wider">
            <span>TOTAL VOLUME ASPAL</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">{stats.totalVol}</span>
            <span className="text-xs text-slate-600 font-bold">m³</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Estimasi Tonase:{' '}
            <span className="text-[#0f2347] font-mono font-bold">{stats.totalTonnage} Ton</span>
          </div>
        </div>

        {/* Equipment Hours */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-[#1e3a8a] text-xs font-bold uppercase tracking-wider">
            <span>JAM OPERASIONAL ALAT</span>
            <Truck className="w-4 h-4 text-[#1e3a8a]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1e3a8a]">{totalEquipmentHours}</span>
            <span className="text-xs text-slate-600 font-bold">Jam Kerja</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Terdata dari {equipmentLogs.length} sesi operasional
          </div>
        </div>

        {/* Approval PPK */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-[#1e3a8a] text-xs font-bold uppercase tracking-wider">
            <span>STATUS VALIDASI PPK</span>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0f2347]">{stats.approvedPpk}</span>
            <span className="text-xs text-slate-500">/ {stats.totalPoints} titik disahkan</span>
          </div>
          <div className="mt-2 text-xs text-amber-700 font-semibold">
            {stats.waitingReview} menunggu review/approval
          </div>
        </div>
      </div>

      {/* Visual Station Linear Strip Map (Peta Status Station) */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0f2347] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              Peta Status Linear per Station (Strip Map Konstruksi)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Visualisasi kondisi fisik penanganan per segmen STA (0% Belum / 50% Progres / 100% Selesai).
            </p>
          </div>

          {/* Color Indicator Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block shadow-sm" />
              <span className="text-slate-700 font-sans">0% (Galian)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block shadow-sm" />
              <span className="text-slate-700 font-sans">50% (Hampar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block shadow-sm" />
              <span className="text-slate-700 font-sans">100% (Selesai)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#1e3a8a] inline-block shadow-sm" />
              <span className="text-slate-700 font-sans">Disetujui PPK</span>
            </div>
          </div>
        </div>

        {/* Road Segments Strip Map */}
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isApproved = report.status === 'Disetujui PPK';
            const progressColor =
              isApproved
                ? 'bg-[#1e3a8a] text-white border-blue-700'
                : report.progressPercent === 100
                ? 'bg-emerald-600 text-white border-emerald-500'
                : report.progressPercent === 50
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-extrabold'
                : 'bg-rose-500 text-white border-rose-400';

            return (
              <div
                key={report.id}
                onClick={() => onOpenReport(report)}
                className="group p-3.5 rounded-lg bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
              >
                {/* Road and Station Info */}
                <div className="space-y-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2347]">{report.roadName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-mono font-semibold">
                      Sisi: {report.side}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-[#1e3a8a]">
                      STA {report.staStart} s/d STA {report.staEnd}
                    </span>
                    <span className="text-xs text-slate-500">({report.lengthM} m × {report.widthM} m)</span>
                  </div>
                </div>

                {/* Linear Strip Visual Bar */}
                <div className="flex-1 max-w-md mx-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1 font-mono">
                    <span className="font-semibold text-slate-700">STA {report.staStart}</span>
                    <span className="font-bold text-[#0f2347]">Vol: {report.volumeM3} m³ ({report.tonnageTon} Ton)</span>
                    <span className="font-semibold text-slate-700">STA {report.staEnd}</span>
                  </div>
                  <div className="h-6 w-full bg-slate-200 rounded-md border border-slate-300 relative overflow-hidden flex items-center shadow-inner">
                    <div
                      className={`h-full transition-all duration-300 flex items-center justify-center font-bold text-[11px] tracking-wider ${progressColor}`}
                      style={{ width: `${Math.max(25, report.progressPercent)}%` }}
                    >
                      {report.progressPercent}%
                    </div>
                  </div>
                </div>

                {/* Status Badges & Quick Action */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800">{report.status}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{report.photos.length} Foto Dokumentasi</div>
                  </div>
                  <button className="p-2 rounded-lg bg-white group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-500 border border-slate-200 transition shadow-xs">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Road Summary + Material Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rekap per Ruas Jalan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Rekap Progres per Ruas Jalan
            </h3>
            <button
              onClick={() => onNavigateToTab('patching')}
              className="text-xs text-[#1e3a8a] hover:text-[#2563eb] font-bold"
            >
              Lihat Detail →
            </button>
          </div>

          <div className="space-y-3">
            {roadProgressSummaries.map((r, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-[#0f2347] mb-1">
                  <span>{r.roadName}</span>
                  <span className="text-amber-600 font-mono text-sm">{r.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${r.percentage}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-mono">
                  <span>Total Titik: <strong className="text-slate-800">{r.totalPoints}</strong></span>
                  <span>Selesai: <strong className="text-emerald-700">{r.completed}</strong> | Progres: <strong className="text-amber-700">{r.inProgress}</strong></span>
                  <span>Vol: <strong className="text-[#0f2347]">{r.volume} m³</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saldo Stok Material Terkini */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1e3a8a]" />
              Status Stok Material Lapangan (Real-Time)
            </h3>
            <button
              onClick={() => onNavigateToTab('material')}
              className="text-xs text-[#1e3a8a] hover:text-[#2563eb] font-bold"
            >
              Kelola Material →
            </button>
          </div>

          <div className="space-y-3">
            {stocks.map((item, idx) => {
              const isLow = item.currentStock <= 5;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0f2347]">{item.materialName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Masuk: {item.totalMasuk} | Pakai: {item.totalPakai} {item.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-base font-black font-mono ${
                        isLow ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {item.currentStock} {item.unit}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {isLow ? '⚠️ Stok Menipis' : '✓ Stok Cukup'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
