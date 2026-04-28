import { Text, TouchableOpacity } from 'react-native';

type KeywordChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export default function KeywordChip({
  label,
  selected,
  onPress,
}: KeywordChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        margin: 4,
        backgroundColor: selected ? '#2563eb' : '#e5e7eb',
      }}
    >
      <Text style={{ color: selected ? 'white' : 'black' }}>{label}</Text>
    </TouchableOpacity>
  );
}
