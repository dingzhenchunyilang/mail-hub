import { ref } from 'vue';

const dialogRef = ref(null);

export function setDialogRef(ref) {
  dialogRef.value = ref;
}

export function useDialog() {
  const alert = (message, title) => {
    if (!dialogRef.value) return window.alert(message);
    return dialogRef.value.alert(message, title);
  };

  const confirm = (message, title) => {
    if (!dialogRef.value) return window.confirm(message);
    return dialogRef.value.confirm(message, title);
  };

  const prompt = (message, options) => {
    if (!dialogRef.value) return window.prompt(message, options?.default);
    return dialogRef.value.prompt(message, options);
  };

  return { alert, confirm, prompt };
}
