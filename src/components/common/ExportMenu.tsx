import { FileDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ExportMenu({
  onCSV, onPDF, busy, disabled, extra,
}: {
  onCSV: () => void
  onPDF: () => void
  busy?: boolean
  disabled?: boolean
  extra?: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <FileDown />} Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onCSV}>
          <FileSpreadsheet /> Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPDF}>
          <FileText /> Export PDF
        </DropdownMenuItem>
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
