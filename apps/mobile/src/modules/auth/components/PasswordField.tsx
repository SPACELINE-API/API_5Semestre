import { forwardRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

type PasswordFieldProps = React.ComponentProps<typeof TextInput> & { label?: string; visible: boolean; onToggle: () => void };

export const PasswordField = forwardRef<TextInput, PasswordFieldProps>(function PasswordField({ label, visible, onToggle, ...props }, ref) {
	return <View>{label ? <Text className="mb-2 text-sm font-bold text-[#101b35]">{label}</Text> : null}<View className="relative"><TextInput ref={ref} {...props} className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 pr-14 text-sm text-[#12233c]" placeholderTextColor="#94a3b8" secureTextEntry={!visible} /><Pressable className="absolute inset-y-0 right-0 w-14 items-center justify-center" accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} onPress={onToggle}>{visible ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}</Pressable></View></View>;
});
