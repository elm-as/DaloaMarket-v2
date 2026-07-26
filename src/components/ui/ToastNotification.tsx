import toast from 'react-hot-toast';

export { Toaster } from 'react-hot-toast';

const baseStyle = {
  borderRadius: '14px',
  background: '#fff',
  boxShadow: 'var(--elevation-3)',
};

export const showToast = {
  success: (msg: string) => toast.success(msg, { style: baseStyle }),
  error: (msg: string) => toast.error(msg, { style: baseStyle }),
  loading: (msg: string) => toast.loading(msg, { style: baseStyle }),
  dismiss: toast.dismiss,
};
