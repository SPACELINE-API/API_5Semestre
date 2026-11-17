import { Text, View } from 'react-native';
import {
	AlertCircle,
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
				bgColor: 'bg-warning-soft',
				iconColor: '#d97706',
				borderColor: 'border-warning/40',
			};
		case 'requests':
			return {
				Icon: Inbox,
				bgColor: 'bg-primary-soft',
				iconColor: '#2563eb',
				borderColor: 'border-primary/30',
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
				bgColor: 'bg-success-soft',
				iconColor: '#059669',
				borderColor: 'border-success/30',
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
				bgColor: 'bg-success-soft',
				iconColor: '#16a34a',
				borderColor: 'border-success/30',
			};
		default:
			return {
				Icon: AlertCircle,
				bgColor: 'bg-surface-subtle',
				iconColor: '#4b5563',
				borderColor: 'border-border',
			};
	}
}

function getBadgeStyle(badgeType?: DashboardMetric['badgeType']) {
	switch (badgeType) {
		case 'warning':
			return {
				bg: 'bg-warning-soft',
				text: 'text-warning-text',
				border: 'border-warning/40',
			};
		case 'success':
			return {
				bg: 'bg-success-soft',
				text: 'text-success-text',
				border: 'border-success/30',
			};
		case 'info':
			return {
				bg: 'bg-primary-soft',
				text: 'text-primary-strong',
				border: 'border-primary/30',
			};
		default:
			return {
				bg: 'bg-surface-muted',
				text: 'text-foreground-secondary',
				border: 'border-border',
			};
	}
}

export function DashboardStatCard({ metric }: DashboardStatCardProps) {
	const config = getMetricConfig(metric.icon);
	const badgeStyle = getBadgeStyle(metric.badgeType);

	return (
		<View className="min-w-[140px] flex-1 basis-[140px] md:basis-[220px] max-w-[calc(50%-5px)] md:max-w-[340px] justify-between rounded-xl md:rounded-2xl border border-border-subtle bg-surface p-3.5 md:p-5 shadow-xs">
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
				<Text className="font-poppins-bold text-xl md:text-3xl text-foreground tracking-tight">
					{metric.value}
				</Text>
				<Text
					className="mt-0.5 font-inter-semibold text-xs md:text-sm text-foreground"
					numberOfLines={1}
				>
					{metric.title}
				</Text>
				<Text
					className="mt-1 font-inter text-[11px] md:text-xs text-foreground-muted leading-tight"
					numberOfLines={2}
				>
					{metric.description}
				</Text>
			</View>
		</View>
	);
}
