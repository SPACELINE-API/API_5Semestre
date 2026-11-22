import type { ThemeToken } from './palette';

type Camel<S extends string> = S extends `${infer A}-${infer B}`
	? `${A}${Capitalize<Camel<B>>}`
	: S;

export type ThemeColors = Record<Camel<ThemeToken>, string>;
