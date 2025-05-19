"use client"

import { createContext, useContext } from "react"
import { useQuery, useQueryClient } from "react-query"
import { getCurrentUser, logoutUser } from "../api/auth"

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient()

  const {
    data: user,
    isLoading,
    isError,
    refetch,
  } = useQuery("currentUser", getCurrentUser, {
    retry: false,
    onError: () => {
      // Clear token if it's invalid
      localStorage.removeItem("token")
    },
  })

  const logout = async () => {
    await logoutUser()
    queryClient.clear()
    window.location.href = "/login"
  }

  const isAuthenticated = !!user && !isError

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission)
  }

  const value = {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refetch,
    hasPermission,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
