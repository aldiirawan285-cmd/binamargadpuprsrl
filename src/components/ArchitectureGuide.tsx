import React, { useState } from 'react';
import {
  Globe,
  Server,
  Database,
  Shield,
  Copy,
  Check,
  Cpu,
  Layers,
  HardDrive,
  Network,
  Terminal,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const nginxConfig = `server {
    listen 80;
    server_name binamarga-sarolangun.go.id www.binamarga-sarolangun.go.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name binamarga-sarolangun.go.id www.binamarga-sarolangun.go.id;

    ssl_certificate /etc/letsencrypt/live/binamarga-sarolangun.go.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/binamarga-sarolangun.go.id/privkey.pem;

    client_max_body_size 50M; # Mendukung upload foto dokumentasi lapangan banyak

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  const pm2Command = `# 1. Instalasi Node.js & PM2 di VPS Ubuntu
sudo apt update && sudo apt install -y nodejs npm nginx
sudo npm install -g pm2

# 2. Jalankan server aplikasi agar terus aktif 24 jam di background
cd /var/www/binamarga-sarolangun
npm run build
pm2 start server.ts --name "binamarga-sarolangun" --interpreter tsx
pm2 save
pm2 startup`;

  const backupCron = `# Skrip Backup Database Otomatis Harian (crontab -e)
0 2 * * * cp /var/www/binamarga-sarolangun/data/database.json /backup/db_$(date +\\%Y\\%m\\%d).json`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-[#0f2347] flex items-center gap-2">
          <Globe className="w-5 h-5 text-amber-500" />
          Panduan Arsitektur &amp; Alur Deployment Multi-User
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
          Penjelasan teknis infrastruktur agar sistem Bidang Bina Marga DPUPR Kab. Sarolangun dapat diakses secara bersamaan oleh tim lapangan (Pelaksana, Pengawas, PPK, Admin) dari HP/laptop manapun di internet.
        </p>
      </div>

      {/* 3 Main Infrastructure Components */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Component 1: Domain */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#1e3a8a] flex items-center justify-center border border-blue-200">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-[#0f2347]">1. Domain (Alamat Web)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Alamat yang diketik oleh pekerja di browser HP (contoh: <code className="text-[#1e3a8a] font-mono font-bold">binamarga-sarolangun.go.id</code>).
            Domain diarahkan via <strong>DNS A Record</strong> ke alamat IP publik VPS server.
          </p>
          <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
            A Record: @ → [IP VPS Kamu]<br />
            CNAME: www → binamarga-sarolangun.go.id
          </div>
        </div>

        {/* Component 2: VPS Server */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-[#0f2347]">2. Hosting / VPS (Tempat Hidup)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Disarankan menggunakan <strong>VPS (Virtual Private Server)</strong> (e.g. Ubuntu 22.04 / 24.04 di DigitalOcean, AWS, GCP, IDCloudHost).
            Lebih tangguh menangani upload foto resolusi tinggi dari banyak pelaksana sekaligus.
          </p>
          <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
            Spek Rekomendasi: 2 vCPU, 4GB RAM, 50GB NVMe SSD (skala 50+ paket jalan)
          </div>
        </div>

        {/* Component 3: Database */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-[#0f2347]">3. Database Terpusat (Single Source)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Semua input laporan, foto, dan transaksi material masuk ke <strong>satu database pusat</strong> di server.
            Sehingga saat pelaksana input di lapangan, PPK di kantor dinas langsung melihat data real-time detik itu juga.
          </p>
          <div className="text-[11px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
            Penyimpanan: File Storage / PostgreSQL / SQLite dengan Auto-Audit
          </div>
        </div>
      </div>

      {/* Visual Workflow Diagram */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
          <Network className="w-4 h-4 text-amber-500" />
          Alur Akses Multi-User Lapangan &amp; Kantor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
            <div className="text-amber-700 font-bold">1. Tim Lapangan (HP)</div>
            <p className="text-[11px] text-slate-600">
              Pelaksana &amp; Pengawas buka URL di browser HP → Ambil foto kondisi 0%, 50%, 100% → Kirim laporan harian.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
            <div className="text-[#1e3a8a] font-bold">2. Enkripsi SSL (HTTPS)</div>
            <p className="text-[11px] text-slate-600">
              Data terenkripsi aman saat dikirim lewat jaringan seluler 4G/5G menggunakan sertifikat SSL Let's Encrypt gratis.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
            <div className="text-emerald-700 font-bold">3. Server VPS &amp; Database</div>
            <p className="text-[11px] text-slate-600">
              Server memvalidasi role (RBAC), menghitung volume otomatis, membubuhkan watermark, dan mencatat audit log.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2">
            <div className="text-purple-700 font-bold">4. PPK &amp; Manajemen</div>
            <p className="text-[11px] text-slate-600">
              PPK membuka dashboard dari laptop kantor → memvalidasi opname volume → unduh rekap Excel dan ZIP dokumentasi.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Snippets */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-[#0f2347] flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-600" />
          Konfigurasi Siap Pakai di Server VPS (Production Setup)
        </h3>

        {/* Nginx */}
        <div className="bg-[#0f2347] rounded-xl border border-[#1e3a8a] overflow-hidden shadow-sm">
          <div className="p-3 bg-[#0a192f] border-b border-[#1e3a8a] flex items-center justify-between text-xs">
            <span className="font-mono text-amber-200">/etc/nginx/sites-available/binamarga-sarolangun</span>
            <button
              onClick={() => copyToClipboard(nginxConfig, 'nginx')}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono text-[11px] font-bold"
            >
              {copiedCode === 'nginx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode === 'nginx' ? 'Tersalin' : 'Salin Konfig'}
            </button>
          </div>
          <pre className="p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
            {nginxConfig}
          </pre>
        </div>

        {/* PM2 & Cron */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0f2347] rounded-xl border border-[#1e3a8a] overflow-hidden shadow-sm">
            <div className="p-3 bg-[#0a192f] border-b border-[#1e3a8a] flex items-center justify-between text-xs">
              <span className="font-mono text-amber-200">PM2 Process Manager (24 Jam Aktif)</span>
              <button
                onClick={() => copyToClipboard(pm2Command, 'pm2')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono text-[11px] font-bold"
              >
                {copiedCode === 'pm2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode === 'pm2' ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <pre className="p-3.5 text-[11px] font-mono text-sky-300 overflow-x-auto leading-relaxed">
              {pm2Command}
            </pre>
          </div>

          <div className="bg-[#0f2347] rounded-xl border border-[#1e3a8a] overflow-hidden shadow-sm">
            <div className="p-3 bg-[#0a192f] border-b border-[#1e3a8a] flex items-center justify-between text-xs">
              <span className="font-mono text-amber-200">Otomatisasi Backup Harian (Cron Job)</span>
              <button
                onClick={() => copyToClipboard(backupCron, 'cron')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono text-[11px] font-bold"
              >
                {copiedCode === 'cron' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode === 'cron' ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <pre className="p-3.5 text-[11px] font-mono text-amber-300 overflow-x-auto leading-relaxed">
              {backupCron}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
