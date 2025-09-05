import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-[linear-gradient(110deg,#ececec,45%,#f5f5f5,55%,#ececec)] dark:bg-[linear-gradient(110deg,#1f2937,45%,#374151,55%,#1f2937)] bg-[length:200%_100%] rounded',
        className
      )}
    />
  )
}

export default Skeleton
