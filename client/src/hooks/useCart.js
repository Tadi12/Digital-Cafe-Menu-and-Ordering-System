import useCartStore from '../store/useCartStore';

export const useCart = () => {
  const store = useCartStore();
  return {
    ...store,
    totalItemsCount: store.getTotalItemsCount(),
    subtotal: store.getSubtotal(),
  };
};
