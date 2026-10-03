import type { Role } from '@/types/database'

export const canWrite = (role: Role | null | undefined) => role === 'admin' || role === 'pelaksana'
export const canDelete = (role: Role | null | undefined) => role === 'admin'
export const isAdmin = (role: Role | null | undefined) => role === 'admin'
