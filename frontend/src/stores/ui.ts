/**
 * UI store for application state (theme, panels, modals, notifications).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Panel visibility state */
export interface PanelState {
  sidebar: boolean;
  inspector: boolean;
  console: boolean;
  timeline: boolean;
}

/** Modal state */
export interface ModalState {
  isOpen: boolean;
  type: string | null;
  props?: Record<string, unknown>;
}

/** Notification type */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/** Notification item */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

/** UI store state */
export interface UIState {
  // Theme
  theme: ThemeMode;

  // Panels
  panels: PanelState;

  // Modal
  modal: ModalState;

  // Notifications
  notifications: Notification[];

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | undefined;

  // Command palette
  commandPaletteOpen: boolean;

  // Search
  searchQuery: string;
  searchOpen: boolean;
}

/** UI store actions */
export interface UIActions {
  // Theme
  setTheme: (theme: ThemeMode) => void;

  // Panels
  togglePanel: (panel: keyof PanelState) => void;
  setPanel: (panel: keyof PanelState, visible: boolean) => void;
  resetPanels: () => void;

  // Modal
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;

  // Command palette
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Search
  setSearchQuery: (query: string) => void;
  toggleSearch: () => void;
  setSearchOpen: (open: boolean) => void;
}

/** Default panel state */
const defaultPanels: PanelState = {
  sidebar: true,
  inspector: false,
  console: false,
  timeline: false,
};

/** Generate unique ID */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/** UI store */
export const useUIStore = create<UIState & UIActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      theme: 'system',
      panels: { ...defaultPanels },
      modal: { isOpen: false, type: null },
      notifications: [],
      globalLoading: false,
      loadingMessage: undefined,
      commandPaletteOpen: false,
      searchQuery: '',
      searchOpen: false,

      // Theme actions
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
        }),

      // Panel actions
      togglePanel: (panel) =>
        set((state) => {
          state.panels[panel] = !state.panels[panel];
        }),

      setPanel: (panel, visible) =>
        set((state) => {
          state.panels[panel] = visible;
        }),

      resetPanels: () =>
        set((state) => {
          state.panels = { ...defaultPanels };
        }),

      // Modal actions
      openModal: (type, props) =>
        set((state) => {
          state.modal = { isOpen: true, type, props };
        }),

      closeModal: () =>
        set((state) => {
          state.modal = { isOpen: false, type: null, props: undefined };
        }),

      // Notification actions
      addNotification: (notification) => {
        const id = generateId();
        set((state) => {
          state.notifications.push({
            ...notification,
            id,
            createdAt: Date.now(),
            dismissible: notification.dismissible ?? true,
            duration: notification.duration ?? 5000,
          });
        });

        // Auto-dismiss if duration is set
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => {
          state.notifications = state.notifications.filter((n: Notification) => n.id !== id);
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = [];
        }),

      // Loading actions
      setGlobalLoading: (loading, message) =>
        set((state) => {
          state.globalLoading = loading;
          state.loadingMessage = message;
        }),

      // Command palette actions
      toggleCommandPalette: () =>
        set((state) => {
          state.commandPaletteOpen = !state.commandPaletteOpen;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.commandPaletteOpen = open;
        }),

      // Search actions
      setSearchQuery: (query) =>
        set((state) => {
          state.searchQuery = query;
        }),

      toggleSearch: () =>
        set((state) => {
          state.searchOpen = !state.searchOpen;
          if (!state.searchOpen) {
            state.searchQuery = '';
          }
        }),

      setSearchOpen: (open) =>
        set((state) => {
          state.searchOpen = open;
          if (!open) {
            state.searchQuery = '';
          }
        }),
    })),
    {
      name: 'arcs-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        panels: state.panels,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useTheme = () => useUIStore((state) => state.theme);
export const usePanels = () => useUIStore((state) => state.panels);
export const useModal = () => useUIStore((state) => state.modal);
export const useNotifications = () => useUIStore((state) => state.notifications);
export const useGlobalLoading = () =>
  useUIStore((state) => ({
    loading: state.globalLoading,
    message: state.loadingMessage,
  }));
