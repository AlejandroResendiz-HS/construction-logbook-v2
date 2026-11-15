import { create } from 'zustand'
import { listMachinery } from '@/app/(app)/machinery/actions'

interface MachineryState {
  machinery: any[]
  loading: boolean
  fetchMachinery: () => Promise<void>
  addMachine: (machine: any) => void
  removeMachine: (machinery_id: number) => void
  updateMachine: (machinery_id: number, updatedMachine: any) => void
}

export const useMachineryStore = create<MachineryState>((set) => ({
  machinery: [],
  loading: false,
  fetchMachinery: async () => {
    set({ loading: true })
    const data = await listMachinery()
    set({ machinery: data, loading: false })
  },
  addMachine: (machine) => 
    set((state) => ({ 
      machinery: [...state.machinery, machine].sort((a, b) => a.machinery_full_name.localeCompare(b.machinery_full_name)) 
    })),
  removeMachine: (machinery_id) => 
    set((state) => ({ machinery: state.machinery.filter(m => m.machinery_id !== machinery_id) })),
  updateMachine: (machinery_id, updatedMachine) => 
    set((state) => ({
      machinery: state.machinery.map(m => m.machinery_id === machinery_id ? { ...m, ...updatedMachine } : m)
        .sort((a, b) => a.machinery_full_name.localeCompare(b.machinery_full_name))
    }))
}))
