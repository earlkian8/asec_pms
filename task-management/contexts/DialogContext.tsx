import React, { createContext, useContext, useState, useCallback } from 'react';
import Dialog, { DialogType, DialogButton } from '@/components/Dialog';

interface DialogState {
  visible: boolean;
  type: DialogType;
  title?: string;
  message: string;
  buttons?: DialogButton[];
}

interface DialogContextType {
  showDialog: (
    message: string,
    type?: DialogType,
    title?: string,
    buttons?: DialogButton[]
  ) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>({
    visible: false,
    type: 'info',
    message: '',
  });

  const showDialog = useCallback((
    message: string,
    type: DialogType = 'info',
    title?: string,
    buttons?: DialogButton[]
  ) => {
    setDialog({
      visible: true,
      type,
      message,
      title,
      buttons,
    });
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Success') => {
    showDialog(message, 'success', title);
  }, [showDialog]);

  const showError = useCallback((message: string, title: string = 'Error') => {
    showDialog(message, 'error', title);
  }, [showDialog]);

  const showWarning = useCallback((message: string, title: string = 'Warning') => {
    showDialog(message, 'warning', title);
  }, [showDialog]);

  const showInfo = useCallback((message: string, title: string = 'Info') => {
    showDialog(message, 'info', title);
  }, [showDialog]);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    title: string = 'Confirm',
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    showDialog(
      message,
      'confirm',
      title,
      [
        {
          text: cancelText,
          onPress: hideDialog,
          style: 'cancel',
        },
        {
          text: confirmText,
          onPress: () => {
            hideDialog();
            onConfirm();
          },
          style: 'default',
        },
      ]
    );
  }, [showDialog]);

  const hideDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <DialogContext.Provider
      value={{
        showDialog,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showConfirm,
        hideDialog,
      }}
    >
      {children}
      <Dialog
        visible={dialog.visible}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onClose={hideDialog}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}

