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

interface ShiftRow {
  _id: string
  name?: string
  status?: string
}

interface ShiftFormData {
  name: string
  status?: string
}

interface ShiftsResponse {
  data: ShiftRow[]
  pagination?: PaginationInfo
}

const DEFAULT_PAGE_SIZE = 10

export const ShiftsPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<ShiftRow>>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null)

  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<ShiftsResponse> = useQuery({
    queryKey: ['shifts', page, limit, search],
    queryFn: () =>
      api.listWithPagination<ShiftRow>('shifts', { page, limit, search }),
  })

  const createMutation = useMutation({
    mutationFn: (formData: ShiftFormData) =>
      api.create<ShiftRow>('shifts', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setAddDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: Partial<ShiftFormData> }) =>
      api.update<ShiftRow>('shifts', params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setEditDialogOpen(false)
      setSelectedShift(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('shifts', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setDeleteDialogOpen(false)
      setSelectedShift(null)
    },
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination

  const fullRowData = useMemo(() => {
    if (!pagination) return rows

    const totalRows = pagination.total
    const fullData: (ShiftRow & { _isPlaceholder?: boolean })[] = []

    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        fullData.push({
          _id: `placeholder-${i}`,
          name: '',
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

  const columnDefs: ColDef<ShiftRow & { _isPlaceholder?: boolean }>[] =
    useMemo(
      () => [
        {
          field: 'name',
          headerName: 'Name',
          flex: 1,
          cellRenderer: (
            params: { data?: ShiftRow & { _isPlaceholder?: boolean } },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <span className="text-sm font-medium text-gray-900">
                {params.data.name}
              </span>
            )
          },
        },
        {
          field: 'status',
          headerName: 'Status',
          flex: 0.8,
          cellRenderer: (
            params: { data?: ShiftRow & { _isPlaceholder?: boolean } },
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
            params: { data?: ShiftRow & { _isPlaceholder?: boolean } },
          ) => {
            if (!params.data || params.data._isPlaceholder) return ''
            return (
              <div className="flex h-full items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShift(params.data!)
                    setEditDialogOpen(true)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedShift(params.data!)
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

  const gridOptions: GridOptions<ShiftRow & { _isPlaceholder?: boolean }> =
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
          event: PaginationChangedEvent<ShiftRow & { _isPlaceholder?: boolean }>,
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
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-sm text-gray-500">
            View and manage your operation shifts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add Shift
        </button>
      </div>

      <div className="mb-4">
        <input
          placeholder="Search shifts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<ShiftRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No shifts found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading shifts...
            </div>
          )}
        />
      </div>

      <AddShiftDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {selectedShift && (
        <EditShiftDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          shift={selectedShift}
          onSubmit={(data) =>
            updateMutation.mutate({ id: selectedShift._id, data })
          }
          isLoading={updateMutation.isPending}
        />
      )}

      {selectedShift && (
        <DeleteShiftDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          shift={selectedShift}
          onConfirm={() => deleteMutation.mutate(selectedShift._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function AddShiftDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ShiftFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<ShiftFormData>({
    name: '',
    status: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftFormData, string>>>(
    {},
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof ShiftFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
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
      setFormData({ name: '', status: '' })
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
              Add New Shift
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Create a new operation shift.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="add-shift-name" className="opsdash-label">
                    Name
                  </label>
                  <input
                    id="add-shift-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`opsdash-input ${errors.name ? 'border-red-300' : ''}`}
                    placeholder="Day shift, Night shift..."
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="opsdash-error">{errors.name}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="add-shift-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="add-shift-status"
                    type="text"
                    value={formData.status ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="opsdash-input"
                    placeholder="Active, inactive..."
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
                {isLoading ? 'Creating...' : 'Create Shift'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditShiftDialog({
  open,
  onOpenChange,
  shift,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: ShiftRow
  onSubmit: (data: Partial<ShiftFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<ShiftFormData>>({
    name: shift.name ?? '',
    status: shift.status ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftFormData, string>>>(
    {},
  )

  useEffect(() => {
    setFormData({
      name: shift.name ?? '',
      status: shift.status ?? '',
    })
    setErrors({})
  }, [shift])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof ShiftFormData, string>> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
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
              Edit Shift
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update shift information.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
                  <label htmlFor="edit-shift-name" className="opsdash-label">
                    Name
                  </label>
                  <input
                    id="edit-shift-name"
                    type="text"
                    value={formData.name ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`opsdash-input ${errors.name ? 'border-red-300' : ''}`}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="opsdash-error">{errors.name}</p>
                  )}
                </div>

                <div className="opsdash-field">
                  <label htmlFor="edit-shift-status" className="opsdash-label">
                    Status
                  </label>
                  <input
                    id="edit-shift-status"
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
                {isLoading ? 'Updating...' : 'Update Shift'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DeleteShiftDialog({
  open,
  onOpenChange,
  shift,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift: ShiftRow
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
              Delete Shift
            </Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete{' '}
              <strong>{shift.name ?? 'this shift'}</strong>? This action cannot be
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
              {isLoading ? 'Deleting...' : 'Delete Shift'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

