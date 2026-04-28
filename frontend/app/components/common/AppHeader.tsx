import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function AppHeader() {
  const router = useRouter();

  return (
    <View>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/topic/[topicKey]',
            params: { topicKey: 'visa' },
          })
        }
      >
        <Text>Visa</Text>
      </TouchableOpacity>
    </View>
  );
}