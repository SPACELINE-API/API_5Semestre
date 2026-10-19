import { useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Platform,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Constants from 'expo-constants';
import { Camera } from 'lucide-react-native';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { resolveNativeResourceUrl } from '../../../shared/utils/nativeResourceUrl';
import { uploadMyPhoto } from '../services/profileService';
import type { TranslatorProfile } from '../types/profile';
import {
	PHOTO_FILE_RULES,
	formatFileSize,
	validateProfileFile,
} from '../utils/profileFiles';

type ProfilePhotoCardProps = {
	profile: TranslatorProfile;
	onChange: (profile: TranslatorProfile) => void;
	onSuccess: (message: string) => void;
};

function initialsOf(name: string) {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}

export function ProfilePhotoCard({
	profile,
	onChange,
	onSuccess,
}: ProfilePhotoCardProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const photoUrl = profile.photo_url
		? resolveNativeResourceUrl(
				profile.photo_url,
				Constants.expoConfig?.hostUri,
				Platform.OS,
			)
		: null;

	async function handlePickPhoto() {
		setError(null);

		const file = await pickDocument({ types: PHOTO_FILE_RULES.mimeTypes });
		if (!file) return;

		const validationError = validateProfileFile(file, PHOTO_FILE_RULES);
		if (validationError) {
			setError(validationError);
			return;
		}

		setIsUploading(true);
		try {
			onChange(await uploadMyPhoto(file));
			onSuccess('Foto atualizada com sucesso.');
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível enviar a foto. Tente novamente.',
			);
		} finally {
			setIsUploading(false);
		}
	}

	return (
		<View className="gap-4 rounded-xl border border-gray-100 p-5">
			<View className="flex-row items-center gap-4">
				<View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-50">
					{photoUrl ? (
						<Image
							source={{ uri: photoUrl }}
							accessibilityLabel={`Foto de ${profile.name}`}
							className="h-20 w-20"
						/>
					) : (
						<Text className="font-inter font-bold text-blue-700 text-xl">
							{initialsOf(profile.name)}
						</Text>
					)}
				</View>

				<View className="flex-1 gap-2">
					<Text className="font-inter font-semibold text-gray-900 text-sm">
						Foto do perfil
					</Text>
					<Text className="font-inter text-gray-500 text-xs">
						{PHOTO_FILE_RULES.formatsLabel}, até{' '}
						{formatFileSize(PHOTO_FILE_RULES.maxBytes)}.
					</Text>
					<TouchableOpacity
						onPress={() => void handlePickPhoto()}
						disabled={isUploading}
						activeOpacity={0.7}
						accessibilityRole="button"
						className={`flex-row items-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-2 ${isUploading ? 'opacity-60' : ''}`}
					>
						{isUploading ? (
							<ActivityIndicator size="small" color="#353535" />
						) : (
							<Camera size={14} color="#353535" />
						)}
						<Text className="font-inter font-semibold text-gray-800 text-xs">
							{isUploading
								? 'Enviando…'
								: profile.photo_url
									? 'Alterar foto'
									: 'Adicionar foto'}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{error && (
				<View className="rounded-lg bg-red-50 px-3 py-2.5">
					<Text className="font-inter text-red-900 text-sm">{error}</Text>
				</View>
			)}
		</View>
	);
}
