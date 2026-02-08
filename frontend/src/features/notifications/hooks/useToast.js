export const useToast = () => {
  const show = (msg) => console.log("toast:", msg);
  return { show };
};
