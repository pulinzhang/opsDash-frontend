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

interface HandoverLogRow {
  _id: string
  title?: string
  fromShift?: string
  toShift?: string
}

interface HandoverLogFormData {
  title: string
  fromShift?: string
  toShift?: string
}

interface HandoverLogsResponse {
  data: HandoverLogRow[]
  pagination?: PaginationInfo
}

const DEFAULT_PAGE_SIZE = 10

export const HandoverLogsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<HandoverLogRow>>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<HandoverLogRow | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<HandoverLogsResponse> = useQuery({
    queryKey: ['handover-logs', page, limit, search],
    queryFn: () =>
      api.listWithPagination<HandoverLogRow>('handover-logs', { page, limit, search }),
  })

  const createMutation = useMutation({
    mutationFn: (formData: HandoverLogFormData) =>
      api.create<HandoverLogRow>('handover-logs', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-logs'] })
      setAddDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<HandoverLogFormData> }) =>
      api.update<HandoverLogRow>('handover-logs', params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-logs'] })
      setEditDialogOpen(false)
      setSelectedLog(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('handover-logs', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handover-logs'] })
      setDeleteDialogOpen(false)
      setSelectedLog(null)
    },
  })

  const apiRows = data?.data ?? []
  const pagination = data?.pagination

  const rows: HandoverLogRow[] = useMemo(
    () =>
      apiRows.map((raw: any) => ({
        ...raw,
        title:
          raw.title ??
          raw.summary ??
          raw.name ??
          (raw.shift?.title as string | undefined) ??
          '',
        fromShift:
          raw.fromShift ??
          (raw.fromUser?.name as string | undefined) ??
          (raw.fromUserName as string | undefined) ??
          '',
        toShift:
          raw.toShift ??
          (raw.toUser?.name as string | undefined) ??
          (raw.toUserName as string | undefined) ??
          '',
      })),
    [apiRows],
  )

  const fullRowData = useMemo(() => {
    if (!pagination) return rows

    const totalRows = pagination.total
    const fullData: (HandoverLogRow & { _isPlaceholder?: boolean })[] = []

    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        fullData.push({
          _id: `placeholder-${i}`,
          title: '',
          fromShift: '',
          toShift: '',
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

  const columnDefs: ColDef<HandoverLogRow & { _isPlaceholder?: boolean }>[] =
    useMemo(
      () => [
        {
          field: 'title',
          headerName: 'Title',
          flex: 1,
          cellRenderer: (
            params: {
              data?: (HandoverLogRow & { _isPlaceholder?: boolean }) | null
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''

            const anyData = params.data as any
            const titleValue: string =
              params.data.title ??
              anyData.summary ??
              anyData.name ??
              (anyData.shift?.title as string | undefined) ??
              ''

            if (!titleValue) return ''

            return (
              <span className="text-sm font-medium text-gray-900">
                {titleValue}
              </span>
            )
          },
        },
        {
          field: 'fromShift',
          headerName: 'From Shift',
          flex: 0.8,
          cellRenderer: (
            params: {
              data?: (HandoverLogRow & { _isPlaceholder?: boolean }) | null
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''

            const anyData = params.data as any
            const fromValue: string =
              params.data.fromShift ??
              (anyData.fromUser?.name as string | undefined) ??
              (anyData.fromUserName as string | undefined) ??
              ''

            if (!fromValue) return ''

            return (
              <span className="text-sm text-gray-700">
                {fromValue}
              </span>
            )
          },
        },
        {
          field: 'toShift',
          headerName: 'To Shift',
          flex: 0.8,
          cellRenderer: (
            params: {
              data?: (HandoverLogRow & { _isPlaceholder?: boolean }) | null
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''

            const anyData = params.data as any
            const toValue: string =
              params.data.toShift ??
              (anyData.toUser?.name as string | undefined) ??
              (anyData.toUserName as string | undefined) ??
              ''

            if (!toValue) return ''

            return (
              <span className="text-sm text-gray-700">
                {toValue}
              </span>
            )
          },
        },
        {
          headerName: 'Actions',
          flex: 1,
          cellRenderer: (
            params: {
              data?: (HandoverLogRow & { _isPlaceholder?: boolean }) | null
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

  const gridOptions: GridOptions<
    HandoverLogRow & { _isPlaceholder?: boolean }
  > = useMemo(
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
        event: PaginationChangedEvent<
          HandoverLogRow & { _isPlaceholder?: boolean }
        >,
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
          <h1 className="text-2xl font-bold text-gray-900">Handover Logs</h1>
          <p className="text-sm text-gray-500">
            Track shift handovers between teams
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Handover Log
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search handover logs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<HandoverLogRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No handover logs found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading handover logs...
            </div>
          )}
        />
      </div>

      <AddHandoverLogDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {selectedLog && (
        <EditHandoverLogDialog
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
        <DeleteHandoverLogDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          log={selectedLog}
          onConfirm={() => deleteMutation.mutate(selectedLog._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function AddHandoverLogDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: HandoverLogFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<HandoverLogFormData>({
    title: '',
    fromShift: '',
    toShift: '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof HandoverLogFormData, string>>
  >({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof HandoverLogFormData, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
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
      setFormData({ title: '', fromShift: '', toShift: '' })
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
              Add New Handover Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Create a new shift handover record.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="add-handover-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="add-handover-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`opsdash-input ${errors.title ? 'border-red-300' : ''}`}
                    placeholder="Shift A to Shift B, nightly handover..."
                    disabled={isLoading}
                  />
                  {errors.title && (
                    <p className="opsdash-error">{errors.title}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-handover-from" className="opsdash-label">
                    From Shift
                  </label>
                  <input
                    id="add-handover-from"
                    type="text"
                    value={formData.fromShift ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fromShift: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-handover-to" className="opsdash-label">
                    To Shift
                  </label>
                  <input
                    id="add-handover-to"
                    type="text"
                    value={formData.toShift ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, toShift: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
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
                {isLoading ? 'Creating...' : 'Create Handover Log'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditHandoverLogDialog({
  open,
  onOpenChange,
  log,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: HandoverLogRow
  onSubmit: (data: Partial<HandoverLogFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<HandoverLogFormData>>({
    title: log.title ?? '',
    fromShift: log.fromShift ?? '',
    toShift: log.toShift ?? '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof HandoverLogFormData, string>>
  >({})

  useEffect(() => {
    setFormData({
      title: log.title ?? '',
      fromShift: log.fromShift ?? '',
      toShift: log.toShift ?? '',
    })
    setErrors({})
  }, [log])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof HandoverLogFormData, string>> = {}

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
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
              Edit Handover Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update handover log information.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="edit-handover-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="edit-handover-title"
                    type="text"
                    value={formData.title ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`opsdash-input ${errors.title ? 'border-red-300' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.title && (
                    <p className="opsdash-error">{errors.title}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-handover-from" className="opsdash-label">
                    From Shift
                  </label>
                  <input
                    id="edit-handover-from"
                    type="text"
                    value={formData.fromShift ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fromShift: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-handover-to" className="opsdash-label">
                    To Shift
                  </label>
                  <input
                    id="edit-handover-to"
                    type="text"
                    value={formData.toShift ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, toShift: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
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
                {isLoading ? 'Updating...' : 'Update Handover Log'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteHandoverLogDialog({
  open,
  onOpenChange,
  log,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: HandoverLogRow
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
              Delete Handover Log
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete{' '}
              <strong>{log.title ?? 'this handover log'}</strong>? This action
              cannot be undone.
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
              {isLoading ? 'Deleting...' : 'Delete Handover Log'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

