import { useState, useMemo, useRef, useEffect } from 'react'
import { type UseQueryResult, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, GridOptions, ICellRendererParams, PaginationChangedEvent } from 'ag-grid-community'
import type { AgGridReact as AgGridReactType } from 'ag-grid-react'
import * as Dialog from '@radix-ui/react-dialog'
import { api, type PaginationInfo } from '../services/api'
import { DialogFooter } from '../components/DialogFooter'

interface UserRow {
  _id: string
  name: string
  email: string
  role: string
  isActive?: boolean
}

interface UserFormData {
  name: string
  email: string
  password?: string
  role: 'admin' | 'manager' | 'operator' | 'viewer'
  isActive?: boolean
}

interface UsersResponse {
  data: UserRow[]
  pagination?: PaginationInfo
}

// Default page size
const DEFAULT_PAGE_SIZE = 10

export const UsersPage = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const gridRef = useRef<AgGridReactType<UserRow>>(null)
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  
  const queryClient = useQueryClient()

  const { data, isLoading }: UseQueryResult<UsersResponse> = useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: () =>
      api.listWithPagination<UserRow>('users', { page, limit, search }),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (userData: UserFormData) => api.create<UserRow>('users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setAddDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      api.update<UserRow>('users', id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditDialogOpen(false)
      setSelectedUser(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.remove('users', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    },
  })

  const rows = data?.data ?? []
  const pagination = data?.pagination

  // Create a full row data array for AG-Grid pagination calculation
  // AG-Grid needs to know the total number of rows for pagination to work correctly
  // We'll use placeholder objects and filter them out in the display
  const fullRowData = useMemo(() => {
    if (!pagination) return rows
    // Create an array with the correct total length for pagination calculation
    const totalRows = pagination.total
    const fullData: (UserRow & { _isPlaceholder?: boolean })[] = []
    
    // Fill in the actual data for the current page
    const startIndex = (pagination.page - 1) * limit
    for (let i = 0; i < totalRows; i++) {
      if (i >= startIndex && i < startIndex + rows.length) {
        fullData.push(rows[i - startIndex])
      } else {
        // Create a placeholder object
        fullData.push({
          _id: `placeholder-${i}`,
          name: '',
          email: '',
          role: '',
          _isPlaceholder: true,
        })
      }
    }
    return fullData
  }, [rows, pagination, limit])

  // Update grid pagination when page changes from server
  useEffect(() => {
    if (!gridRef.current || !pagination) return

    const api = gridRef.current.api
    if (!api) return

    const currentPage = api.paginationGetCurrentPage()
    const expectedPage = page - 1 // AG-Grid uses 0-based index
    if (currentPage !== expectedPage) {
      isSyncingPageRef.current = true // Set flag to prevent onPaginationChanged from firing
      api.paginationGoToPage(expectedPage)
      // Reset flag after a short delay to allow the pagination change to complete
      setTimeout(() => {
        isSyncingPageRef.current = false
      }, 0)
    }
  }, [pagination, page])

  const columnDefs: ColDef<UserRow & { _isPlaceholder?: boolean }>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'User',
        flex: 1,
        cellRenderer: (params: ICellRendererParams<UserRow & { _isPlaceholder?: boolean }>) => {
          if (!params.data || params.data._isPlaceholder) return ''
          return (
            <div className="flex items-center gap-3 h-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                {params.data.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {params.data.name}
              </div>
            </div>
          )
        },
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        cellRenderer: (params: ICellRendererParams<UserRow & { _isPlaceholder?: boolean }>) => {
          if (!params.data || params.data._isPlaceholder) return ''
          return (
            <span className="text-sm text-gray-500 truncate block">
              {params.data.email}
            </span>
          )
        },
      },
      {
        field: 'role',
        headerName: 'Role',
        flex: 0.8,
        cellRenderer: (params: ICellRendererParams<UserRow & { _isPlaceholder?: boolean }>) => {
          if (!params.data || params.data._isPlaceholder) return ''
          return <RoleBadge role={params.data.role} />
        },
      },
      {
        headerName: 'Actions',
        flex: 1,
        cellRenderer: (params: ICellRendererParams<UserRow & { _isPlaceholder?: boolean }>) => {
          if (!params.data || params.data._isPlaceholder) return ''
          return (
            <div className="flex items-center justify-end gap-3 h-full">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(params.data!)
                  setEditDialogOpen(true)
                }}
                className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(params.data!)
                  setDeleteDialogOpen(true)
                }}
                className="text-red-600 hover:text-red-700 hover:underline text-sm"
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

  // Use refs to track the latest values to avoid stale closures
  const pageRef = useRef(page)
  const limitRef = useRef(limit)
  const paginationRef = useRef(pagination)
  const isSyncingPageRef = useRef(false) // Flag to prevent circular updates
  
  useEffect(() => {
    pageRef.current = page
  }, [page])
  
  useEffect(() => {
    limitRef.current = limit
  }, [limit])
  
  useEffect(() => {
    paginationRef.current = pagination
  }, [pagination])

  const gridOptions: GridOptions<UserRow & { _isPlaceholder?: boolean }> = useMemo(() => ({
    theme: 'legacy', // Use legacy CSS theme to match ag-grid.css imports
    pagination: true,
    paginationPageSize: limit,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressCellFocus: true,
    rowHeight: 60,
    headerHeight: 48,
    suppressPaginationPanel: false,
    // Hide placeholder rows using CSS
    getRowStyle: (params: { data?: UserRow & { _isPlaceholder?: boolean } }) => {
      if (params.data?._isPlaceholder) {
        return { display: 'none', height: 0 }
      }
      return undefined
    },
    onPaginationChanged: (event: PaginationChangedEvent<UserRow & { _isPlaceholder?: boolean }>) => {
      // Skip if we're syncing the page (to prevent circular updates)
      if (isSyncingPageRef.current) {
        return
      }
      
      // Skip if this is the initial load or data refresh
      if (!event.api.getDisplayedRowCount()) {
        return
      }
      
      // Check if pageSize changed
      const newPageSize = event.api.paginationGetPageSize()
      const currentLimit = limitRef.current
      if (newPageSize !== currentLimit) {
        setLimit(newPageSize)
        setPage(1) // Reset to first page when pageSize changes
        return
      }
      
      // Update page if user clicked pagination
      const newPageIndex = event.api.paginationGetCurrentPage()
      const currentPage = pageRef.current
      const currentPagination = paginationRef.current
      
      if (newPageIndex !== undefined) {
        const newPage = newPageIndex + 1 // AG-Grid uses 0-based index
        // Only update if page actually changed and is within valid range
        if (newPage !== currentPage && newPage >= 1) {
          const maxPages = currentPagination?.totalPages ?? 1
          if (newPage <= maxPages) {
            setPage(newPage)
          }
        }
      }
    },
  }), [limit])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">
            Manage accounts that can access your operations dashboard
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + Add User
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* AG-Grid Table */}
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact<UserRow & { _isPlaceholder?: boolean }>
          ref={gridRef}
          rowData={fullRowData}
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              No users found.
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              Loading users...
            </div>
          )}
        />
      </div>

      {/* Add User Dialog */}
      <AddUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit User Dialog */}
      {selectedUser && (
        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onSubmit={(data) => updateMutation.mutate({ id: selectedUser._id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete User Dialog */}
      {selectedUser && (
        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUser}
          onConfirm={() => deleteMutation.mutate(selectedUser._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    operator: 'bg-gray-100 text-gray-700',
    viewer: 'bg-gray-100 text-gray-500',
  }

  return (
    <span
      className={`rounded px-2 py-1 text-xs font-semibold ${
        colors[role] ?? 'bg-gray-100 text-gray-700'
      }`}
    >
      {role}
    </span>
  )
}

// Add User Dialog
function AddUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UserFormData) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'operator',
    isActive: true,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof UserFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSubmit(formData)
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Allow opening always, but prevent closing when loading
    if (newOpen) {
      onOpenChange(true)
    } else if (!isLoading) {
      // Reset form when closing
      setFormData({ name: '', email: '', password: '', role: 'operator', isActive: true })
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
            <Dialog.Title className="opsdash-dialog-title">Add New User</Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Create a new user account. All fields are required.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-3">
                <div className="opsdash-field">
              <label htmlFor="add-name" className="opsdash-label">
                Name
              </label>
              <input
                id="add-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoComplete="name"
                className={`opsdash-input ${errors.name ? 'border-red-300' : ''}`}
                placeholder="Jane Doe"
                disabled={isLoading}
              />
              {errors.name && <p className="opsdash-error">{errors.name}</p>}
                </div>

                <div className="opsdash-field">
              <label htmlFor="add-email" className="opsdash-label">
                Email
              </label>
              <input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                className={`opsdash-input ${errors.email ? 'border-red-300' : ''}`}
                placeholder="jane@company.com"
                disabled={isLoading}
              />
              {errors.email && <p className="opsdash-error">{errors.email}</p>}
                </div>

                <div className="opsdash-field">
              <label htmlFor="add-password" className="opsdash-label">
                Password
              </label>
              <input
                id="add-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                autoComplete="new-password"
                className={`opsdash-input ${errors.password ? 'border-red-300' : ''}`}
                placeholder="Minimum 6 characters"
                disabled={isLoading}
              />
              {!errors.password && (
                <p className="opsdash-help">Minimum 6 characters.</p>
              )}
              {errors.password && <p className="opsdash-error">{errors.password}</p>}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="opsdash-field">
                <label htmlFor="add-role" className="opsdash-label">
                  Role
                </label>
                <select
                  id="add-role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserFormData['role'] })
                  }
                  className="opsdash-select"
                  disabled={isLoading}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
                  </div>

                  <div className="flex items-end">
                <label
                  htmlFor="add-active"
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <span className="font-semibold">Active</span>
                  <input
                    id="add-active"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                </label>
                  </div>
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
                {isLoading ? 'Creating...' : 'Create User'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Edit User Dialog
function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow
  onSubmit: (data: Partial<UserFormData>) => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<UserFormData>>({
    name: user.name,
    email: user.email,
    role: user.role as UserFormData['role'],
    isActive: user.isActive ?? true,
  })
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})

  // Update form when user changes
  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role as UserFormData['role'],
      isActive: user.isActive ?? true,
    })
    setPassword('')
    setErrors({})
  }, [user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<Record<keyof UserFormData, string>> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    if (password && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    const submitData = { ...formData }
    if (password) {
      submitData.password = password
    }
    onSubmit(submitData)
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Allow opening always, but prevent closing when loading
    if (newOpen) {
      onOpenChange(true)
    } else if (!isLoading) {
      // Reset form when closing
      setPassword('')
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
            <Dialog.Title className="opsdash-dialog-title">Edit User</Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Update user information. Leave password empty to keep current password.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="space-y-3">
              <div className="opsdash-field">
              <label htmlFor="edit-name" className="opsdash-label">
                Name
              </label>
              <input
                id="edit-name"
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoComplete="name"
                className={`opsdash-input ${errors.name ? 'border-red-300' : ''}`}
                disabled={isLoading}
              />
              {errors.name && <p className="opsdash-error">{errors.name}</p>}
              </div>

              <div className="opsdash-field">
              <label htmlFor="edit-email" className="opsdash-label">
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                autoComplete="email"
                className={`opsdash-input ${errors.email ? 'border-red-300' : ''}`}
                disabled={isLoading}
              />
              {errors.email && <p className="opsdash-error">{errors.email}</p>}
              </div>

              <div className="opsdash-field">
              <label htmlFor="edit-password" className="opsdash-label">
                Password
              </label>
              <input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`opsdash-input ${errors.password ? 'border-red-300' : ''}`}
                placeholder="Leave empty to keep current"
                disabled={isLoading}
              />
              {errors.password && <p className="opsdash-error">{errors.password}</p>}
              </div>

              <div className="opsdash-field">
              <label htmlFor="edit-role" className="opsdash-label">
                Role
              </label>
              <select
                id="edit-role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserFormData['role'] })
                }
                className="opsdash-select"
                disabled={isLoading}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="operator">Operator</option>
                <option value="viewer">Viewer</option>
              </select>
              </div>

              <div className="flex items-center">
              <input
                id="edit-active"
                type="checkbox"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <label htmlFor="edit-active" className="ml-2 text-sm text-gray-700">
                Active
              </label>
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
                {isLoading ? 'Updating...' : 'Update User'}
              </button>
            </DialogFooter>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Delete User Dialog
function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRow
  onConfirm: () => void
  isLoading: boolean
}) {
  const handleOpenChange = (newOpen: boolean) => {
    // Allow opening always, but prevent closing when loading
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
            <Dialog.Title className="opsdash-dialog-title">Delete User</Dialog.Title>
            <Dialog.Description className="opsdash-dialog-description">
              Are you sure you want to delete <strong>{user.name}</strong> ({user.email})? This
              action cannot be undone.
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
              {isLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </DialogFooter>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}