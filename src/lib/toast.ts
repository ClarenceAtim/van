/**
 * Toast notifications that load the toast library on first use, so it isn't part of the
 * JavaScript every page downloads up front. Same API as sonner's toast.success/error/info.
 * Messages wait until <DeferredUi> has mounted the toaster, so none are lost.
 */
type Kind = "success" | "error" | "info";

let markMounted: () => void = () => {};
const mounted = new Promise<void>((resolve) => (markMounted = resolve));

/** Called by DeferredUi once the toaster is on the page. */
export const toasterMounted = () => markMounted();

const show = (kind: Kind) => (message: string | undefined) => {
  if (!message) return;
  window.dispatchEvent(new Event("toaster:needed"));
  void Promise.all([import("sonner"), mounted]).then(([{ toast: t }]) => t[kind](message));
};

export const toast = { success: show("success"), error: show("error"), info: show("info") };
