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

interface ReportRow {
  _id: string
  title?: string
  type?: string
  status?: string
}

interface ReportFormData {
  title: string
  type?: string
  status?: string
}

interface ReportsResponse {
  data: ReportRow[]
  pagination?: PaginationInfo
}

const DEFAULT_PAGE_SIZE = 10

export const ReportsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<ReportRow>>(null)

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<ReportsResponse> = useQuery({
    queryKey: ['reports', page, limit, search],
    queryFn: () =>
      api.listWithPagination<ReportRow>('reports', { page, limit, search }),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (formData: ReportFormData) =>
      api.create<ReportRow>('reports', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setAddDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<ReportFormData> }) =>
      api.update<ReportRow>('reports', params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setEditDialogOpen(false)
      setSelectedReport(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('reports', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setDeleteDialogOpen(false)
      setSelectedReport(null)
    },
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination

  const fullRowData = useMemo(() => {
    if (!pagination) return rows

    const totalRows = pagination.total
    const fullData: (ReportRow & { _isPlaceholder?: boolean })[] = []

    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        fullData.push({
          _id: `placeholder-${i}`,
          title: '',
          type: '',
          status: '',
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

  const columnDefs: ColDef<ReportRow & { _isPlaceholder?: boolean }>[] =
    useMemo(
      () => [
        {
          field: 'title',
          headerName: 'Title',
          flex: 1,
          cellRenderer: (
            params: {
              data?: (ReportRow & { _isPlaceholder?: boolean }) | undefined
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <span className="text-sm font-medium text-gray-900">
                {params.data.title}
              </span>
            )
          },
        },
        {
          field: 'type',
          headerName: 'Type',
          flex: 0.8,
          cellRenderer: (
            params: {
              data?: (ReportRow & { _isPlaceholder?: boolean }) | undefined
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <span className="text-sm text-gray-700">
                {params.data.type}
              </span>
            )
          },
        },
        {
          field: 'status',
          headerName: 'Status',
          flex: 0.8,
          cellRenderer: (
            params: {
              data?: (ReportRow & { _isPlaceholder?: boolean }) | undefined
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <span className="text-sm text-gray-700">
                {params.data.status}
              </span>
            )
          },
        },
        {
          headerName: 'Actions',
          flex: 1,
          cellRenderer: (
            params: {
              data?: (ReportRow & { _isPlaceholder?: boolean }) | undefined
            },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <div className="flex h-full items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(params.data!)
                    setEditDialogOpen(true)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(params.data!)
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

  const gridOptions: GridOptions<ReportRow & { _isPlaceholder?: boolean }> =
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
          event: PaginationChangedEvent<ReportRow & { _isPlaceholder?: boolean }>,
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
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            Review and track all operational reports
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Report
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<ReportRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No reports found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading reports...
            </div>
          )}
        />
      </div>

      {/* Add Report Dialog */}
      <AddReportDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit Report Dialog */}
      {selectedReport && (
        <EditReportDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          report={selectedReport}
          onSubmit={(data) =>
            updateMutation.mutate({ id: selectedReport._id, data })
          }
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Report Dialog */}
      {selectedReport && (
        <DeleteReportDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          report={selectedReport}
          onConfirm={() => deleteMutation.mutate(selectedReport._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

// Add Report Dialog
function AddReportDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReportFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<ReportFormData>({
    title: '',
    type: '',
    status: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>(
    {},
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof ReportFormData, string>> = {}

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
      setFormData({ title: '', type: '', status: '' })
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
              Add New Report
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Create a new operational report.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="add-report-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="add-report-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`opsdash-input ${errors.title ? 'border-red-300' : ''}`}
                    placeholder="Incident summary, daily report, etc."
                    disabled={isLoading}
                  />
                  {errors.title && (
                    <p className="opsdash-error">{errors.title}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-report-type" className="opsdash-label">
                    Type
                  </label>
                  <input
                    id="add-report-type"
                    type="text"
                    value={formData.type ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="opsdash-input"
                    placeholder="Daily, weekly, incident, etc."
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-report-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="add-report-status"
                    type="text"
                    value={formData.status ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="opsdash-input"
                    placeholder="Open, closed, draft..."
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
                {isLoading ? 'Creating...' : 'Create Report'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Edit Report Dialog
function EditReportDialog({
  open,
  onOpenChange,
  report,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportRow
  onSubmit: (data: Partial<ReportFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<ReportFormData>>({
    title: report.title ?? '',
    type: report.type ?? '',
    status: report.status ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>(
    {},
  )

  useEffect(() => {
    setFormData({
      title: report.title ?? '',
      type: report.type ?? '',
      status: report.status ?? '',
    })
    setErrors({})
  }, [report])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof ReportFormData, string>> = {}

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
              Edit Report
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update report information.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="edit-report-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="edit-report-title"
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
                  <label htmlFor="edit-report-type" className="opsdash-label">
                    Type
                  </label>
                  <input
                    id="edit-report-type"
                    type="text"
                    value={formData.type ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-report-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="edit-report-status"
                    type="text"
                    value={formData.status ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
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
                {isLoading ? 'Updating...' : 'Update Report'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Delete Report Dialog
function DeleteReportDialog({
  open,
  onOpenChange,
  report,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportRow
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
              Delete Report
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete{' '}
              <strong>{report.title ?? 'this report'}</strong>? This action cannot be
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
              {isLoading ? 'Deleting...' : 'Delete Report'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

