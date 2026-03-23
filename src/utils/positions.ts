export interface IndexRange {
    start: number;
    end: number;
}

export function createIndexRange(start: number, index: number, fullMatch: string, value: string): IndexRange {
    const rangeStart = start + index + fullMatch.indexOf(value);
    const rangeEnd = rangeStart + value.length;
    return { start: rangeStart, end: rangeEnd };
}


export function replaceCommentsWithWhitespace(text: string): string {
	return text.replace(/\/\*[\s\S]*?\*\//g, (match) => {
		return ' '.repeat(match.length);
	});
}