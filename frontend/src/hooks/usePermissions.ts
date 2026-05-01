import { useAuthStore } from '../stores/authStore'

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions)
  return {
    can: (code: string) => permissions.has(code),
    canAny: (codes: string[]) => codes.some((c) => permissions.has(c)),
    canAll: (codes: string[]) => codes.every((c) => permissions.has(c)),
  }
}
