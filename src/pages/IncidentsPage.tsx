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

interface IncidentRow {
  _id: string
  title?: string
  severity?: string
  status?: string
}

interface IncidentFormData {
  title: string
  severity?: string
  status?: string
}

interface IncidentsResponse {
  data: IncidentRow[]
  pagination?: PaginationInfo
}

const DEFAULT_PAGE_SIZE = 10

export const IncidentsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<IncidentRow>>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<IncidentsResponse> = useQuery({
    queryKey: ['incidents', page, limit, search],
    queryFn: () =>
      api.listWithPagination<IncidentRow>('incidents', { page, limit, search }),
  })

  const createMutation = useMutation({
    mutationFn: (formData: IncidentFormData) =>
      api.create<IncidentRow>('incidents', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setAddDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<IncidentFormData> }) =>
      api.update<IncidentRow>('incidents', params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setEditDialogOpen(false)
      setSelectedIncident(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('incidents', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] })
      setDeleteDialogOpen(false)
      setSelectedIncident(null)
    },
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination

  const fullRowData = useMemo(() => {
    if (!pagination) return rows

    const totalRows = pagination.total
    const fullData: (IncidentRow & { _isPlaceholder?: boolean })[] = []

    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        fullData.push({
          _id: `placeholder-${i}`,
          title: '',
          severity: '',
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

  const columnDefs: ColDef<IncidentRow & { _isPlaceholder?: boolean }>[] =
    useMemo(
      () => [
        {
          field: 'title',
          headerName: 'Title',
          flex: 1,
          cellRenderer: (
            params: { data?: IncidentRow & { _isPlaceholder?: boolean } },
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
          field: 'severity',
          headerName: 'Severity',
          flex: 0.8,
          cellRenderer: (
            params: { data?: IncidentRow & { _isPlaceholder?: boolean } },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <span className="text-sm text-gray-700">
                {params.data.severity}
              </span>
            )
          },
        },
        {
          field: 'status',
          headerName: 'Status',
          flex: 0.8,
          cellRenderer: (
            params: { data?: IncidentRow & { _isPlaceholder?: boolean } },
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
            params: { data?: IncidentRow & { _isPlaceholder?: boolean } },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <div className="flex h-full items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncident(params.data!)
                    setEditDialogOpen(true)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncident(params.data!)
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

  const gridOptions: GridOptions<IncidentRow & { _isPlaceholder?: boolean }> =
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
          event: PaginationChangedEvent<IncidentRow & { _isPlaceholder?: boolean }>,
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
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500">
            Monitor and manage operational incidents
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Incident
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search incidents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<IncidentRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No incidents found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading incidents...
            </div>
          )}
        />
      </div>

      <AddIncidentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {selectedIncident && (
        <EditIncidentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          incident={selectedIncident}
          onSubmit={(data) =>
            updateMutation.mutate({ id: selectedIncident._id, data })
          }
          isLoading={updateMutation.isPending}
        />
      )}

      {selectedIncident && (
        <DeleteIncidentDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          incident={selectedIncident}
          onConfirm={() => deleteMutation.mutate(selectedIncident._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function AddIncidentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: IncidentFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    severity: '',
    status: '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof IncidentFormData, string>>
  >({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof IncidentFormData, string>> = {}

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
      setFormData({ title: '', severity: '', status: '' })
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
              Add New Incident
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Log a new operational incident.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="add-incident-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="add-incident-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className={`opsdash-input ${errors.title ? 'border-red-300' : ''}`}
                    placeholder="Service outage, performance issue..."
                    disabled={isLoading}
                  />
                  {errors.title && (
                    <p className="opsdash-error">{errors.title}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-incident-severity" className="opsdash-label">
                    Severity
                  </label>
                  <input
                    id="add-incident-severity"
                    type="text"
                    value={formData.severity ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                    className="opsdash-input"
                    placeholder="Low, medium, high, critical..."
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-incident-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="add-incident-status"
                    type="text"
                    value={formData.status ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="opsdash-input"
                    placeholder="Open, investigating, resolved..."
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
                {isLoading ? 'Creating...' : 'Create Incident'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditIncidentDialog({
  open,
  onOpenChange,
  incident,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident: IncidentRow
  onSubmit: (data: Partial<IncidentFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<IncidentFormData>>({
    title: incident.title ?? '',
    severity: incident.severity ?? '',
    status: incident.status ?? '',
  })
  const [errors, setErrors] = useState<
    Partial<Record<keyof IncidentFormData, string>>
  >({})

  useEffect(() => {
    setFormData({
      title: incident.title ?? '',
      severity: incident.severity ?? '',
      status: incident.status ?? '',
    })
    setErrors({})
  }, [incident])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof IncidentFormData, string>> = {}

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
              Edit Incident
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update incident information.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="edit-incident-title" className="opsdash-label">
                    Title
                  </label>
                  <input
                    id="edit-incident-title"
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
                  <label htmlFor="edit-incident-severity" className="opsdash-label">
                    Severity
                  </label>
                  <input
                    id="edit-incident-severity"
                    type="text"
                    value={formData.severity ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, severity: e.target.value })
                    }
                    className="opsdash-input"
                    disabled={isLoading}
                  />
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-incident-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="edit-incident-status"
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
                {isLoading ? 'Updating...' : 'Update Incident'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteIncidentDialog({
  open,
  onOpenChange,
  incident,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident: IncidentRow
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
              Delete Incident
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete{' '}
              <strong>{incident.title ?? 'this incident'}</strong>? This action
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
              {isLoading ? 'Deleting...' : 'Delete Incident'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
