import * as React from 'react'

type DialogFooterProps = {
  /** Action buttons / footer content */
  children: React.ReactNode
  /** Extra classes to tweak alignment, spacing, etc. */
  className?: string
  /**
   * When true, keeps the footer visible at the bottom of a scrollable dialog/drawer.
   * Works best when the dialog content uses `overflow: auto` (like our drawer variant).
   */
  sticky?: boolean
}

export function DialogFooter({ children, className, sticky = true }: DialogFooterProps) {
  const base =
    'flex items-center justify-end gap-2 border-t border-gray-200 pt-3'

  // Our drawer content has `padding: 16px` (Tailwind `p-4`), so we use -mx-4/px-4 to make
  // the border/background span full width while keeping content aligned with the form fields.
  const stickyClasses =
    'sticky bottom-0 -mx-4 mt-3 bg-white px-4 pb-2 backdrop-blur supports-[backdrop-filter]:bg-white/90'
  const nonStickyClasses = 'mt-6'

  const finalClassName = [base, sticky ? stickyClasses : nonStickyClasses, className]
    .filter(Boolean)
    .join(' ')

  return <div className={finalClassName}>{children}</div>
}

