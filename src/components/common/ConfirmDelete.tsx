import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ConfirmDelete({
  open, onOpenChange, title = 'Hapus data?', description, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title?: string
  description?: React.ReactNode
  onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? 'Data yang dihapus tidak dapat dikembalikan.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                onOpenChange(false)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" />} Ya, hapus
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
