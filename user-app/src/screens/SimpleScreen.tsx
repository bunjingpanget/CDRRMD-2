import { Text, View } from 'react-native';

type Props = {
  title: string;
};

export default function SimpleScreen({ title }: Props) {
  return (
    <View className="flex-1 items-center justify-center bg-[#f2f2f5] px-5">
      <Text className="text-3xl font-extrabold text-[#0d3558]">{title}</Text>
      <Text className="text-base text-slate-500 mt-2 text-center">This section is ready for your next feature.</Text>
    </View>
  );
}
