import { useEffect, useMemo, useRef, useState } from 'react'
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type {
  AgGridReact as AgGridReactType,
} from 'ag-grid-react'
import type {
  ColDef,
  GridOptions,
  PaginationChangedEvent,
} from 'ag-grid-community'
import * as Dialog from '@radix-ui/react-dialog'
import { api, type PaginationInfo } from '../services/api'
import { DialogFooter } from '../components/DialogFooter'
import { toast } from 'react-toastify'

interface LogRow {
  _id: string
  level?: string
  message?: string
}

interface LogFormData {
  level: string
  message: string
}

interface LogsResponse {
  data: LogRow[]
  pagination?: PaginationInfo
}

const DEFAULT_PAGE_SIZE = 10

export const LogsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<LogRow>>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogRow | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<LogsResponse> = useQuery({
    queryKey: ['logs', page, limit, search],
    queryFn: () =>
      api.listWithPagination<LogRow>('logs', { page, limit, search }),
  })

  const createMutation = useMutation({
    mutationFn: (formData: LogFormData) =>
      api.create<LogRow>('logs', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setAddDialogOpen(false)
      toast.success('Log created successfully')
    },
    onError: (error: unknown) => {
      const err = error as Error
      toast.error(err.message || 'Failed to create log')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<LogFormData> }) =>
      api.update<LogRow>('logs', params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setEditDialogOpen(false)
      setSelectedLog(null)
      toast.success('Log updated successfully')
    },
    onError: (error: unknown) => {
      const err = error as Error
      toast.error(err.message || 'Failed to update log')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('logs', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setDeleteDialogOpen(false)
      setSelectedLog(null)
      toast.success('Log deleted successfully')
    },
    onError: (error: unknown) => {
      const err = error as Error
      toast.error(err.message || 'Failed to delete log')
    },
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination

  const fullRowData = useMemo(() => {
    if (!pagination) return rows

    const totalRows = pagination.total
    const fullData: (LogRow & { _isPlaceholder?: boolean })[] = []

    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        fullData.push({
          _id: `placeholder-${i}`,
          level: '',
          message: '',
          _isPlaceholder: true,
        })
      }
    }

    return fullData
  }, [rows, pagination, limit])

  const pageRef = useRef(page)
  const limitRef = useRef(limit)
  const paginationRef = useRef(pagination)
  const isSyncingPageRef = useRef(false)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  useEffect(() => {
    limitRef.current = limit
  }, [limit])

  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  useEffect(() => {
    if (!gridRef.current || !pagination) return

    const api = gridRef.current.api
    if (!api) return

    const currentPage = api.paginationGetCurrentPage()
    const expectedPage = page - 1
    if (currentPage !== expectedPage) {
      isSyncingPageRef.current = true
      api.paginationGoToPage(expectedPage)
      setTimeout(() => {
        isSyncingPageRef.current = false
      }, 0)
    }
  }, [pagination, page])

  const columnDefs: ColDef<LogRow & { _isPlaceholder?: boolean }>[] = useMemo(
    () => [
      {
        field: 'level',
        headerName: 'Level',
        flex: 0.6,
        cellRenderer: (
          params: {
            data?: (LogRow & { _isPlaceholder?: boolean }) | undefined
          },
        ) => {
          if (!params.data || params.data._isPlaceholder) return ''

          const anyData = params.data as any
          const levelValue: string =
            params.data.level ??
            anyData.severity ??
            anyData.levelName ??
            anyData.logLevel ??
            ''

          if (!levelValue) return ''

          return (
            <span className="text-xs font-semibold uppercase text-gray-700">
              {levelValue}
            </span>
          )
        },
      },
      {
        field: 'message',
        headerName: 'Message',
        flex: 2,
        cellRenderer: (
          params: {
            data?: (LogRow & { _isPlaceholder?: boolean }) | undefined
          },
        ) => {
          if (!params.data || params.data._isPlaceholder) return ''

          const anyData = params.data as any
          const primaryMessage: string =
            params.data.message ??
            anyData.msg ??
            anyData.text ??
            anyData.description ??
            anyData.logMessage ??
            ''

          const messageValue =
            primaryMessage ||
            (() => {
              try {
                const json = JSON.stringify(params.data)
                return json.length > 200 ? `${json.slice(0, 200)}…` : json
              } catch {
                return ''
              }
            })()

          if (!messageValue) return ''

          return (
            <span className="text-sm text-gray-700">
              {messageValue}
            </span>
          )
        },
      },
      {
        headerName: 'Actions',
        flex: 1,
        cellRenderer: (
          params: {
            data?: (LogRow & { _isPlaceholder?: boolean }) | undefined
          },
        ) => {
          if (!params.data || params.data._isPlaceholder) return ''
          return (
            <div className="flex h-full items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedLog(params.data!)
                  setEditDialogOpen(true)
                }}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLog(params.data!)
                  setDeleteDialogOpen(true)
                }}
                className="text-sm text-red-600 hover:text-red-700 hover:underline"
              >
                Delete
              </button>
            </div>
          )
        },
      },
    ],
    [],
  )

  const gridOptions: GridOptions<LogRow & { _isPlaceholder?: boolean }> =
    useMemo(
      () => ({
        theme: 'legacy',
        pagination: true,
        paginationPageSize: limit,
        paginationPageSizeSelector: [10, 20, 50, 100],
        suppressCellFocus: true,
        rowHeight: 60,
        headerHeight: 48,
        suppressPaginationPanel: false,
        getRowStyle: (params) => {
          if (params.data?._isPlaceholder) {
            return { display: 'none', height: 0 }
          }
          return undefined
        },
        onPaginationChanged: (
          event: PaginationChangedEvent<LogRow & { _isPlaceholder?: boolean }>,
        ) => {
          if (isSyncingPageRef.current) return

          if (!event.api.getDisplayedRowCount()) return

          const newPageSize = event.api.paginationGetPageSize()
          const currentLimit = limitRef.current
          if (newPageSize !== currentLimit) {
            setLimit(newPageSize)
            setPage(1)
            return
          }

          const newPageIndex = event.api.paginationGetCurrentPage()
          const currentPage = pageRef.current
          const currentPagination = paginationRef.current

          if (newPageIndex !== undefined) {
            const newPage = newPageIndex + 1
            if (newPage !== currentPage && newPage >= 1) {
              const maxPages = currentPagination?.totalPages ?? 1
              if (newPage <= maxPages) {
                setPage(newPage)
              }
            }
          }
        },
      }),
      [limit],
    )

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <p className="text-sm text-gray-500">
            Inspect recent system and application logs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Log
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<LogRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No logs found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading logs...
            </div>
          )}
        />
      </div>

      <AddLogDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {selectedLog && (
        <EditLogDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          log={selectedLog}
          onSubmit={(data) =>
            updateMutation.mutate({ id: selectedLog._id, data })
          }
          isLoading={updateMutation.isPending}
        />
      )}

      {selectedLog && (
        <DeleteLogDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={() => deleteMutation.mutate(selectedLog._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function AddLogDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: LogFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<LogFormData>({
    level: '',
    message: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LogFormData, string>>>(
    {},
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof LogFormData, string>> = {}

    if (!formData.level.trim()) {
      newErrors.level = 'Level is required'
    }
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSubmit(formData)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      onOpenChange(true)
    } else if (!isLoading) {
      setFormData({ level: '', message: '' })
      setErrors({})
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="opsdash-dialog-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="opsdash-dialog-content opsdash-dialog-content--drawer-right z-[9999] flex h-full flex-col gap-2 border border-gray-200 bg-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="opsdash-dialog-header">
            <Dialog.Title className="opsdash-dialog-title">
              Add New Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Create a new log entry.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="add-log-level" className="opsdash-label">
                    Level
                  </label>
                  <input
                    id="add-log-level"
                    type="text"
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                    className={`opsdash-input ${errors.level ? 'border-red-300' : ''}`}
                    placeholder="info, warn, error..."
                    disabled={isLoading}
                  />
                  {errors.level && (
                    <p className="opsdash-error">{errors.level}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-log-message" className="opsdash-label">
                    Message
                  </label>
                  <textarea
                    id="add-log-message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className={`opsdash-input min-h-[120px] ${errors.message ? 'border-red-300' : ''}`}
                    placeholder="Describe the log event..."
                    disabled={isLoading}
                  />
                  {errors.message && (
                    <p className="opsdash-error">{errors.message}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter sticky={false} className="-mx-4 mt-3 bg-white px-4 pb-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className="opsdash-btn opsdash-btn-secondary"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isLoading}
                className="opsdash-btn opsdash-btn-primary"
              >
                {isLoading ? 'Creating...' : 'Create Log'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditLogDialog({
  open,
  onOpenChange,
  log,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: LogRow
  onSubmit: (data: Partial<LogFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<LogFormData>>({
    level: log.level ?? '',
    message: log.message ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof LogFormData, string>>>(
    {},
  )

  useEffect(() => {
    setFormData({
      level: log.level ?? '',
      message: log.message ?? '',
    })
    setErrors({})
  }, [log])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof LogFormData, string>> = {}

    if (!formData.level?.trim()) {
      newErrors.level = 'Level is required'
    }
    if (!formData.message?.trim()) {
      newErrors.message = 'Message is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSubmit(formData)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      onOpenChange(true)
    } else if (!isLoading) {
      setErrors({})
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="opsdash-dialog-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="opsdash-dialog-content opsdash-dialog-content--drawer-right z-[9999] flex h-full flex-col gap-2 border border-gray-200 bg-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="opsdash-dialog-header">
            <Dialog.Title className="opsdash-dialog-title">
              Edit Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update log entry.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="edit-log-level" className="opsdash-label">
                    Level
                  </label>
                  <input
                    id="edit-log-level"
                    type="text"
                    value={formData.level ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                    className={`opsdash-input ${errors.level ? 'border-red-300' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.level && (
                    <p className="opsdash-error">{errors.level}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-log-message" className="opsdash-label">
                    Message
                  </label>
                  <textarea
                    id="edit-log-message"
                    value={formData.message ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className={`opsdash-input min-h-[120px] ${errors.message ? 'border-red-300' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.message && (
                    <p className="opsdash-error">{errors.message}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter sticky={false} className="-mx-4 mt-3 bg-white px-4 pb-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isLoading}
                  className="opsdash-btn opsdash-btn-secondary"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isLoading}
                className="opsdash-btn opsdash-btn-primary"
              >
                {isLoading ? 'Updating...' : 'Update Log'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteLogDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isLoading: boolean
}) {
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      onOpenChange(true)
    } else if (!isLoading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="opsdash-dialog-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="opsdash-dialog-content opsdash-dialog-content--drawer-right z-[9999] flex h-full flex-col gap-2 border border-gray-200 bg-white shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="opsdash-dialog-header">
            <Dialog.Title className="opsdash-dialog-title">
              Delete Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete this log entry? This action cannot be
              undone.
            </Dialog.Description>
          </div>

          <div className="flex-1" />
          <DialogFooter>
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isLoading}
                className="opsdash-btn opsdash-btn-secondary"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="opsdash-btn opsdash-btn-danger"
            >
              {isLoading ? 'Deleting...' : 'Delete Log'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
