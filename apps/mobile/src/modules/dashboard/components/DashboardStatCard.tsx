import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
	AlertCircle,
	ArrowUpRight,
	Building2,
	CheckCircle2,
	ClipboardList,
	FileText,
	Inbox,
	Mail,
	Users,
} from 'lucide-react-native';
import type { DashboardMetric } from '../types/shortcut';

type DashboardStatCardProps = {
	metric: DashboardMetric;
};

function getMetricConfig(icon: DashboardMetric['icon']) {
	switch (icon) {
		case 'invites':
			return {
				Icon: Mail,
				bgColor: 'bg-amber-50',
				iconColor: '#d97706',
				borderColor: 'border-amber-200',
			};
		case 'requests':
			return {
				Icon: Inbox,
				bgColor: 'bg-blue-50',
				iconColor: '#2563eb',
				borderColor: 'border-blue-200',
			};
		case 'quotes':
			return {
				Icon: FileText,
				bgColor: 'bg-indigo-50',
				iconColor: '#4f46e5',
				borderColor: 'border-indigo-200',
			};
		case 'service-orders':
			return {
				Icon: ClipboardList,
				bgColor: 'bg-purple-50',
				iconColor: '#9333ea',
				borderColor: 'border-purple-200',
			};
		case 'clients':
			return {
				Icon: Building2,
				bgColor: 'bg-emerald-50',
				iconColor: '#059669',
				borderColor: 'border-emerald-200',
			};
		case 'translators':
			return {
				Icon: Users,
				bgColor: 'bg-cyan-50',
				iconColor: '#0891b2',
				borderColor: 'border-cyan-200',
			};
		case 'check':
			return {
				Icon: CheckCircle2,
				bgColor: 'bg-emerald-50',
				iconColor: '#16a34a',
				borderColor: 'border-emerald-200',
			};
		default:
			return {
				Icon: AlertCircle,
				bgColor: 'bg-gray-50',
				iconColor: '#4b5563',
				borderColor: 'border-gray-200',
			};
	}
}

function getBadgeStyle(badgeType?: DashboardMetric['badgeType']) {
	switch (badgeType) {
		case 'warning':
			return {
				bg: 'bg-amber-50',
				text: 'text-amber-800',
				border: 'border-amber-200',
			};
		case 'success':
			return {
				bg: 'bg-emerald-50',
				text: 'text-emerald-800',
				border: 'border-emerald-200',
			};
		case 'info':
			return {
				bg: 'bg-blue-50',
				text: 'text-blue-800',
				border: 'border-blue-200',
			};
		default:
			return {
				bg: 'bg-gray-100',
				text: 'text-gray-700',
				border: 'border-gray-200',
			};
	}
}

export function DashboardStatCard({ metric }: DashboardStatCardProps) {
	const router = useRouter();
	const config = getMetricConfig(metric.icon);
	const badgeStyle = getBadgeStyle(metric.badgeType);

	const handlePress = () => {
		if (metric.route) {
			router.push(metric.route as never);
		}
	};

	return (
		<TouchableOpacity
			accessibilityRole="button"
			accessibilityLabel={`${metric.title}: ${metric.value}`}
			onPress={handlePress}
			activeOpacity={0.7}
			disabled={!metric.route}
			className="min-w-[140px] flex-1 basis-[140px] md:basis-[220px] max-w-[calc(50%-5px)] md:max-w-[340px] justify-between rounded-xl md:rounded-2xl border border-gray-100 bg-white p-3.5 md:p-5 shadow-xs hover:border-blue-200 hover:shadow-md transition-all"
		>
			<View className="flex-row items-center justify-between">
				<View
					className={`h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl ${config.bgColor}`}
				>
					<config.Icon size={16} color={config.iconColor} strokeWidth={2} />
				</View>

				{metric.badge && (
					<View
						className={`rounded-full border px-2 py-0.5 ${badgeStyle.bg} ${badgeStyle.border}`}
					>
						<Text
							className={`font-inter-medium text-[10px] md:text-xs ${badgeStyle.text}`}
						>
							{metric.badge}
						</Text>
					</View>
				)}
			</View>

			<View className="mt-2.5 md:mt-4">
				<Text className="font-poppins-bold text-xl md:text-3xl text-gray-900 tracking-tight">
					{metric.value}
				</Text>
				<Text
					className="mt-0.5 font-inter-semibold text-xs md:text-sm text-gray-800"
					numberOfLines={1}
				>
					{metric.title}
				</Text>
				<Text
					className="mt-1 font-inter text-[11px] md:text-xs text-gray-500 leading-tight"
					numberOfLines={2}
				>
					{metric.description}
				</Text>
			</View>

			{metric.route && (
				<View className="mt-2.5 md:mt-4 flex-row items-center justify-between border-t border-gray-50 pt-2 md:pt-3">
					<Text className="font-inter-medium text-[11px] md:text-xs text-blue-600">
						Ver detalhes
					</Text>
					<ArrowUpRight size={12} color="#2563eb" />
				</View>
			)}
		</TouchableOpacity>
	);
}
