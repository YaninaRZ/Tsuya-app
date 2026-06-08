import {
    createContext,
    PropsWithChildren,
    useCallback,
    useContext,
    useState,
} from "react";

type Ctx = {
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const HabitsContext = createContext<Ctx>(null!);

export function HabitsProvider({ children }: PropsWithChildren) {
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <HabitsContext.Provider
      value={{ modalOpen, openModal, closeModal, refreshKey, triggerRefresh }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export const useHabits = () => useContext(HabitsContext);
