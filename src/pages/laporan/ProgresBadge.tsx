import { CheckCircle2, CircleDashed, CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ProgresBadge({ value }: { value: number }) {
  if (value >= 100)
    return <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> 100%</Badge>
  if (value >= 50)
    return <Badge variant="warning"><CircleDot className="h-3 w-3" /> 50%</Badge>
  return <Badge variant="outline"><CircleDashed className="h-3 w-3" /> 0%</Badge>
}
