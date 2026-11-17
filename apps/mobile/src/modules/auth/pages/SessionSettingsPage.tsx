import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SettingsHeader } from '../components/SettingsHeader';
import { usePermission } from '../hooks/usePermission';
import {
	getInactivityTimeout,
	updateInactivityTimeout,
} from '../services/sessionTimeout';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';

const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;

export default function SessionSettingsPage() {
	const { toast, showToast } = useToast();
	const canEdit = usePermission('settings.write');
	const [minutes, setMinutes] = useState('');
	const [savedMinutes, setSavedMinutes] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldError, setFieldError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		getInactivityTimeout()
			.then((data) => {
				if (!active) return;
				setSavedMinutes(data.minutes);
				setMinutes(String(data.minutes));
			})
			.catch((loadError) => {
				if (!active) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Não foi possível carregar o tempo de sessão.',
				);
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	function handleChange(value: string) {
		setMinutes(value.replace(/\D/g, ''));
		setFieldError(null);
	}

	async function handleSave() {
		const value = Number(minutes);
		if (!minutes || value < MIN_MINUTES || value > MAX_MINUTES) {
			setFieldError(
				`Informe um valor entre ${MIN_MINUTES} e ${MAX_MINUTES} minutos.`,
			);
			return;
		}

		setIsSaving(true);
		try {
			const updated = await updateInactivityTimeout(value);
			setSavedMinutes(updated.minutes);
			setMinutes(String(updated.minutes));
			showToast('Tempo de sessão atualizado com sucesso!', 'success');
		} catch (saveError) {
			showToast(
				saveError instanceof Error
					? saveError.message
					: 'Não foi possível atualizar o tempo de sessão.',
				'error',
			);
		} finally {
			setIsSaving(false);
		}
	}

	const hasChanges = minutes !== '' && Number(minutes) !== savedMinutes;
	const isSaveDisabled = !canEdit || !hasChanges || isSaving;

	return (
		<View className="relative flex-1 bg-surface">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<SettingsHeader active="sessao" />
				<View className="gap-6">
					{isLoading ? (
						<View className="py-20 items-center">
							<ActivityIndicator size="large" color="#2563eb" />
						</View>
					) : error ? (
						<View className="py-20 items-center">
							<Text className="font-inter text-danger text-sm text-center">
								{error}
							</Text>
						</View>
					) : (
						<View className="rounded-2xl border border-border bg-surface p-6 gap-5">
							<View className="gap-1">
								<Text className="font-inter font-semibold text-foreground text-sm">
									Tempo máximo de inatividade
								</Text>
								<Text className="font-inter text-foreground-muted text-xs">
									Tempo em minutos sem atividade até a sessão do usuário ser
									encerrada.
								</Text>
							</View>

							<View className="self-start rounded-lg bg-primary-soft px-3 py-2">
								<Text className="font-inter text-primary-strong text-sm">
									Tempo atual:{' '}
									<Text className="font-inter font-semibold">
										{savedMinutes} {savedMinutes === 1 ? 'minuto' : 'minutos'}
									</Text>
								</Text>
							</View>

							<View className="gap-1.5 max-w-[240px]">
								<Text className="font-inter font-semibold text-foreground text-xs">
									Novo tempo (minutos)
								</Text>
								<TextInput
									value={minutes}
									onChangeText={handleChange}
									placeholder="Ex: 30"
									placeholderTextColor="#8A8A8A"
									keyboardType="number-pad"
									maxLength={4}
									editable={canEdit && !isSaving}
									className={`rounded-lg border px-3 py-2.5 font-inter text-sm text-foreground outline-none ${
										fieldError ? 'border-danger-text' : 'border-border-strong'
									} ${!canEdit ? 'bg-surface-subtle text-foreground-muted' : ''}`}
								/>
								{fieldError && (
									<Text className="font-inter text-danger-text text-xs">
										{fieldError}
									</Text>
								)}
							</View>

							{!canEdit && (
								<Text className="font-inter text-foreground-muted text-xs">
									Seu perfil não tem permissão para alterar o tempo de sessão.
								</Text>
							)}

							<View className="flex-row justify-end">
								<TouchableOpacity
									accessibilityRole="button"
									onPress={handleSave}
									disabled={isSaveDisabled}
									className={`rounded-lg bg-primary px-5 py-2.5 ${isSaveDisabled ? 'opacity-40' : ''}`}
								>
									<Text className="font-inter font-semibold text-primary-foreground text-sm">
										{isSaving ? 'Salvando...' : 'Salvar'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>
			</ScrollView>

			<Toast toast={toast} />
		</View>
	);
}
