import type { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
}

export const ResourceTable = <T extends { _id?: string; id?: string }>({
  columns,
  rows,
}: Props<T>) => {
  const getRowId = (row: T) => (row._id as string) ?? (row.id as string)

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key.toString()}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowId(row)}>
            {columns.map((c) => (
              <td key={c.key.toString()}>
                {c.render ? c.render(row) : (row[c.key as keyof T] as ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

