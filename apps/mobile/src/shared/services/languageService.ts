export type Language = {
	id: string;
	name: string;
};


export async function fetchLanguages(): Promise<Language[]> {
	return [
		{ id: "en-US", name: "Inglês (EUA)" },
		{ id: "it-IT", name: "Italiano (Itália)" },
		{ id: "es-ES", name: "Espanhol (Espanha)" },
		{ id: "ca-ES", name: "Catalão (Espanha)" },
		{ id: "gl-ES", name: "Galego (Espanha)" },
		{ id: "eu-ES", name: "Basco (Espanha)" },
		{ id: "fr-FR", name: "Francês (França)" },
		{ id: "de-DE", name: "Alemão (Alemanha)" },
		{ id: "ja-JP", name: "Japonês (Japão)" },
		{ id: "zh-CN", name: "Chinês (China)" },
		{ id: "en-CA", name: "Inglês (Canadá)" },
		{ id: "fr-CA", name: "Francês (Canadá)" },
		{ id: "es-PE", name: "Espanhol (Peru)" },
		{ id: "qu-PE", name: "Quechua (Peru)" },
		{ id: "ay-PE", name: "Aymara (Peru)" },
	];
}
