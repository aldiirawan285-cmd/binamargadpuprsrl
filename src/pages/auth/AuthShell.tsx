import type { ReactNode } from 'react'
import { Brand } from '@/components/layout/Brand'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-[#14263f] to-[#234b7a] p-4">
      <Brand className="mb-6 text-white" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
