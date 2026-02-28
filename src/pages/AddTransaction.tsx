import { useParams } from 'react-router-dom';
import TransactionForm from '@/components/TransactionForm';

export default function AddTransaction() {
  const { id } = useParams();
  return <TransactionForm editId={id} />;
}
