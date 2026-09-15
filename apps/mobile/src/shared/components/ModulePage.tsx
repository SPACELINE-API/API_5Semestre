import { View, Text } from 'react-native';
import type { SprintModule } from '../types/module';

type ModulePageProps = {
  module: SprintModule;
};

export function ModulePage({ module }: ModulePageProps) {
  return (
    <View className="flex-1 p-6 bg-white">
      <Text className="text-xs font-poppins-bold text-blue-600 uppercase tracking-wider mb-1">
        {module.eyebrow}
      </Text>
      <Text className="text-2xl font-poppins-bold text-gray-900 mb-2">
        {module.title}
      </Text>
      <Text className="text-base font-inter text-gray-500 mb-6 leading-relaxed">
        {module.description}
      </Text>
      <View 
        className="flex-row flex-wrap gap-2 mb-8" 
        accessibilityLabel="Referências do backlog"
      >
        {module.backlogRefs.map((ref) => (
          <View key={ref} className="bg-gray-100 px-3 py-1.5 rounded-md">
            <Text className="text-xs font-inter-medium text-gray-800">
              {ref}
            </Text>
          </View>
        ))}
      </View>
      <View className="flex-col gap-4">
        {module.actions.map((action) => (
          <View 
            key={action.label} 
            className="bg-gray-50 p-4 rounded-xl border border-gray-100"
          >
            <Text className="text-lg font-poppins-medium text-gray-900 mb-1">
              {action.label}
            </Text>
            <Text className="text-sm font-inter text-gray-500">
              {action.description}
            </Text>
          </View>
        ))}
      </View>

    </View>
  );
}