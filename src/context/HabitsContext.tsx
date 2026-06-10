import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useState,
} from "react";

export type HabitDraft = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: string;
  duration_days: number | null;
  is_public: boolean;
  source_habit_id: string | null;
};

type Ctx = {
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  editingHabit: HabitDraft | null;
  openEditModal: (habit: HabitDraft) => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const HabitsContext = createContext<Ctx>(null!);

export function HabitsProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitDraft | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = useCallback(() => {
    setEditingHabit(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((habit: HabitDraft) => {
    setEditingHabit(habit);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingHabit(null);
  }, []);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <HabitsContext.Provider
      value={{ modalOpen, openModal, closeModal, editingHabit, openEditModal, refreshKey, triggerRefresh }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export const useHabits = () => useContext(HabitsContext);
