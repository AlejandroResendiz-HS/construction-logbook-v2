import { create } from 'zustand'
import { listDepreciations, saveDepreciation } from '@/app/(app)/machinery_depreciation/actions'

interface DepreciationInfo {
  machinery_id: number
  optimal_fuel_consumption?: number
  service_life?: number
  purchase_value?: number
  rescue_value?: number
  estimated_depreciation_rate?: number
  machinery?: any
}

interface MachineryDepreciationState {
  depreciations: DepreciationInfo[]
  loading: boolean
  fetchDepreciations: () => Promise<void>
  upsertDepreciation: (depr: DepreciationInfo) => Promise<{ success: boolean; error?: any }>
}

export const useMachineryDepreciationStore = create<MachineryDepreciationState>((set, get) => ({
  depreciations: [],
  loading: false,
  fetchDepreciations: async () => {
    set({ loading: true })
    try {
      const data = await listDepreciations()
      set({ depreciations: data || [], loading: false })
    } catch (error) {
      console.error('Error fetching depreciations:', error)
      set({ loading: false })
    }
  },
  upsertDepreciation: async (depr) => {
    let data
    try { data = await saveDepreciation(depr) } catch (error) { return { success: false, error } }
    if (!data) return { success: false, error: 'Not found' }

    set((state) => {
      const exists = state.depreciations.some(d => d.machinery_id === depr.machinery_id)
      if (exists) {
        return {
          depreciations: state.depreciations.map(d => d.machinery_id === depr.machinery_id ? data : d)
        }
      }
      return {
        depreciations: [...state.depreciations, data]
      }
    })

    return { success: true }
  }
}))
