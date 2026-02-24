import { useLocalSearchParams } from 'expo-router';

export default function Success() {
  const { billing_id } = useLocalSearchParams();

  return (
    <Text>Payment Success for billing #{billing_id}</Text>
  );
}