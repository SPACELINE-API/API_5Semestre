import { HomePage } from '../modules/home/pages/HomePage';

export default function Index() {
	return (
		<View
			style={{
				height: '100%',
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: '#e2e8f0',
			}}
		>
			<Text style={{ fontSize: 24, fontWeight: 'bold' }}>Home</Text>
		</View>
	);
}
