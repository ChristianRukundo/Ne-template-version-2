import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { toast } from "react-hot-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  getAllRoles,
} from "../../api/admin";
import { Pagination } from "../../components/ui/pagination";
import { useAuth } from "../../context/auth-context";

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);
  const [pageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleName: "Viewer",
  });

  const canManageUsers = user?.permissions?.includes("manage_all_users");

  // Fetch users with filters and sorting
  const { data, isLoading, isError, refetch } = useQuery(
    [
      "users",
      searchQuery,
      roleFilter,
      sortBy,
      sortOrder,
      currentPage,
      pageSize,
    ],
    () =>
      getAllUsers({
        search: searchQuery.trim(),
        role: roleFilter,
        sortBy,
        order: sortOrder,
        page: currentPage,
        limit: pageSize,
      }),
    {
      keepPreviousData: true,
      enabled: canManageUsers,
      onError: (error) => {
        toast.error(error.response?.data?.message || "Failed to load users");
      },
    }
  );

  // Fetch roles
  const { data: roles = [] } = useQuery("roles", getAllRoles);

  // Create user mutation
  const createUserMutation = useMutation(createUser, {
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries("users");
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to create user");
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation(updateUser, {
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries("users");
      setIsEditModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update user");
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation(deleteUser, {
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries("users");
      setIsDeleteModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete user");
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation(updateUserRole, {
    onSuccess: () => {
      toast.success("User role updated successfully");
      queryClient.invalidateQueries("users");
      setIsRoleModalOpen(false);
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || "Failed to update user role"
      );
    },
  });

  // Pagination
  const currentUsers = data?.data || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  console.log(pagination);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      roleName: "User",
    });
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      roleName: user.role,
    });
    setIsEditModalOpen(true);
  };

  // Open delete modal
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Open role modal
  const openRoleModal = (user) => {
    setSelectedUser(user);
    setFormData({
      ...formData,
      roleName: user.role,
    });
    setIsRoleModalOpen(true);
  };

  // Handle form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle role change
  const handleRoleChange = (value) => {
    setFormData({
      ...formData,
      roleName: value,
    });
  };

  // Handle create user
  const handleCreateUser = (e) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  // Handle update user
  const handleUpdateUser = (e) => {
    e.preventDefault();
    updateUserMutation.mutate({
      id: selectedUser.id,
      ...formData,
    });
  };

  // Handle delete user
  const handleDeleteUser = () => {
    deleteUserMutation.mutate(selectedUser.id);
  };

  // Handle update user role
  const handleUpdateRole = (e) => {
    e.preventDefault();
    updateRoleMutation.mutate({
      id: selectedUser.id,
      roleName: formData.roleName,
    });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Admin":
        return "bg-red-100 text-red-800";
      case "Buyer":
        return "bg-green-100 text-green-800";
      case "Viewer":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button
          onClick={openCreateModal}
          className="bg-brand-yellow/80 hover:bg-brand-yellow/60  "
        >
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            size={18}
          />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="w-full md:w-64">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger>
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                <span>{roleFilter || "Filter by role"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.name} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortBy === "name" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("email")}
                >
                  Email
                  {sortBy === "email" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                {/* <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  Name
                  {sortBy === "name" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead> */}
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("role")}
                >
                  Role
                  {sortBy === "role" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("createdAt")}
                >
                  Created At
                  {sortBy === "createdAt" && (
                    <span className="ml-1">
                      {sortOrder === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-4 text-red-500"
                  >
                    Error loading users
                  </TableCell>
                </TableRow>
              ) : currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    {/* <TableCell>
                      {user.first_name} {user.last_name}
                    </TableCell> */}
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.email_verified ? (
                        <Badge className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRoleModal(user)}>
                            <Check className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteModal(user)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive an email to verify
              their account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div> */}
                {/* <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div> */}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.roleName}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isLoading}>
                {createUserMutation.isLoading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep current
              password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div> */}
                {/* <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div> */}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">
                  Password{" "}
                  <span className="text-gray-500 text-xs">
                    (Leave blank to keep current)
                  </span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className=" bg-brand-yellow/80 hover:bg-brand-yellow/60"
                disabled={updateUserMutation.isLoading}
              >
                {updateUserMutation.isLoading ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              You are about to delete user:{" "}
              <strong>{selectedUser?.username}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isLoading}
            >
              {deleteUserMutation.isLoading ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for user:{" "}
              <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateRole}>
            <div className="py-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.roleName}
                  onValueChange={handleRoleChange}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRoleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateRoleMutation.isLoading}>
                {updateRoleMutation.isLoading ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
