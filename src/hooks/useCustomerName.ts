// hooks/useCustomerName.ts
import { useEffect, useState } from 'react';
import {
  getCustomerName,
  subscribeCustomerName,
} from '../utils/customerName';

export const useCustomerName = () => {
  const [name, setName] = useState<string>(() => getCustomerName());

  useEffect(() => {
    const unsubscribe = subscribeCustomerName((n) => setName(n));
    return unsubscribe;
  }, []);

  return name;
};