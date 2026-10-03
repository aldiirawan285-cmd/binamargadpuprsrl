import { AlertTriangle, CheckCircle2, Clock, Loader, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SifatBadge({ v }: { v: string }) {
  if (v === 'Segera') return <Badge variant="danger"><Zap className="h-3 w-3" /> Segera</Badge>
  if (v === 'Penting') return <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Penting</Badge>
  return <Badge variant="outline">Biasa</Badge>
}

export function StatusBadge({ v }: { v: string }) {
  if (v === 'Selesai') return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Selesai</Badge>
  if (v === 'Proses') return <Badge variant="warning"><Loader className="h-3 w-3" /> Proses</Badge>
  return <Badge variant="danger"><Clock className="h-3 w-3" /> Belum</Badge>
}
