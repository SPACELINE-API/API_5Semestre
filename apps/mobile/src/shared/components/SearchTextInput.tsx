import { Text, TextInput, View, type TextInputProps } from 'react-native';

export function SearchTextInput({
	className,
	placeholder,
	value,
	...props
}: TextInputProps & { className?: string }) {
	const showPlaceholder = Boolean(placeholder) && !value;
	return (
		<View className={className}>
			<TextInput
				{...props}
				value={value}
				numberOfLines={1}
				className="h-full border-0 p-0 font-inter text-foreground text-sm outline-none"
			/>
			{showPlaceholder ? (
				<View
					pointerEvents="none"
					className="absolute bottom-0 left-0 right-0 top-0 justify-center"
				>
					<Text
						numberOfLines={1}
						ellipsizeMode="tail"
						className="font-inter text-foreground-subtle text-sm"
					>
						{placeholder}
					</Text>
				</View>
			) : null}
		</View>
	);
}
